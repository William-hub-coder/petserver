import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProductStatus, ShopOrderStatus, prisma } from '@petpal/db';

@Injectable()
export class ShopOrderService {
  private uid(userId?: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    return userId;
  }

  async checkout(
    userId: string | undefined,
    body: {
      items?: Array<{ productId: string; qty: number }>;
      fromCart?: boolean;
      address?: string;
      remark?: string;
      payNow?: boolean;
    },
  ) {
    const uid = this.uid(userId);
    let lines = body.items || [];

    if (body.fromCart) {
      const cart = await prisma.cartItem.findMany({
        where: { userId: uid },
        include: { product: true },
      });
      lines = cart.map((c) => ({ productId: c.productId, qty: c.qty }));
    }

    if (!lines.length) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '购物车或商品为空' });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let totalCents = 0;
    const orderItems: Array<{
      productId: string;
      productName: string;
      priceCents: number;
      qty: number;
      coverTone: string | null;
      coverUrl: string | null;
    }> = [];

    for (const line of lines) {
      const p = byId.get(line.productId);
      if (!p || p.status !== ProductStatus.on_sale) {
        throw new BadRequestException({ code: 'BAD_REQUEST', message: `商品不可售：${line.productId}` });
      }
      if (p.stock < line.qty) {
        throw new BadRequestException({ code: 'BAD_REQUEST', message: `${p.name} 库存不足` });
      }
      totalCents += p.priceCents * line.qty;
      orderItems.push({
        productId: p.id,
        productName: p.name,
        priceCents: p.priceCents,
        qty: line.qty,
        coverTone: p.coverTone,
        coverUrl: p.coverUrl,
      });
    }

    const freightCents = totalCents >= 9900 ? 0 : 800;
    const payNow = body.payNow !== false;

    const order = await prisma.$transaction(async (tx) => {
      for (const line of orderItems) {
        const updated = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.qty } },
          data: { stock: { decrement: line.qty }, sales: { increment: line.qty } },
        });
        if (updated.count === 0) {
          throw new BadRequestException({ code: 'BAD_REQUEST', message: `${line.productName} 库存不足` });
        }
      }

      const created = await tx.shopOrder.create({
        data: {
          userId: uid,
          status: payNow ? ShopOrderStatus.paid : ShopOrderStatus.pending_pay,
          totalCents: totalCents + freightCents,
          freightCents,
          addressSnapshot: body.address || '上海市静安区（演示地址）',
          remark: body.remark || '',
          paidAt: payNow ? new Date() : null,
          items: { create: orderItems },
        },
        include: { items: { include: { review: { select: { id: true } } } } },
      });

      if (body.fromCart) {
        await tx.cartItem.deleteMany({ where: { userId: uid } });
      }

      await tx.message.create({
        data: {
          userId: uid,
          title: payNow ? '商城订单支付成功（模拟）' : '商城订单已创建',
          body: `订单 ${created.id.slice(-8).toUpperCase()} 共 ¥${((totalCents + freightCents) / 100).toFixed(0)}，可在「商城订单」查看。`,
          type: 'order',
        },
      });

      return created;
    });

    return this.toDto(order);
  }

  async list(userId?: string) {
    const uid = this.uid(userId);
    const rows = await prisma.shopOrder.findMany({
      where: { userId: uid },
      include: { items: { include: { review: { select: { id: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((o) => this.toDto(o));
  }

  async get(userId: string | undefined, id: string) {
    const uid = this.uid(userId);
    const o = await prisma.shopOrder.findUnique({
      where: { id },
      include: { items: { include: { review: { select: { id: true } } } } },
    });
    if (!o || o.userId !== uid) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '订单不存在' });
    }
    return this.toDto(o);
  }

  async pay(userId: string | undefined, id: string) {
    const uid = this.uid(userId);
    const o = await prisma.shopOrder.findUnique({ where: { id } });
    if (!o || o.userId !== uid) throw new NotFoundException({ code: 'NOT_FOUND', message: '订单不存在' });
    if (o.status !== ShopOrderStatus.pending_pay) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '当前状态不可支付' });
    }
    const updated = await prisma.shopOrder.update({
      where: { id },
      data: { status: ShopOrderStatus.paid, paidAt: new Date() },
      include: { items: { include: { review: { select: { id: true } } } } },
    });
    return this.toDto(updated);
  }

  private toDto(o: {
    id: string;
    status: ShopOrderStatus;
    totalCents: number;
    freightCents: number;
    addressSnapshot: string | null;
    remark: string | null;
    paidAt: Date | null;
    createdAt: Date;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      priceCents: number;
      qty: number;
      coverTone: string | null;
      coverUrl?: string | null;
      review?: { id: string } | null;
    }>;
  }) {
    const reviewable: ShopOrderStatus[] = [
      ShopOrderStatus.paid,
      ShopOrderStatus.shipped,
      ShopOrderStatus.delivering,
      ShopOrderStatus.completed,
    ];
    const canReview = reviewable.includes(o.status);
    const trackable =
      o.status === ShopOrderStatus.delivering ||
      o.status === ShopOrderStatus.shipped ||
      o.status === ShopOrderStatus.paid;
    return {
      id: o.id,
      status: o.status,
      statusLabel: this.statusLabel(o.status),
      totalCents: o.totalCents,
      total: Math.round(o.totalCents / 100),
      freightCents: o.freightCents,
      freight: Math.round(o.freightCents / 100),
      address: o.addressSnapshot,
      remark: o.remark,
      paidAt: o.paidAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      canShip: o.status === ShopOrderStatus.paid,
      canTrack: trackable,
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.productName,
        price: Math.round(i.priceCents / 100),
        qty: i.qty,
        coverTone: i.coverTone,
        coverUrl: i.coverUrl ?? null,
        reviewed: !!i.review,
        canReview: canReview && !i.review,
      })),
    };
  }

  private statusLabel(s: ShopOrderStatus) {
    const map: Record<ShopOrderStatus, string> = {
      pending_pay: '待支付',
      paid: '已支付',
      shipped: '已发货',
      delivering: '配送中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return map[s];
  }
}
