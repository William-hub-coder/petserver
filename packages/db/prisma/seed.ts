import { PrismaClient, MerchantStatus, CreditGrade, PetType } from '@prisma/client';

const prisma = new PrismaClient();

type SeedMerchant = {
  id: string;
  name: string;
  category: string;
  creditScore: number;
  creditGrade: CreditGrade;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  address: string;
  city: string;
  district: string;
  closeTime: string;
  priceLevel: string;
  coverTone: string;
  highlight: string;
  tags: string[];
  selectedBadge: boolean;
  lastInspectedAt: Date;
  services: { name: string; priceCents: number; durationMin: number }[];
};

const merchants: SeedMerchant[] = [
  {
    id: 'm1',
    name: '暖爪宠物医院（静安店）',
    category: 'hospital',
    creditScore: 92,
    creditGrade: CreditGrade.S,
    rating: 4.9,
    reviewCount: 328,
    lat: 31.2304,
    lng: 121.4554,
    address: '静安区南京西路1266号',
    city: '上海',
    district: '静安区',
    closeTime: '21:00',
    priceLevel: '¥¥',
    coverTone: 'linear-gradient(145deg,#0f8f82 0%,#1a9e8e 45%,#3d8fd4 100%)',
    highlight: '手术室与药品分柜通过实地核查',
    tags: ['医疗', '疫苗', '绝育'],
    selectedBadge: true,
    lastInspectedAt: new Date('2026-07-12'),
    services: [
      { name: '基础体检', priceCents: 12800, durationMin: 30 },
      { name: '猫三联疫苗', priceCents: 16800, durationMin: 20 },
      { name: '绝育咨询', priceCents: 0, durationMin: 15 },
    ],
  },
  {
    id: 'm2',
    name: '毛孩洗护美学馆',
    category: 'grooming',
    creditScore: 86,
    creditGrade: CreditGrade.A,
    rating: 4.7,
    reviewCount: 156,
    lat: 31.2218,
    lng: 121.4362,
    address: '静安区愚园路380号',
    city: '上海',
    district: '静安区',
    closeTime: '20:30',
    priceLevel: '¥¥',
    coverTone: 'linear-gradient(145deg,#ff9a6a 0%,#ff8c5a 50%,#d4a03a 100%)',
    highlight: '吹水间独立分区，噪声与通风达标',
    tags: ['洗护', '美容', 'SPA'],
    selectedBadge: true,
    lastInspectedAt: new Date('2026-06-28'),
    services: [
      { name: '基础洗护', priceCents: 12800, durationMin: 60 },
      { name: '精致造型', priceCents: 21800, durationMin: 90 },
    ],
  },
  {
    id: 'm3',
    name: '安心寄养小院',
    category: 'boarding',
    creditScore: 78,
    creditGrade: CreditGrade.B,
    rating: 4.5,
    reviewCount: 89,
    lat: 31.2412,
    lng: 121.3998,
    address: '普陀区光复西路88号',
    city: '上海',
    district: '普陀区',
    closeTime: '22:00',
    priceLevel: '¥',
    coverTone: 'linear-gradient(145deg,#3da655 0%,#1a9e8e 70%)',
    highlight: '笼舍消毒记录完整，已要求整改垫料异味',
    tags: ['寄养', '监控', '接送'],
    selectedBadge: true,
    lastInspectedAt: new Date('2026-05-16'),
    services: [
      { name: '日托', priceCents: 6800, durationMin: 480 },
      { name: '寄养（晚）', priceCents: 9800, durationMin: 720 },
    ],
  },
  {
    id: 'm4',
    name: '爪爪行为训练中心',
    category: 'training',
    creditScore: 88,
    creditGrade: CreditGrade.A,
    rating: 4.8,
    reviewCount: 112,
    lat: 31.2156,
    lng: 121.4123,
    address: '长宁区延安西路2099号',
    city: '上海',
    district: '长宁区',
    closeTime: '19:30',
    priceLevel: '¥¥¥',
    coverTone: 'linear-gradient(145deg,#d4a03a 0%,#1a9e8e 90%)',
    highlight: '训练师资质齐全，训练场地防滑达标',
    tags: ['训练', '幼犬', '行为'],
    selectedBadge: true,
    lastInspectedAt: new Date('2026-07-02'),
    services: [
      { name: '幼犬启蒙课', priceCents: 29900, durationMin: 45 },
      { name: '行为矫正评估', priceCents: 19900, durationMin: 40 },
    ],
  },
];

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { phone: '13800000001' },
    update: { nickname: '豆豆家长', role: 'user' },
    create: {
      phone: '13800000001',
      nickname: '豆豆家长',
      role: 'user',
      privacyAcceptedAt: new Date(),
      privacyVersion: '2026.1',
    },
  });

  const merchantOwner = await prisma.user.upsert({
    where: { phone: '13900000001' },
    update: { nickname: '暖爪店长', role: 'merchant' },
    create: {
      phone: '13900000001',
      nickname: '暖爪店长',
      role: 'merchant',
      privacyAcceptedAt: new Date(),
      privacyVersion: '2026.1',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { phone: '13700000001' },
    update: { nickname: '运营管理员', role: 'admin' },
    create: {
      phone: '13700000001',
      nickname: '运营管理员',
      role: 'admin',
      privacyAcceptedAt: new Date(),
      privacyVersion: '2026.1',
    },
  });

  await prisma.pet.upsert({
    where: { id: 'pet_demo_1' },
    update: {
      gender: 'female',
      sterilized: true,
      vaccinated: true,
      dietNote: '主粮渴望，早晚各一餐',
      habitatNote: '全室内饲养，封闭阳台',
      adoptionSource: 'purchased',
    },
    create: {
      id: 'pet_demo_1',
      userId: demoUser.id,
      name: '豆豆',
      type: PetType.cat,
      breed: '英短',
      gender: 'female',
      weightKg: 4.2,
      sterilized: true,
      vaccinated: true,
      dietNote: '主粮渴望，早晚各一餐',
      habitatNote: '全室内饲养，封闭阳台',
      adoptionSource: 'purchased',
    },
  });

  await prisma.pet.upsert({
    where: { id: 'pet_demo_gecko' },
    update: {
      type: PetType.reptile,
      breed: '豹纹守宫',
      dietNote: '杜比亚蟑螂 + 钙粉，夜间投喂',
      habitatNote: '爬箱 60cm，暖端 30℃ / 冷端 26℃，无强 UVB',
      specialNeeds: '蜕皮期勿惊扰，提供湿窝',
      adoptionSource: 'purchased',
    },
    create: {
      id: 'pet_demo_gecko',
      userId: demoUser.id,
      name: '小斑',
      type: PetType.reptile,
      breed: '豹纹守宫',
      gender: 'male',
      weightKg: 0.05,
      vaccinated: false,
      sterilized: false,
      dietNote: '杜比亚蟑螂 + 钙粉，夜间投喂',
      habitatNote: '爬箱 60cm，暖端 30℃ / 冷端 26℃，无强 UVB',
      specialNeeds: '蜕皮期勿惊扰，提供湿窝',
      notes: '胆小，寄养时请少开箱',
      adoptionSource: 'purchased',
    },
  });

  await prisma.pet.upsert({
    where: { id: 'pet_demo_cockatiel' },
    update: {
      type: PetType.bird,
      breed: '玄凤鹦鹉',
      dietNote: '玄凤粮 + 适量蔬菜，禁鳄梨',
      habitatNote: '大型鸟笼，每日放飞 1h',
      adoptionSource: 'rescued',
    },
    create: {
      id: 'pet_demo_cockatiel',
      userId: demoUser.id,
      name: '灰灰',
      type: PetType.bird,
      breed: '玄凤鹦鹉',
      gender: 'unknown',
      weightKg: 0.09,
      vaccinated: false,
      dietNote: '玄凤粮 + 适量蔬菜，禁鳄梨',
      habitatNote: '大型鸟笼，每日放飞 1h',
      specialNeeds: '对烟雾敏感，禁抽烟环境',
      adoptionSource: 'rescued',
    },
  });

  for (const m of merchants) {
    await prisma.merchant.upsert({
      where: { id: m.id },
      update: {
        name: m.name,
        category: m.category,
        status: MerchantStatus.online,
        creditScore: m.creditScore,
        creditGrade: m.creditGrade,
        rating: m.rating,
        reviewCount: m.reviewCount,
        lat: m.lat,
        lng: m.lng,
        address: m.address,
        city: m.city,
        district: m.district,
        closeTime: m.closeTime,
        priceLevel: m.priceLevel,
        coverTone: m.coverTone,
        highlight: m.highlight,
        tags: m.tags,
        selectedBadge: m.selectedBadge,
        lastInspectedAt: m.lastInspectedAt,
        ownerUserId: m.id === 'm1' ? merchantOwner.id : null,
      },
      create: {
        id: m.id,
        name: m.name,
        category: m.category,
        status: MerchantStatus.online,
        creditScore: m.creditScore,
        creditGrade: m.creditGrade,
        rating: m.rating,
        reviewCount: m.reviewCount,
        lat: m.lat,
        lng: m.lng,
        address: m.address,
        city: m.city,
        district: m.district,
        openTime: '09:00',
        closeTime: m.closeTime,
        priceLevel: m.priceLevel,
        coverTone: m.coverTone,
        highlight: m.highlight,
        tags: m.tags,
        selectedBadge: m.selectedBadge,
        lastInspectedAt: m.lastInspectedAt,
        ownerUserId: m.id === 'm1' ? merchantOwner.id : null,
      },
    });

    const existingServices = await prisma.merchantService.count({ where: { merchantId: m.id } });
    if (existingServices === 0) {
      await prisma.merchantService.createMany({
        data: m.services.map((s) => ({
          merchantId: m.id,
          name: s.name,
          priceCents: s.priceCents,
          durationMin: s.durationMin,
          enabled: true,
        })),
      });
    }
  }

  const existingMsg = await prisma.message.count({ where: { userId: demoUser.id } });
  if (existingMsg === 0) {
    await prisma.message.createMany({
      data: [
        {
          userId: demoUser.id,
          title: '欢迎来到宠伴',
          body: '每一家店，我们都替你看过。完成宠物档案可解锁更准推荐。',
          type: 'system',
        },
        {
          userId: demoUser.id,
          title: '考察通过通知',
          body: '「暖爪宠物医院」已完成实地复检，信用分更新为 92。',
          type: 'system',
        },
      ],
    });
  }

  // 演示：用户 ↔ 暖爪医院 门店会话
  const demoConv = await prisma.conversation.findFirst({
    where: { userId: demoUser.id, merchantId: 'm1', kind: 'merchant_support' },
  });
  if (!demoConv) {
    const conv = await prisma.conversation.create({
      data: {
        kind: 'merchant_support',
        userId: demoUser.id,
        merchantId: 'm1',
        lastMsgAt: new Date(),
        lastPreview: '您好，有什么可以帮您？',
        userUnread: 1,
      },
    });
    await prisma.chatMessage.createMany({
      data: [
        {
          conversationId: conv.id,
          senderUserId: demoUser.id,
          senderRole: 'system',
          type: 'system',
          body: '您正在联系「暖爪宠物医院（静安店）」，商家通常会在营业时间内回复。',
        },
        {
          conversationId: conv.id,
          senderUserId: merchantOwner.id,
          senderRole: 'merchant',
          type: 'text',
          body: '您好，有什么可以帮您？',
        },
      ],
    });
  }

  // Seed reference reviews (核销后真实评价样例，供后续用户参考)
  const reviewCount = await prisma.review.count();
  if (reviewCount === 0) {
    const reviewer = await prisma.user.upsert({
      where: { phone: '13800000088' },
      update: { nickname: '奶茶家长' },
      create: { phone: '13800000088', nickname: '奶茶家长', privacyAcceptedAt: new Date(), privacyVersion: '2026.1' },
    });
    const services = await prisma.merchantService.findMany({
      where: { merchantId: { in: ['m1', 'm2', 'm3', 'm4'] } },
      orderBy: { merchantId: 'asc' },
    });
    const samples = [
      { merchantId: 'm1', rating: 5, content: '医生很细致，候诊区干净，报告也能在 App 里看到。', tags: ['态度专业', '环境干净', '说明清晰'] },
      { merchantId: 'm1', rating: 5, content: '严选认证不是摆设，消毒记录齐全，绝育咨询很耐心。', tags: ['服务细致', '设施齐全'] },
      { merchantId: 'm2', rating: 5, content: '洗完毛不打结，店员会提前确认皮肤敏感。', tags: ['毛孩放松', '服务细致'] },
      { merchantId: 'm2', rating: 4, content: '造型满意，高峰时段稍等了一会儿。', tags: ['性价比高', '预约准时'] },
      { merchantId: 'm3', rating: 4, content: '实时监控安心，晚上会发日常照片。', tags: ['环境干净', '说明清晰'] },
      { merchantId: 'm4', rating: 5, content: '老师很有耐心，课后有训练计划。', tags: ['态度专业', '服务细致'] },
    ];
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const svc = services.find((x) => x.merchantId === s.merchantId) || services[0];
      const booking = await prisma.booking.create({
        data: {
          userId: i % 2 === 0 ? demoUser.id : reviewer.id,
          merchantId: s.merchantId,
          serviceId: svc.id,
          status: 'reviewed',
          bookingAt: new Date(Date.now() - (i + 2) * 86400000),
          verifyCode: `SEED${i}${Math.random().toString(16).slice(2, 6)}`.toUpperCase(),
          amountCents: svc.priceCents,
          verifiedAt: new Date(Date.now() - (i + 1) * 86400000),
        },
      });
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          merchantId: s.merchantId,
          serviceId: svc.id,
          serviceName: svc.name,
          rating: s.rating,
          content: s.content,
          tags: s.tags,
          helpfulCount: 3 + i,
        },
      });
    }
    for (const mid of ['m1', 'm2', 'm3', 'm4']) {
      const agg = await prisma.review.aggregate({
        where: { merchantId: mid },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await prisma.merchant.update({
        where: { id: mid },
        data: {
          rating: Math.round((agg._avg.rating || 0) * 10) / 10,
          reviewCount: agg._count.rating,
        },
      });
    }
  }

  console.log(
    'Seed OK: merchants=%d demoUser=%s merchantOwner=%s admin=%s',
    merchants.length,
    demoUser.phone,
    merchantOwner.phone,
    adminUser.phone,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
