import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@petpal/db';
import { AmapClient } from './amap.client';
import { LocationTrackService, lerp, mockEnabled } from './location-track.service';

@Injectable()
export class HomeVisitLiveService {
  constructor(
    private readonly amap: AmapClient,
    private readonly tracks: LocationTrackService,
  ) {}

  /** 确保上门单有目的地坐标；首次 live 时初始化 mock 服务者轨迹 */
  async live(userId: string, bookingId: string) {
    const b = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { merchant: true, service: true },
    });
    if (!b) throw new NotFoundException({ code: 'NOT_FOUND', message: '预约不存在' });
    if (b.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权查看' });
    }
    if (b.channel !== 'home_visit') {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '仅上门服务支持实时位置' });
    }

    let destLat = b.destLat;
    let destLng = b.destLng;
    if (destLat == null || destLng == null) {
      const g = await this.amap.geocode(b.addressSnapshot || b.merchant.address || '上海市静安区');
      destLat = g.lat;
      destLng = g.lng;
      await prisma.booking.update({
        where: { id: b.id },
        data: {
          destLat,
          destLng,
          servicePhase: b.servicePhase || 'en_route',
        },
      });
    }

    // 爱宠锚点：服务地址（MVP）
    const petAnchor = await this.tracks.latest('home_visit', bookingId, 'pet_anchor');
    if (!petAnchor && destLat != null && destLng != null) {
      await this.tracks.append({
        subjectType: 'home_visit',
        subjectId: bookingId,
        role: 'pet_anchor',
        lat: destLat,
        lng: destLng,
        source: 'mock',
      });
    }

    await this.advanceMockProvider(bookingId, destLat!, destLng!, b.merchant.lat, b.merchant.lng);

    const provider = await this.tracks.latest('home_visit', bookingId, 'provider');
    const phase =
      (await prisma.booking.findUnique({ where: { id: bookingId } }))?.servicePhase || 'en_route';

    let etaSec: number | null = null;
    if (provider && phase === 'en_route') {
      const d = await this.amap.direction(
        { lat: provider.lat, lng: provider.lng },
        { lat: destLat!, lng: destLng! },
      );
      etaSec = d.durationSec;
    }

    return {
      bookingId: b.id,
      channel: b.channel,
      serviceName: b.service.name,
      merchantName: b.merchant.name,
      address: b.addressSnapshot,
      servicePhase: phase,
      phaseLabel: phaseLabel(phase),
      petAnchor: {
        lat: destLat,
        lng: destLng,
        label: '爱宠上门点',
        note: 'MVP 以预约地址为爱宠所在位置；项圈定位为后续能力',
      },
      provider,
      etaSec,
      etaText: etaSec != null ? `服务者约 ${Math.max(1, Math.round(etaSec / 60))} 分钟到达` : null,
      tracks: await this.tracks.list('home_visit', bookingId),
    };
  }

  async reportTrack(
    userId: string,
    bookingId: string,
    body: { lat?: number; lng?: number; role?: string },
  ) {
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new NotFoundException({ code: 'NOT_FOUND', message: '预约不存在' });
    // MVP：订单用户或被指派服务者可上报；也允许商家角色联调
    const allowed =
      b.userId === userId || b.providerUserId === userId || mockEnabled();
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权上报' });
    if (body.lat == null || body.lng == null) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少 lat/lng' });
    }
    const role = body.role === 'pet_anchor' ? 'pet_anchor' : 'provider';
    const row = await this.tracks.append({
      subjectType: 'home_visit',
      subjectId: bookingId,
      role,
      lat: body.lat,
      lng: body.lng,
      source: 'device',
    });
    if (role === 'provider' && !b.servicePhase) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { servicePhase: 'en_route', providerUserId: userId },
      });
    }
    return { id: row.id, recordedAt: row.recordedAt.toISOString() };
  }

  private async advanceMockProvider(
    bookingId: string,
    destLat: number,
    destLng: number,
    originLat: number | null,
    originLng: number | null,
  ) {
    if (!mockEnabled()) return;
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b || b.status === 'verified' || b.status === 'reviewed' || b.status === 'cancelled') {
      return;
    }
    const phase = b.servicePhase || 'en_route';
    if (phase === 'on_site' || phase === 'done') return;

    const startLat = originLat ?? destLat + 0.02;
    const startLng = originLng ?? destLng - 0.02;
    const latest = await this.tracks.latest('home_visit', bookingId, 'provider');

    let t = 0.1;
    if (latest) {
      // 用与终点距离反推粗进度并前进
      const d0 = Math.hypot(startLat - destLat, startLng - destLng) || 0.01;
      const d1 = Math.hypot(latest.lat - destLat, latest.lng - destLng);
      t = Math.min(0.95, 1 - d1 / d0 + 0.1);
    }

    const lat = lerp(startLat, destLat, t);
    const lng = lerp(startLng, destLng, t);
    const arrived = t >= 0.92;

    await this.tracks.append({
      subjectType: 'home_visit',
      subjectId: bookingId,
      role: 'provider',
      lat,
      lng,
      source: 'mock',
      speed: 3.5,
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { servicePhase: arrived ? 'on_site' : 'en_route' },
    });
  }
}

function phaseLabel(p: string) {
  const map: Record<string, string> = {
    assigned: '待出发',
    en_route: '服务者赶往中',
    on_site: '已到达上门点',
    done: '服务完成',
  };
  return map[p] || p;
}
