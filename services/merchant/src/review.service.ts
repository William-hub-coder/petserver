import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, prisma } from '@petpal/db';

const ALLOWED_TAGS = [
  '环境干净',
  '态度专业',
  '服务细致',
  '性价比高',
  '预约准时',
  '设施齐全',
  '毛孩放松',
  '说明清晰',
];

@Injectable()
export class ReviewService {
  allowedTags() {
    return ALLOWED_TAGS;
  }

  async create(
    userId: string,
    body: { bookingId?: string; rating?: number; content?: string; tags?: string[] },
  ): Promise<{ id: string; rating: number; content: string | null; tags: string[] }> {
    if (!body.bookingId || !body.rating || body.rating < 1 || body.rating > 5) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '评价参数无效' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId },
      include: { service: true, merchant: true },
    });
    if (!booking) throw new NotFoundException({ code: 'NOT_FOUND', message: '预约不存在' });
    if (booking.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '只能评价自己的订单' });
    }
    if (booking.status !== BookingStatus.verified) {
      throw new ConflictException({ code: 'CONFLICT', message: '仅核销后的订单可评价' });
    }

    const existing = await prisma.review.findUnique({ where: { bookingId: booking.id } });
    if (existing) throw new ConflictException({ code: 'CONFLICT', message: '该订单已评价' });

    const tags = (body.tags || []).filter((t) => ALLOWED_TAGS.includes(t)).slice(0, 5);
    if (body.rating <= 2 && !(body.content || '').trim()) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: '低分评价请填写说明，方便后续用户参考',
      });
    }

    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: {
          bookingId: booking.id,
          userId,
          merchantId: booking.merchantId,
          serviceId: booking.serviceId,
          serviceName: booking.service.name,
          rating: body.rating!,
          content: (body.content || '').trim(),
          tags,
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.reviewed },
      });

      const agg = await tx.review.aggregate({
        where: { merchantId: booking.merchantId },
        _avg: { rating: true },
        _count: { rating: true },
      });
      const merchant = await tx.merchant.findUnique({ where: { id: booking.merchantId } });
      const before = merchant?.creditScore ?? 70;
      const delta = body.rating! >= 4 ? 1 : body.rating! <= 2 ? -1 : 0;
      const after = Math.max(0, Math.min(100, before + delta));
      await tx.merchant.update({
        where: { id: booking.merchantId },
        data: {
          rating: Math.round((agg._avg.rating || body.rating!) * 10) / 10,
          reviewCount: agg._count.rating,
          creditScore: after,
        },
      });
      if (delta !== 0) {
        await tx.creditScoreLog.create({
          data: {
            merchantId: booking.merchantId,
            scoreBefore: before,
            scoreAfter: after,
            reason: `review:${r.id}:${body.rating}`,
          },
        });
      }
      return r;
    });

    await prisma.message.create({
      data: {
        userId,
        title: '评价已发布',
        body: `感谢评价「${booking.merchant.name}」，你的反馈将帮助其他铲屎官选店。`,
        type: 'order',
      },
    });

    return {
      id: review.id,
      rating: review.rating,
      content: review.content,
      tags: (review.tags as string[]) || [],
    };
  }

  async listByMerchant(
    merchantId: string,
    query: { filter?: string; page?: string; pageSize?: string },
  ) {
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException({ code: 'NOT_FOUND', message: '商户不存在' });

    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize || 10)));
    const filter = query.filter || 'all'; // all | good | mid | bad

    const ratingWhere =
      filter === 'good'
        ? { gte: 4 }
        : filter === 'bad'
          ? { lte: 2 }
          : filter === 'mid'
            ? { gte: 3, lte: 3 }
            : undefined;

    const where = {
      merchantId,
      ...(ratingWhere ? { rating: ratingWhere } : {}),
    };

    const [total, rows, allRows] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: { user: { select: { nickname: true } } },
        orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.review.findMany({
        where: { merchantId },
        select: { rating: true, tags: true },
      }),
    ]);

    const summary = this.buildSummary(allRows);

    return {
      summary,
      page,
      pageSize,
      total,
      items: rows.map((r) => this.toItem(r)),
    };
  }

  async markHelpful(reviewId: string) {
    const r = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!r) throw new NotFoundException({ code: 'NOT_FOUND', message: '评价不存在' });
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    });
    return { id: updated.id, helpfulCount: updated.helpfulCount };
  }

  private buildSummary(rows: { rating: number; tags: unknown }[]) {
    const count = rows.length;
    const avg = count
      ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const tagCount = new Map<string, number>();
    for (const r of rows) {
      dist[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
      const tags = Array.isArray(r.tags) ? (r.tags as string[]) : [];
      for (const t of tags) tagCount.set(t, (tagCount.get(t) || 0) + 1);
    }
    const topTags = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
    const goodRate = count
      ? Math.round(((dist[5] + dist[4]) / count) * 1000) / 10
      : 0;
    return {
      count,
      avgRating: avg,
      goodRate,
      distribution: dist,
      topTags,
      note: '评价来自到店核销后的真实订单，可供选店参考',
    };
  }

  private toItem(r: {
    id: string;
    rating: number;
    content: string | null;
    tags: unknown;
    serviceName: string | null;
    helpfulCount: number;
    createdAt: Date;
    user: { nickname: string };
  }) {
    return {
      id: r.id,
      user: this.maskName(r.user.nickname),
      score: r.rating,
      text: r.content || '',
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      serviceName: r.serviceName || '',
      helpfulCount: r.helpfulCount,
      date: r.createdAt.toISOString().slice(0, 10),
    };
  }

  private maskName(name: string) {
    if (!name) return '匿名用户';
    if (name.length <= 1) return `${name}***`;
    return `${name[0]}***`;
  }
}
