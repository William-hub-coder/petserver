import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PetListingChannel, PetListingStatus, prisma } from '@petpal/db';

function channelLabel(channel: PetListingChannel) {
  return channel === PetListingChannel.sale ? '宠物售卖' : '领养';
}

function priceLabel(channel: PetListingChannel, priceCents: number) {
  if (channel === PetListingChannel.sale) return '在售';
  if (priceCents <= 0) return '免费领养';
  return '有偿领养';
}

@Injectable()
export class PetListingService {
  async list(query: {
    channel?: string;
    city?: string;
    species?: string;
    lat?: number;
    lng?: number;
  }) {
    const where: {
      status: PetListingStatus;
      channel?: PetListingChannel;
      species?: string;
      OR?: Array<{ city: { contains: string } }>;
    } = { status: PetListingStatus.published };
    if (query.channel === 'adopt' || query.channel === 'sale') {
      where.channel = query.channel;
    }
    // 城市宽松匹配：上海 / 上海市 互通；无匹配时不硬卡死空列表（演示数据在上海）
    const cityKey = normalizeCity(query.city);
    if (cityKey) {
      where.OR = [{ city: { contains: cityKey } }, { city: { contains: `${cityKey}市` } }];
    }
    if (query.species && query.species !== '全部') where.species = query.species;

    let rows = await prisma.petListing.findMany({
      where,
      include: { merchant: { select: { id: true, name: true, selectedBadge: true, creditScore: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    // 当前城市无数据时回退全国已发布（避免定位城市不一致导致空白）
    if (!rows.length && cityKey) {
      const { OR: _or, ...rest } = where;
      rows = await prisma.petListing.findMany({
        where: rest,
        include: { merchant: { select: { id: true, name: true, selectedBadge: true, creditScore: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 100,
      });
    }

    return rows.map((r) => this.toCard(r, query.lat, query.lng));
  }

  async mapPoints(query: { channel?: string; city?: string }) {
    const list = await this.list(query);
    return list
      .filter((x) => x.lat != null && x.lng != null)
      .map((x) => ({
        id: x.id,
        title: x.title,
        channel: x.channel,
        species: x.species,
        lat: x.lat!,
        lng: x.lng!,
        coverUrl: x.coverUrl,
        district: x.district,
      }));
  }

  async detail(id: string) {
    const row = await prisma.petListing.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true, selectedBadge: true, creditScore: true, address: true } },
      },
    });
    if (!row || row.status !== PetListingStatus.published) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '信息不可用或未过审' });
    }
    return {
      ...this.toCard(row),
      description: row.description || '',
      address: row.address,
      images: Array.isArray(row.images) ? (row.images as string[]) : row.coverUrl ? [row.coverUrl] : [],
      licenseNo: row.licenseNo,
      quarantineNote: row.quarantineNote,
      complianceNote:
        row.channel === 'adopt'
          ? '领养可为无偿或有偿（如疫苗/绝育保证金）。联系仅走站内会话；请勿站外转账。幼宠需承诺适龄绝育。'
          : '宠物售卖仅限入驻宠物店/持证繁育场。平台不做活体一键下单；请线下核验证照与检疫证明原件。禁止无证交易与诱导站外私聊。',
    };
  }

  async create(
    userId: string | undefined,
    body: {
      channel?: 'adopt' | 'sale';
      title?: string;
      species?: string;
      breed?: string;
      gender?: string;
      ageMonths?: number;
      city?: string;
      district?: string;
      address?: string;
      lat?: number;
      lng?: number;
      coverUrl?: string;
      images?: string[];
      vaccinated?: boolean;
      sterilized?: boolean;
      licenseNo?: string;
      quarantineNote?: string;
      priceCents?: number;
      description?: string;
      merchantId?: string;
    },
  ) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'merchant') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '仅入驻商家 / 合作机构可提审' });
    }
    const channel = body.channel === 'sale' ? PetListingChannel.sale : PetListingChannel.adopt;
    if (!body.title?.trim() || !body.species?.trim()) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '请填写标题与物种' });
    }
    const merchantId = body.merchantId || (await this.defaultMerchantId(userId));
    if (!merchantId) throw new BadRequestException({ code: 'BAD_REQUEST', message: '未绑定严选门店' });
    const owned = await prisma.merchant.findFirst({ where: { id: merchantId, ownerUserId: userId } });
    if (!owned) throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权代该门店发布' });

    if (channel === PetListingChannel.sale) {
      if (!body.licenseNo?.trim() || !body.quarantineNote?.trim()) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: '售卖须填写经营/繁育许可证号与检疫证明摘要',
        });
      }
      if (!(Number(body.priceCents) > 0)) {
        throw new BadRequestException({ code: 'BAD_REQUEST', message: '售卖请填写标价' });
      }
    }

    const priceCents =
      channel === PetListingChannel.adopt
        ? Math.max(0, Number(body.priceCents || 0))
        : Math.max(0, Number(body.priceCents || 0));

    const created = await prisma.petListing.create({
      data: {
        channel,
        status: PetListingStatus.pending_review,
        title: body.title.trim(),
        species: body.species.trim(),
        breed: body.breed?.trim() || null,
        gender: body.gender?.trim() || null,
        ageMonths: body.ageMonths ?? null,
        city: body.city?.trim() || '上海',
        district: body.district?.trim() || null,
        address: body.address?.trim() || null,
        lat: body.lat ?? owned.lat,
        lng: body.lng ?? owned.lng,
        coverUrl: body.coverUrl || null,
        images: body.images || [],
        vaccinated: !!body.vaccinated,
        sterilized: !!body.sterilized,
        licenseNo:
          channel === PetListingChannel.sale
            ? body.licenseNo!.trim()
            : body.licenseNo?.trim() || null,
        quarantineNote:
          channel === PetListingChannel.sale
            ? body.quarantineNote!.trim()
            : body.quarantineNote?.trim() || null,
        priceCents,
        description: body.description?.trim() || null,
        merchantId,
        publisherUserId: userId,
      },
    });
    return { ok: true, id: created.id, status: created.status };
  }

  async apply(
    userId: string | undefined,
    listingId: string,
    body: { motive?: string; experience?: string; acceptHomeVisit?: boolean },
  ) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    const listing = await prisma.petListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== PetListingStatus.published || listing.channel !== 'adopt') {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '仅可对已发布的领养信息申请' });
    }
    const motive = (body.motive || '').trim();
    if (motive.length < 8) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '请简要说明领养动机（至少 8 字）' });
    }
    const app = await prisma.petAdoptApplication.create({
      data: {
        listingId,
        userId,
        motive,
        experience: body.experience?.trim() || null,
        acceptHomeVisit: body.acceptHomeVisit !== false,
      },
    });
    await prisma.message.create({
      data: {
        userId: listing.publisherUserId,
        title: '收到新的领养申请',
        body: `「${listing.title}」有新申请，请在会话中与用户沟通。`,
        type: 'system',
      },
    });
    const conv = await this.openContactConversation(userId, listingId);
    return { ok: true, applicationId: app.id, conversationId: conv.id };
  }

  async contact(userId: string | undefined, listingId: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    const conv = await this.openContactConversation(userId, listingId);
    return { ok: true, conversationId: conv.id, merchantId: conv.merchantId };
  }

  private async openContactConversation(userId: string, listingId: string) {
    const listing = await prisma.petListing.findUnique({
      where: { id: listingId },
      include: { merchant: true },
    });
    if (!listing || listing.status !== PetListingStatus.published) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '信息不可用' });
    }
    if (listing.publisherUserId === userId) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '不能联系自己的发布' });
    }

    const existing = await prisma.conversation.findFirst({
      where: { userId, listingId, kind: 'adoption' },
    });
    if (existing) return existing;

    const label = channelLabel(listing.channel);
    const conv = await prisma.conversation.create({
      data: {
        kind: 'adoption',
        userId,
        merchantId: listing.merchantId,
        listingId,
        lastMsgAt: new Date(),
        lastPreview: `${label}沟通已开启`,
        merchantUnread: 1,
      },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderUserId: userId,
        senderRole: 'system',
        type: 'system',
        body: `您正在就「${listing.title}」与「${listing.merchant.name}」沟通（${label}）。请勿站外转账；售卖须线下核验证照。`,
      },
    });
    await prisma.message.create({
      data: {
        userId: listing.publisherUserId,
        title: '有人咨询领养/售宠信息',
        body: `用户咨询「${listing.title}」，请及时回复。`,
        type: 'chat',
        conversationId: conv.id,
      },
    });
    return conv;
  }

  async moderationQueue() {
    const rows = await prisma.petListing.findMany({
      where: { status: PetListingStatus.pending_review },
      include: {
        merchant: { select: { name: true } },
        publisher: { select: { nickname: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      channel: r.channel,
      channelLabel: channelLabel(r.channel),
      title: r.title,
      species: r.species,
      breed: r.breed,
      priceCents: r.priceCents,
      price: Math.round(r.priceCents / 100),
      free: r.channel === 'adopt' && r.priceCents === 0,
      licenseNo: r.licenseNo,
      quarantineNote: r.quarantineNote,
      coverUrl: r.coverUrl,
      merchantName: r.merchant.name,
      publisherName: r.publisher.nickname || r.publisher.phone,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async resolve(id: string, body: { action?: 'approve' | 'reject'; note?: string }) {
    const row = await prisma.petListing.findUnique({ where: { id } });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: '信息不存在' });
    if (row.status !== PetListingStatus.pending_review) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '当前状态不可审核' });
    }
    const action = body.action || 'approve';
    if (action === 'approve') {
      await prisma.petListing.update({
        where: { id },
        data: {
          status: PetListingStatus.published,
          publishedAt: new Date(),
          reviewNote: body.note || '审核通过',
        },
      });
      await prisma.message.create({
        data: {
          userId: row.publisherUserId,
          title: '领养/售宠信息已过审',
          body: `「${row.title}」已发布，用户可浏览并联系您。`,
          type: 'system',
        },
      });
      return { ok: true, id, status: 'published' };
    }
    await prisma.petListing.update({
      where: { id },
      data: {
        status: PetListingStatus.rejected,
        reviewNote: body.note || '未通过审核',
      },
    });
    await prisma.message.create({
      data: {
        userId: row.publisherUserId,
        title: '领养/售宠信息未通过',
        body: `「${row.title}」未通过：${body.note || '请完善证照与健康材料后重新提审'}`,
        type: 'system',
      },
    });
    return { ok: true, id, status: 'rejected' };
  }

  private async defaultMerchantId(userId: string) {
    const m = await prisma.merchant.findFirst({
      where: { ownerUserId: userId },
      select: { id: true },
    });
    return m?.id || null;
  }

  private toCard(
    r: {
      id: string;
      channel: PetListingChannel;
      title: string;
      species: string;
      breed: string | null;
      gender: string | null;
      ageMonths: number | null;
      city: string;
      district: string | null;
      lat: number | null;
      lng: number | null;
      coverUrl: string | null;
      vaccinated: boolean;
      sterilized: boolean;
      priceCents: number;
      merchantId: string;
      publishedAt: Date | null;
      merchant: { id: string; name: string; selectedBadge: boolean; creditScore: number };
    },
    lat?: number,
    lng?: number,
  ) {
    let distanceKm: number | null = null;
    if (lat != null && lng != null && r.lat != null && r.lng != null) {
      distanceKm = Math.round(haversineKm(lat, lng, r.lat, r.lng) * 10) / 10;
    }
    const free = r.channel === PetListingChannel.adopt && r.priceCents === 0;
    return {
      id: r.id,
      channel: r.channel,
      channelLabel: channelLabel(r.channel),
      priceLabel: priceLabel(r.channel, r.priceCents),
      title: r.title,
      species: r.species,
      breed: r.breed,
      gender: r.gender,
      ageMonths: r.ageMonths,
      ageLabel: r.ageMonths != null ? `${r.ageMonths} 月龄` : '年龄待询',
      city: r.city,
      district: r.district,
      lat: r.lat,
      lng: r.lng,
      coverUrl: r.coverUrl,
      vaccinated: r.vaccinated,
      sterilized: r.sterilized,
      priceCents: r.priceCents,
      price: Math.round(r.priceCents / 100),
      free,
      merchantId: r.merchantId,
      merchantName: r.merchant.name,
      selectedBadge: r.merchant.selectedBadge,
      creditScore: r.merchant.creditScore,
      distanceKm,
      publishedAt: r.publishedAt?.toISOString() || null,
    };
  }
}

function normalizeCity(city?: string) {
  const c = (city || '').trim().replace(/市$/, '');
  return c || '';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
