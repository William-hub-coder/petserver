import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProductStatus, prisma } from '@petpal/db';

@Injectable()
export class CartService {
  private uid(userId?: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    return userId;
  }

  async list(userId?: string) {
    const uid = this.uid(userId);
    const items = await prisma.cartItem.findMany({
      where: { userId: uid },
      include: {
        product: {
          include: { merchant: { select: { name: true, selectedBadge: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const mapped = items
      .filter((i) => i.product.status === ProductStatus.on_sale)
      .map((i) => ({
        id: i.id,
        productId: i.productId,
        qty: i.qty,
        name: i.product.name,
        coverTone: i.product.coverTone,
        coverUrl: i.product.coverUrl,
        priceCents: i.product.priceCents,
        price: Math.round(i.product.priceCents / 100),
        stock: i.product.stock,
        merchantName: i.product.merchant.name,
        selectedBadge: i.product.merchant.selectedBadge,
      }));
    const totalCents = mapped.reduce((s, i) => s + i.priceCents * i.qty, 0);
    return { items: mapped, totalCents, total: Math.round(totalCents / 100), count: mapped.length };
  }

  async add(userId: string | undefined, body: { productId?: string; qty?: number }) {
    const uid = this.uid(userId);
    if (!body.productId) throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少商品' });
    const qty = Math.max(1, Number(body.qty || 1));
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product || product.status !== ProductStatus.on_sale) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '商品不可购买' });
    }
    if (product.stock < qty) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '库存不足' });
    }
    await prisma.cartItem.upsert({
      where: { userId_productId: { userId: uid, productId: body.productId } },
      update: { qty: { increment: qty } },
      create: { userId: uid, productId: body.productId, qty },
    });
    return this.list(uid);
  }

  async update(userId: string | undefined, productId: string, qty: number) {
    const uid = this.uid(userId);
    if (qty <= 0) {
      await prisma.cartItem.deleteMany({ where: { userId: uid, productId } });
    } else {
      await prisma.cartItem.updateMany({
        where: { userId: uid, productId },
        data: { qty },
      });
    }
    return this.list(uid);
  }

  async clear(userId?: string) {
    const uid = this.uid(userId);
    await prisma.cartItem.deleteMany({ where: { userId: uid } });
    return { ok: true };
  }
}
