/**
 * 扩展服务种子：线上问诊 + 上门服务。
 *
 * ## 为何独立脚本
 * 主 `seed.ts` 负责用户/商户/到店服务/评价；本文件增量 upsert，可在迁移后单独跑，
 * 避免每次全量 seed 才能更新问诊价或上门项。
 *
 * ## 用法
 * ```bash
 * pnpm --filter @petpal/db exec tsx prisma/seed-extra-services.ts
 * ```
 * 需已有商户 id=`m1`（医院）、`m3`（寄养），否则外键失败。
 *
 * ## 产品约定
 * - online_consult @ m1：priceCents=500（¥5 服务费）；「结束后酌情收费」仅文案，无第二笔订单模型
 * - home_visit @ m3：遛宠/喂食/垫材环境/笼箱照料/陪玩，供 CareHub「上门服务」Tab
 *
 * ## 与前端的对应
 * - MedicalHubPage → kind=online_consult
 * - CareHubPage 上门 Tab → kind=home_visit
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const extras = [
  {
    id: 'svc_online_consult_m1',
    merchantId: 'm1',
    name: '线上问诊（¥5 服务费）',
    priceCents: 500,
    durationMin: 20,
    kind: 'online_consult',
    description:
      '先收 5 元服务费接通兽医分诊；问题解决后按咨询深度酌情补收。急重症将建议立刻线下就医，不开处方。',
  },
  {
    id: 'svc_online_follow_m1',
    merchantId: 'm1',
    name: '术后/慢病线上复诊（¥5 起）',
    priceCents: 500,
    durationMin: 25,
    kind: 'online_consult',
    description:
      '先收 5 元服务费；建档宠物复诊咨询，结束后按情况酌情收费，必要时推荐附近医院复查。',
  },
  {
    id: 'svc_home_walk_m3',
    merchantId: 'm3',
    name: '上门遛宠（30分钟）',
    priceCents: 4800,
    durationMin: 30,
    kind: 'home_visit',
    description: '持证服务人员上门牵遛狗狗或陪同可外出小宠，结束后发送照片/视频反馈。',
  },
  {
    id: 'svc_home_feed_m3',
    merchantId: 'm3',
    name: '上门喂食换水',
    priceCents: 3800,
    durationMin: 25,
    kind: 'home_visit',
    description: '按饲喂说明上门喂食、换水；猫狗/鸟类/爬宠冻干虫等均可备注。',
  },
  {
    id: 'svc_home_litter_m3',
    merchantId: 'm3',
    name: '垫材/猫砂清理',
    priceCents: 4500,
    durationMin: 30,
    kind: 'home_visit',
    description: '清理猫砂盆或更换爬箱/笼具垫材，简单打扫如厕与活动区（耗材需自备或备注品牌）。',
  },
  {
    id: 'svc_home_enclosure_m3',
    merchantId: 'm3',
    name: '笼箱/鱼缸基础照料',
    priceCents: 5200,
    durationMin: 35,
    kind: 'home_visit',
    description: '检查温湿度/过滤、换水或整理爬箱环境（不做医疗操作），适合飞禽、爬宠、水族。',
  },
  {
    id: 'svc_home_play_m3',
    merchantId: 'm3',
    name: '上门陪玩照护',
    priceCents: 5800,
    durationMin: 40,
    kind: 'home_visit',
    description: '陪伴互动、基础梳毛安抚，适合独居毛孩。',
  },
];

async function main() {
  for (const s of extras) {
    await prisma.merchantService.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        priceCents: s.priceCents,
        durationMin: s.durationMin,
        kind: s.kind,
        description: s.description,
        enabled: true,
      },
      create: { ...s, enabled: true },
    });
  }
  console.log('Seed extra services OK:', extras.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
