import { Injectable, NotFoundException } from '@nestjs/common';
import { MerchantStatus, prisma } from '@petpal/db';
import { AmapClient } from './amap.client';
import { distanceKm, formatInspectedAt } from './geo';
import { moduleToCategory, resolveNearbyKeywords } from './nearby-keywords';

export type NearbyMerchantItem = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  creditScore: number;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  lat: number | null;
  lng: number | null;
  selectedBadge: boolean;
  /** certified=站内严选；amap=高德实景未认证 */
  source: 'certified' | 'amap';
  bookable: boolean;
  address: string;
  openUntil: string;
  priceLevel: string;
  highlight: string;
  coverTone: string;
  inspectedAt: string;
  amapPoiId?: string;
  tel?: string;
};

@Injectable()
export class MerchantService {
  constructor(private readonly amap: AmapClient) {}

  async list(query: {
    city?: string;
    category?: string;
    keyword?: string;
    lat?: string;
    lng?: string;
  }) {
    const lat = query.lat ? Number(query.lat) : undefined;
    const lng = query.lng ? Number(query.lng) : undefined;

    const merchants = await prisma.merchant.findMany({
      where: {
        status: MerchantStatus.online,
        city: query.city || undefined,
        category: query.category || undefined,
        OR: query.keyword
          ? [
              { name: { contains: query.keyword } },
              { address: { contains: query.keyword } },
              { highlight: { contains: query.keyword } },
            ]
          : undefined,
      },
      orderBy: { creditScore: 'desc' },
    });

    const mapped = merchants.map((m) => {
      const dist =
        lat != null && lng != null && m.lat != null && m.lng != null
          ? Math.round(distanceKm(lat, lng, m.lat, m.lng) * 10) / 10
          : undefined;
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        tags: Array.isArray(m.tags) ? (m.tags as string[]) : [],
        creditScore: m.creditScore ?? 0,
        rating: m.rating ?? 0,
        reviewCount: m.reviewCount ?? 0,
        distanceKm: dist ?? 0,
        lat: m.lat,
        lng: m.lng,
        selectedBadge: !!m.selectedBadge,
        source: 'certified' as const,
        bookable: true,
        address: m.address || '',
        openUntil: m.closeTime || '',
        priceLevel: m.priceLevel || '¥¥',
        highlight: m.highlight || '严选门店',
        coverTone:
          m.coverTone || 'linear-gradient(145deg,#0f8f82 0%,#1a9e8e 45%,#3d8fd4 100%)',
        inspectedAt: formatInspectedAt(m.lastInspectedAt) || '待更新',
      };
    });

    if (lat != null && lng != null) {
      mapped.sort((a, b) => {
        const scoreA = (a.creditScore || 0) * 0.5 + (1 / (1 + (a.distanceKm || 0))) * 20;
        const scoreB = (b.creditScore || 0) * 0.5 + (1 / (1 + (b.distanceKm || 0))) * 20;
        return scoreB - scoreA;
      });
    }

    return mapped;
  }

  /**
   * 附近实景找店：高德周边 POI + 站内严选库合并。
   * - 关键词按模块填写（可被用户自定义 keyword 覆盖）
   * - 严选认证优先，其余为地图实景未认证
   * - 默认最多 10 条
   */
  async listNearby(query: {
    lat?: string;
    lng?: string;
    city?: string;
    module?: string;
    keyword?: string;
    limit?: string;
    radiusM?: string;
  }): Promise<{
    items: NearbyMerchantItem[];
    keywords: string;
    amapConfigured: boolean;
    certifiedCount: number;
    limit: number;
  }> {
    const lat = Number(query.lat);
    const lng = Number(query.lng);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 10);
    const radiusM = Number(query.radiusM) || 5000;
    const keywords = resolveNearbyKeywords(query.module, query.keyword);
    const category = moduleToCategory(query.module);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        items: [],
        keywords,
        amapConfigured: this.amap.configured,
        certifiedCount: 0,
        limit,
      };
    }

    const [dbRows, pois] = await Promise.all([
      prisma.merchant.findMany({
        where: {
          status: MerchantStatus.online,
          ...(category ? { category } : {}),
          ...(query.city ? { city: query.city } : {}),
        },
        orderBy: [{ selectedBadge: 'desc' }, { creditScore: 'desc' }],
      }),
      this.amap.searchAround({
        lat,
        lng,
        keywords,
        radiusM,
        limit: 20,
      }),
    ]);

    const certifiedNear: NearbyMerchantItem[] = [];
    for (const m of dbRows) {
      if (m.lat == null || m.lng == null) continue;
      const dist = Math.round(distanceKm(lat, lng, m.lat, m.lng) * 10) / 10;
      if (dist > radiusM / 1000 + 0.5) continue;
      const tags = Array.isArray(m.tags) ? (m.tags as string[]) : [];
      certifiedNear.push({
        id: m.id,
        name: m.name,
        category: m.category,
        tags,
        creditScore: m.creditScore ?? 0,
        rating: m.rating ?? 0,
        reviewCount: m.reviewCount ?? 0,
        distanceKm: dist,
        lat: m.lat,
        lng: m.lng,
        selectedBadge: !!m.selectedBadge,
        source: 'certified',
        bookable: true,
        address: m.address || '',
        openUntil: m.closeTime || '',
        priceLevel: m.priceLevel || '¥¥',
        highlight: m.highlight || (m.selectedBadge ? '实地考察认证' : '站内门店'),
        coverTone:
          m.coverTone || 'linear-gradient(145deg,#0f8f82 0%,#1a9e8e 45%,#3d8fd4 100%)',
        inspectedAt: formatInspectedAt(m.lastInspectedAt) || '待更新',
      });
    }

    // 用户自定义关键词时，对严选库做名称过滤
    const customKw = (query.keyword || '').trim();
    let certifiedFiltered = certifiedNear;
    if (customKw) {
      certifiedFiltered = certifiedNear.filter(
        (m) =>
          m.name.includes(customKw) ||
          m.address.includes(customKw) ||
          m.tags.some((t) => t.includes(customKw)),
      );
    }

    const matchedPoiIds = new Set<string>();

    // 将与严选店重合的 POI 标记为已匹配（同名或很近）
    for (const poi of pois) {
      const hit = certifiedFiltered.find((m) => {
        if (m.lat == null || m.lng == null) return false;
        const dM = distanceKm(m.lat, m.lng, poi.lat, poi.lng) * 1000;
        return dM < 120 || namesLikelySame(m.name, poi.name);
      });
      if (hit) matchedPoiIds.add(poi.id);
    }

    const amapOnly: NearbyMerchantItem[] = pois
      .filter((p) => !matchedPoiIds.has(p.id))
      .map((p) => {
        const dist = Math.round(distanceKm(lat, lng, p.lat, p.lng) * 10) / 10;
        return {
          id: `amap:${p.id}`,
          name: p.name,
          category: category || guessCategoryFromKeywords(keywords, p.type),
          tags: ['地图实景', ...(p.type ? [p.type.split(';')[0]!] : [])].filter(Boolean),
          creditScore: 0,
          rating: 0,
          reviewCount: 0,
          distanceKm: dist,
          lat: p.lat,
          lng: p.lng,
          selectedBadge: false,
          source: 'amap' as const,
          bookable: false,
          address: [p.district, p.address].filter(Boolean).join(' ') || p.address,
          openUntil: '',
          priceLevel: '—',
          highlight: '高德地图实景 · 尚未通过宠伴实地认证',
          coverTone: 'linear-gradient(145deg,#8aa4a0 0%,#6b8580 55%,#5a706c 100%)',
          inspectedAt: '未认证',
          amapPoiId: p.id,
          tel: p.tel || '',
        } satisfies NearbyMerchantItem;
      });

    // 排序：认证优先 → 有严选徽章优先 → 距离 → 信用分
    const merged = [...certifiedFiltered, ...amapOnly].sort((a, b) => {
      if (a.selectedBadge !== b.selectedBadge) return a.selectedBadge ? -1 : 1;
      if (a.source !== b.source) return a.source === 'certified' ? -1 : 1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return (b.creditScore || 0) - (a.creditScore || 0);
    });

    const items = merged.slice(0, limit);
    return {
      items,
      keywords,
      amapConfigured: this.amap.configured,
      certifiedCount: items.filter((i) => i.selectedBadge || i.source === 'certified').length,
      limit,
    };
  }

  async detail(id: string) {
    const m = await prisma.merchant.findUnique({
      where: { id },
      include: {
        services: { where: { enabled: true } },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { nickname: true } } },
        },
      },
    });
    if (!m || m.status !== MerchantStatus.online) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '商户不存在或未上线' });
    }
    return {
      id: m.id,
      name: m.name,
      category: m.category,
      tags: (m.tags as string[]) || [],
      creditScore: m.creditScore,
      creditGrade: m.creditGrade,
      rating: m.rating,
      reviewCount: m.reviewCount,
      distanceKm: 0,
      lat: m.lat,
      lng: m.lng,
      selectedBadge: m.selectedBadge,
      address: m.address,
      city: m.city,
      district: m.district,
      openUntil: m.closeTime,
      priceLevel: m.priceLevel,
      highlight: m.highlight,
      coverTone: m.coverTone,
      inspectedAt: formatInspectedAt(m.lastInspectedAt),
      services: m.services.map((s) => ({
        id: s.id,
        name: s.name,
        price: Math.round(s.priceCents / 100),
        priceCents: s.priceCents,
        duration: `${s.durationMin}分钟`,
        durationMin: s.durationMin,
        kind: s.kind || 'onsite',
        description: s.description || '',
      })),
      reviews: m.reviews.map((r) => ({
        id: r.id,
        user: r.user.nickname?.length
          ? `${r.user.nickname[0]}***`
          : '匿名用户',
        score: r.rating,
        text: r.content || '',
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
        serviceName: r.serviceName || '',
        helpfulCount: r.helpfulCount,
        date: r.createdAt.toISOString().slice(0, 10),
      })),
      reviewSummary: {
        count: m.reviewCount,
        avgRating: m.rating,
        note: '以下为到店核销后的真实用户评价，可供选店参考',
      },
      inspectSummary: m.selectedBadge
        ? { badge: true, note: m.highlight || '已通过实地考察' }
        : null,
    };
  }

  async timeslots(merchantId: string, date?: string) {
    const m = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!m) throw new NotFoundException({ code: 'NOT_FOUND', message: '商户不存在' });
    const day = date || new Date().toISOString().slice(0, 10);
    const slots = [
      ...['09:00', '10:00', '11:00'].map((t) => ({ period: '上午', time: t })),
      ...['14:00', '15:00', '16:00'].map((t) => ({ period: '下午', time: t })),
      ...['18:00', '19:00'].map((t) => ({ period: '晚上', time: t })),
    ].map((s) => ({
      ...s,
      datetime: `${day}T${s.time}:00+08:00`,
      available: true,
    }));
    return { date: day, slots };
  }

  async applyStatus(userId?: string) {
    if (!userId) {
      return {
        status: 'draft',
        stages: ['apply', 'ai_screen', 'inspect', 'review', 'online'],
        current: 'apply',
        selectedBadge: false,
        creditScore: 0,
        name: null as string | null,
      };
    }
    const owned = await prisma.merchant.findFirst({ where: { ownerUserId: userId } });
    if (!owned) {
      return {
        status: 'draft',
        stages: ['apply', 'ai_screen', 'inspect', 'review', 'online'],
        current: 'apply',
        selectedBadge: false,
        creditScore: 0,
        name: null as string | null,
      };
    }
    return {
      status: owned.status,
      merchantId: owned.id,
      name: owned.name,
      selectedBadge: !!owned.selectedBadge,
      creditScore: owned.creditScore ?? 0,
      creditGrade: owned.creditGrade,
      lastInspectedAt: formatInspectedAt(owned.lastInspectedAt),
      highlight: owned.highlight || '',
      stages: ['apply', 'ai_screen', 'inspect', 'review', 'online'],
      current:
        owned.status === 'online'
          ? 'online'
          : owned.status === 'pending_inspect'
            ? 'inspect'
            : owned.status === 'rejected'
              ? 'review'
              : 'inspect',
    };
  }

  /** 运营后台：全部商户（含未上线），供认证管理 */
  async listManage() {
    const rows = await prisma.merchant.findMany({
      orderBy: [{ selectedBadge: 'desc' }, { creditScore: 'desc' }, { updatedAt: 'desc' }],
    });
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      status: m.status,
      creditScore: m.creditScore ?? 0,
      creditGrade: m.creditGrade,
      selectedBadge: !!m.selectedBadge,
      city: m.city,
      district: m.district,
      address: m.address || '',
      lat: m.lat,
      lng: m.lng,
      highlight: m.highlight || '',
      lastInspectedAt: formatInspectedAt(m.lastInspectedAt) || null,
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  /**
   * 运营认证写回：直接影响 App 附近找店的严选角标与可预约状态。
   * 仅应由网关 admin 角色调用。
   */
  async updateCertification(
    id: string,
    body: {
      selectedBadge?: boolean;
      status?: string;
      highlight?: string;
      creditScore?: number;
      note?: string;
    },
  ) {
    const existing = await prisma.merchant.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '商户不存在' });
    }

    const allowedStatus = new Set([
      'draft',
      'pending_inspect',
      'online',
      'rejected',
      'offline',
    ]);
    const nextStatus =
      body.status && allowedStatus.has(body.status)
        ? (body.status as typeof existing.status)
        : undefined;

    const selectedBadge =
      body.selectedBadge !== undefined ? !!body.selectedBadge : existing.selectedBadge;

    // 授予严选时默认上线；撤销严选时可保持原状态，由运营显式改 status
    let status = nextStatus ?? existing.status;
    if (body.selectedBadge === true && !nextStatus) {
      status = MerchantStatus.online;
    }

    const updated = await prisma.merchant.update({
      where: { id },
      data: {
        selectedBadge,
        status,
        highlight:
          body.highlight?.trim() ||
          (selectedBadge ? existing.highlight || '已通过实地考察认证' : existing.highlight),
        creditScore:
          body.creditScore != null && Number.isFinite(body.creditScore)
            ? Math.max(0, Math.min(100, Math.round(body.creditScore)))
            : undefined,
        lastInspectedAt: selectedBadge ? new Date() : existing.lastInspectedAt,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      status: updated.status,
      selectedBadge: !!updated.selectedBadge,
      creditScore: updated.creditScore,
      creditGrade: updated.creditGrade,
      highlight: updated.highlight,
      lastInspectedAt: formatInspectedAt(updated.lastInspectedAt),
      note: body.note || null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, '')
    .replace(/店铺|分店|旗舰店|宠物|医院|店/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function namesLikelySame(a: string, b: string) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 2 && nb.includes(na)) return true;
  if (nb.length >= 2 && na.includes(nb)) return true;
  return false;
}

function guessCategoryFromKeywords(keywords: string, type: string) {
  const t = `${keywords} ${type}`;
  if (/医院|医疗|诊/.test(t)) return 'hospital';
  if (/寄养|酒店/.test(t)) return 'boarding';
  if (/训练|训犬/.test(t)) return 'training';
  if (/美容|洗护|洗澡/.test(t)) return 'grooming';
  return 'grooming';
}
