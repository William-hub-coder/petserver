import { Injectable } from '@nestjs/common';
import { MerchantStatus, prisma } from '@petpal/db';

/**
 * 跨商户「服务目录」查询。
 *
 * ## 与 MerchantService.detail 的区别
 * | API | 视角 | 用途 |
 * |-----|------|------|
 * | GET /merchants/:id | 先选店，再看店内 services | 到店预约、线下就医进店 |
 * | GET /service-catalog?kind= | 先按服务类型横跨多店 | 线上问诊列表、上门服务列表 |
 *
 * ## kind 取值
 * - `online_consult`：医疗板块「线上问诊」Tab
 * - `home_visit`：上门和寄养板块「上门服务」Tab
 * - `onsite`：到店类（一般仍走商户详情，目录接口较少直接用）
 *
 * 仅返回已上线商户（MerchantStatus.online）且 enabled=true 的服务。
 * 排序：商户信用分降序，再按价格升序（问诊/上门比价友好）。
 */
@Injectable()
export class ServiceCatalogService {
  async listByKind(kind: string) {
    const rows = await prisma.merchantService.findMany({
      where: {
        kind,
        enabled: true,
        merchant: { status: MerchantStatus.online },
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            category: true,
            creditScore: true,
            selectedBadge: true,
            coverTone: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: [{ merchant: { creditScore: 'desc' } }, { priceCents: 'asc' }],
    });

    // price：元（整数，便于 H5 展示）；priceCents：分（下单仍用服务表原值）
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      description: s.description || '',
      price: Math.round(s.priceCents / 100),
      priceCents: s.priceCents,
      durationMin: s.durationMin,
      duration: `${s.durationMin}分钟`,
      merchantId: s.merchant.id,
      merchantName: s.merchant.name,
      merchantCategory: s.merchant.category,
      creditScore: s.merchant.creditScore,
      selectedBadge: s.merchant.selectedBadge,
      coverTone: s.merchant.coverTone,
      address: s.merchant.address,
      city: s.merchant.city,
    }));
  }
}
