import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ShopOrderStatus, prisma } from '@petpal/db';

const ALLOWED_TAGS = [
  '适口性好',
  '性价比高',
  '包装完好',
  '发货快',
  '成分靠谱',
  '毛孩爱吃',
  '效果明显',
  '说明清晰',
];

@Injectable()
export class ProductReviewService {
  allowedTags() {
    return ALLOWED_TAGS;
  }

  async create(
    userId: string | undefined,
    body: { orderItemId?: string; rating?: number; content?: string; tags?: string[] },
  ) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    if (!body.orderItemId || !body.rating || body.rating < 1 || body.rating > 5) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '评价参数无效' });
    }

    const item = await prisma.shopOrderItem.findUnique({
      where: { id: body.orderItemId },
      include: { order: true, review: true, product: true },
    });
    if (!item) throw new NotFoundException({ code: 'NOT_FOUND', message: '订单商品不存在' });
    if (item.order.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '只能评价自己的订单' });
    }
    const reviewable: ShopOrderStatus[] = [
      ShopOrderStatus.paid,
      ShopOrderStatus.shipped,
      ShopOrderStatus.completed,
    ];
    if (!reviewable.includes(item.order.status)) {
      throw new ConflictException({ code: 'CONFLICT', message: '支付完成后才可评价商品' });
    }
    if (item.review) {
      throw new ConflictException({ code: 'CONFLICT', message: '该商品已评价' });
    }

    const tags = (body.tags || []).filter((t) => ALLOWED_TAGS.includes(t)).slice(0, 5);
    if (body.rating <= 2 && !(body.content || '').trim()) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: '低分评价请填写说明，方便后续用户参考',
      });
    }

    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.productReview.create({
        data: {
          productId: item.productId,
          userId,
          orderItemId: item.id,
          rating: body.rating!,
          content: (body.content || '').trim(),
          tags,
        },
      });
      const agg = await tx.productReview.aggregate({
        where: { productId: item.productId },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await tx.product.update({
        where: { id: item.productId },
        data: {
          rating: Math.round((agg._avg.rating || body.rating!) * 10) / 10,
          reviewCount: agg._count.rating,
        },
      });
      return r;
    });

    await prisma.message.create({
      data: {
        userId,
        title: '商品评价已发布',
        body: `你对「${item.productName}」的评价将帮助其他铲屎官选购。`,
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

  async list(productId: string, query: { filter?: string; page?: string; pageSize?: string }) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException({ code: 'NOT_FOUND', message: '商品不存在' });

    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize || 10)));
    const filter = query.filter || 'all';
    const ratingWhere =
      filter === 'good'
        ? { gte: 4 }
        : filter === 'bad'
          ? { lte: 2 }
          : filter === 'mid'
            ? { gte: 3, lte: 3 }
            : undefined;

    const where = {
      productId,
      ...(ratingWhere ? { rating: ratingWhere } : {}),
    };

    const [total, rows, all] = await Promise.all([
      prisma.productReview.count({ where }),
      prisma.productReview.findMany({
        where,
        include: { user: { select: { nickname: true } } },
        orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.productReview.findMany({
        where: { productId },
        select: { rating: true, tags: true },
      }),
    ]);

    return {
      summary: this.buildSummary(all),
      page,
      pageSize,
      total,
      items: rows.map((r) => ({
        id: r.id,
        user: this.mask(r.user.nickname),
        score: r.rating,
        text: r.content || '',
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
        helpfulCount: r.helpfulCount,
        date: r.createdAt.toISOString().slice(0, 10),
      })),
    };
  }

  async markHelpful(id: string) {
    const r = await prisma.productReview.findUnique({ where: { id } });
    if (!r) throw new NotFoundException({ code: 'NOT_FOUND', message: '评价不存在' });
    const updated = await prisma.productReview.update({
      where: { id },
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
    const goodRate = count ? Math.round(((dist[5] + dist[4]) / count) * 1000) / 10 : 0;
    return {
      count,
      avgRating: avg,
      goodRate,
      distribution: dist,
      topTags,
      note: '评价来自真实购后订单，可供选购参考',
    };
  }

  private mask(name: string) {
    if (!name) return '匿名用户';
    return `${name[0]}***`;
  }
}
