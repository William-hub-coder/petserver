import { Injectable, Logger } from '@nestjs/common';
import type { AgentChatContextDto, AgentToolCallDto, AgentToolResultDto } from '@petpal/shared';

type Ok<T> = { code?: string; data: T };

/** 中文/口语类目 → merchant 种子 category */
function normalizeMerchantCategory(raw: unknown): string {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return '';
  if (['hospital', '医疗', '医院', '看病', '疫苗'].some((k) => v.includes(k))) return 'hospital';
  if (['grooming', '洗护', '洗澡', '美容', '造型', '剪毛'].some((k) => v.includes(k))) {
    return 'grooming';
  }
  if (['boarding', '寄养', '上门', '托管'].some((k) => v.includes(k))) return 'boarding';
  if (['training', '训练', '训犬'].some((k) => v.includes(k))) return 'training';
  return v;
}

@Injectable()
export class BizClient {
  private readonly logger = new Logger(BizClient.name);
  private readonly userUrl = process.env.USER_SERVICE_URL ?? 'http://localhost:3002';
  private readonly merchantUrl = process.env.MERCHANT_SERVICE_URL ?? 'http://localhost:3003';

  async loadContext(userId?: string, city?: string): Promise<AgentChatContextDto> {
    if (!userId) {
      return { city: city || '上海', pets: [], bookings: [], orders: [] };
    }
    const [me, bookings, orders] = await Promise.all([
      this.safeGet<{
        nickname?: string;
        pets?: AgentChatContextDto['pets'];
      }>(`${this.userUrl}/users/me`, userId),
      this.safeGet<
        Array<{
          id: string;
          merchantName?: string;
          serviceName?: string;
          status: string;
          bookingAt: string;
        }>
      >(`${this.merchantUrl}/bookings`, userId),
      this.safeGet<
        Array<{
          id: string;
          status: string;
          totalCents?: number;
          amountCents?: number;
          createdAt?: string;
        }>
      >(`${this.merchantUrl}/shop-orders`, userId),
    ]);

    return {
      city: city || '上海',
      nickname: me?.nickname,
      pets: (me?.pets ?? []).slice(0, 8),
      bookings: (bookings ?? []).slice(0, 5).map((b) => ({
        id: b.id,
        merchantName: b.merchantName,
        serviceName: b.serviceName,
        status: b.status,
        bookingAt: b.bookingAt,
      })),
      orders: (orders ?? []).slice(0, 5).map((o) => ({
        id: o.id,
        status: o.status,
        totalCents: o.totalCents ?? o.amountCents,
        createdAt: o.createdAt,
      })),
    };
  }

  async runTools(
    calls: AgentToolCallDto[],
    ctx: { userId?: string; city?: string; context?: AgentChatContextDto },
  ): Promise<AgentToolResultDto[]> {
    const out: AgentToolResultDto[] = [];
    for (const call of calls.slice(0, 3)) {
      try {
        if (call.name === 'search_merchants') {
          const args = call.args ?? {};
          const params = new URLSearchParams();
          params.set('city', String(args.city || ctx.city || '上海'));
          const category = normalizeMerchantCategory(args.category);
          if (category) params.set('category', category);
          // 有类目时跳过 keyword，避免中文口语词把列表滤空
          const keyword = category ? '' : String(args.keyword || '').trim();
          if (keyword) params.set('keyword', keyword);
          let list = await this.safeGet<
            Array<{
              id: string;
              name: string;
              category: string;
              creditScore?: number;
              rating?: number;
              address?: string;
              highlight?: string;
              distanceKm?: number;
            }>
          >(`${this.merchantUrl}/merchants?${params}`);
          if (!list?.length && category) {
            const fallback = new URLSearchParams();
            fallback.set('city', String(args.city || ctx.city || '上海'));
            list = await this.safeGet(`${this.merchantUrl}/merchants?${fallback}`);
          }
          out.push({
            name: call.name,
            ok: true,
            data: (list ?? []).slice(0, 5).map((m) => ({
              id: m.id,
              name: m.name,
              category: m.category,
              creditScore: m.creditScore,
              rating: m.rating,
              address: m.address,
              highlight: m.highlight,
              distanceKm: m.distanceKm,
            })),
          });
        } else if (call.name === 'get_user_pets') {
          out.push({
            name: call.name,
            ok: true,
            data: ctx.context?.pets ?? [],
          });
        } else if (call.name === 'get_recent_bookings') {
          out.push({
            name: call.name,
            ok: true,
            data: ctx.context?.bookings ?? [],
          });
        } else if (call.name === 'get_recent_orders') {
          out.push({
            name: call.name,
            ok: true,
            data: ctx.context?.orders ?? [],
          });
        } else {
          out.push({ name: call.name, ok: false, error: 'unsupported tool' });
        }
      } catch (err) {
        out.push({
          name: call.name,
          ok: false,
          error: err instanceof Error ? err.message : 'tool failed',
        });
      }
    }
    return out;
  }

  private async safeGet<T>(url: string, userId?: string): Promise<T | null> {
    try {
      const headers: Record<string, string> = {};
      if (userId) headers['x-user-id'] = userId;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;
      const json = (await res.json()) as Ok<T>;
      return json.data ?? null;
    } catch (err) {
      this.logger.warn(`biz get failed ${url}: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }
}
