import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus, prisma } from '@petpal/db';

@Injectable()
export class ProductService {
  categories() {
    return [
      { key: '全部', label: '全部' },
      { key: '主粮', label: '主粮' },
      { key: '零食', label: '零食' },
      { key: '玩具', label: '玩具' },
      { key: '洗护', label: '洗护' },
      { key: '日用', label: '日用' },
      { key: '保健', label: '保健' },
    ];
  }

  async list(query: {
    category?: string;
    keyword?: string;
    sort?: string;
    merchantId?: string;
  }) {
    const where = {
      status: ProductStatus.on_sale,
      category:
        query.category && query.category !== '全部' ? query.category : undefined,
      merchantId: query.merchantId || undefined,
      OR: query.keyword
        ? [
            { name: { contains: query.keyword } },
            { subtitle: { contains: query.keyword } },
          ]
        : undefined,
    };

    const rows = await prisma.product.findMany({
      where,
      include: { merchant: { select: { id: true, name: true, selectedBadge: true } } },
      orderBy:
        query.sort === 'price_asc'
          ? { priceCents: 'asc' }
          : query.sort === 'price_desc'
            ? { priceCents: 'desc' }
            : query.sort === 'rating'
              ? { rating: 'desc' }
              : query.sort === 'sales'
                ? { sales: 'desc' }
                : { sales: 'desc' },
    });

    return rows.map((p) => this.toCard(p));
  }

  async detail(id: string) {
    const p = await prisma.product.findUnique({
      where: { id },
      include: { merchant: { select: { id: true, name: true, selectedBadge: true, creditScore: true } } },
    });
    if (!p || p.status !== ProductStatus.on_sale) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '商品不存在或已下架' });
    }
    return {
      ...this.toCard(p),
      detail: p.detail || '',
      specs: (p.specs as Record<string, string>) || {},
      stock: p.stock,
      unit: p.unit,
      merchantCreditScore: p.merchant.creditScore,
      complianceNote: '平台不销售活体；保健类商品非药品，急症请就医。',
    };
  }

  private toCard(p: {
    id: string;
    name: string;
    category: string;
    subtitle: string | null;
    coverTone: string | null;
    coverUrl?: string | null;
    priceCents: number;
    originalPriceCents: number | null;
    sales: number;
    rating: number;
    reviewCount: number;
    tags: unknown;
    merchant: { id: string; name: string; selectedBadge: boolean };
  }) {
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      subtitle: p.subtitle || '',
      coverTone: p.coverTone || 'linear-gradient(145deg,#1a9e8e,#0f6f66)',
      coverUrl: p.coverUrl || null,
      price: Math.round(p.priceCents / 100),
      priceCents: p.priceCents,
      originalPrice: p.originalPriceCents ? Math.round(p.originalPriceCents / 100) : null,
      sales: p.sales,
      rating: p.rating ?? 0,
      reviewCount: p.reviewCount ?? 0,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
      merchantId: p.merchant.id,
      merchantName: p.merchant.name,
      selectedBadge: p.merchant.selectedBadge,
    };
  }
}
