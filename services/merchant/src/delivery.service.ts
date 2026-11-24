import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShopOrderStatus, prisma } from '@petpal/db';
import { AmapClient } from './amap.client';
import { LocationTrackService, lerp, mockEnabled } from './location-track.service';

/** 演示仓位：静安附近 */
const WAREHOUSE = { lat: 31.235, lng: 121.45 };

@Injectable()
export class DeliveryService {
  constructor(
    private readonly amap: AmapClient,
    private readonly tracks: LocationTrackService,
  ) {}

  /** 发货：创建配送任务；MVP 自动进入 delivering + mock 轨迹 */
  async ship(userId: string, orderId: string, role?: string) {
    const order = await prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { delivery: true, items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException({ code: 'NOT_FOUND', message: '订单不存在' });

    const isOwner = order.userId === userId;
    const isMerchant = role === 'merchant';
    // MVP：用户也可点「模拟发货」方便联调；生产应仅商家
    if (!isOwner && !isMerchant) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权发货' });
    }
    if (order.status !== ShopOrderStatus.paid && order.status !== ShopOrderStatus.shipped) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '当前状态不可发货' });
    }
    if (order.delivery) return this.toDto(order.delivery.id);

    const dest = await this.amap.geocode(order.addressSnapshot || '上海市静安区');
    const merchantId = order.items[0]?.product?.merchantId;
    let origin = { ...WAREHOUSE };
    if (merchantId) {
      const m = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (m?.lat != null && m?.lng != null) origin = { lat: m.lat, lng: m.lng };
    }

    const mission = await prisma.deliveryMission.create({
      data: {
        shopOrderId: order.id,
        status: 'delivering',
        courierName: '宠伴专送·小李',
        courierPhone: '138****0000',
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: dest.lat,
        destLng: dest.lng,
        destAddress: order.addressSnapshot,
        provider: mockEnabled() ? 'mock' : 'partner',
        progress: 0.05,
      },
    });

    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { status: ShopOrderStatus.delivering },
    });

    await this.tracks.append({
      subjectType: 'delivery',
      subjectId: mission.id,
      role: 'courier',
      lat: origin.lat,
      lng: origin.lng,
      source: 'mock',
    });

    return this.toDto(mission.id);
  }

  async byOrder(userId: string, orderId: string) {
    const order = await prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });
    if (!order) throw new NotFoundException({ code: 'NOT_FOUND', message: '订单不存在' });
    if (order.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权查看' });
    }
    if (!order.delivery) {
      return { orderId, delivery: null };
    }
    return this.toDto(order.delivery.id);
  }

  async get(userId: string, missionId: string) {
    const mission = await prisma.deliveryMission.findUnique({
      where: { id: missionId },
      include: { shopOrder: true },
    });
    if (!mission) throw new NotFoundException({ code: 'NOT_FOUND', message: '配送任务不存在' });
    if (mission.shopOrder.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权查看' });
    }
    await this.advanceMock(mission.id);
    return this.toDto(mission.id);
  }

  async trackList(userId: string, missionId: string) {
    await this.get(userId, missionId);
    return this.tracks.list('delivery', missionId);
  }

  /** 每次查询推进一点 mock 进度，模拟骑手移动 */
  private async advanceMock(missionId: string) {
    if (!mockEnabled()) return;
    const m = await prisma.deliveryMission.findUnique({ where: { id: missionId } });
    if (!m || m.provider !== 'mock') return;
    if (m.status === 'done' || m.status === 'arrived') return;
    if (m.originLat == null || m.originLng == null || m.destLat == null || m.destLng == null) {
      return;
    }

    const next = Math.min(1, (m.progress || 0) + 0.08);
    const lat = lerp(m.originLat, m.destLat, next);
    const lng = lerp(m.originLng, m.destLng, next);
    const status = next >= 1 ? 'arrived' : 'delivering';

    await prisma.deliveryMission.update({
      where: { id: missionId },
      data: { progress: next, status },
    });
    if (status === 'arrived') {
      await prisma.shopOrder.update({
        where: { id: m.shopOrderId },
        data: { status: ShopOrderStatus.shipped },
      });
    }
    await this.tracks.append({
      subjectType: 'delivery',
      subjectId: missionId,
      role: 'courier',
      lat,
      lng,
      source: 'mock',
      speed: 4.2,
    });
  }

  private async toDto(missionId: string) {
    const m = await prisma.deliveryMission.findUnique({
      where: { id: missionId },
      include: { shopOrder: true },
    });
    if (!m) throw new NotFoundException({ code: 'NOT_FOUND', message: '配送任务不存在' });
    const courier = await this.tracks.latest('delivery', missionId, 'courier');
    let etaSec: number | null = null;
    if (
      courier &&
      m.destLat != null &&
      m.destLng != null &&
      m.status === 'delivering'
    ) {
      const d = await this.amap.direction(
        { lat: courier.lat, lng: courier.lng },
        { lat: m.destLat, lng: m.destLng },
      );
      etaSec = d.durationSec;
    }
    return {
      orderId: m.shopOrderId,
      delivery: {
        id: m.id,
        status: m.status,
        statusLabel: statusLabel(m.status),
        courierName: m.courierName,
        courierPhone: m.courierPhone,
        provider: m.provider,
        progress: m.progress,
        origin: m.originLat != null ? { lat: m.originLat, lng: m.originLng } : null,
        dest: m.destLat != null ? { lat: m.destLat, lng: m.destLng, address: m.destAddress } : null,
        courier,
        etaSec,
        etaText: etaSec != null ? `约 ${Math.max(1, Math.round(etaSec / 60))} 分钟` : null,
      },
    };
  }
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    assigned: '待取件',
    picking: '取件中',
    delivering: '配送中',
    arrived: '已送达',
    done: '已完成',
    cancelled: '已取消',
  };
  return map[s] || s;
}
