import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.user.findUnique({ where: { phone: '13800000001' } });
  if (!demo) throw new Error('demo user missing');
  const reviewer = await prisma.user.upsert({
    where: { phone: '13800000088' },
    update: { nickname: '奶茶家长' },
    create: { phone: '13800000088', nickname: '奶茶家长' },
  });
  const services = await prisma.merchantService.findMany();
  const samples = [
    {
      merchantId: 'm1',
      rating: 5,
      content: '医生很细致，候诊区干净，报告也能在 App 里看到。',
      tags: ['态度专业', '环境干净', '说明清晰'],
    },
    {
      merchantId: 'm1',
      rating: 5,
      content: '严选认证不是摆设，消毒记录齐全。',
      tags: ['服务细致', '设施齐全'],
    },
    {
      merchantId: 'm2',
      rating: 5,
      content: '洗完毛不打结，店员会提前确认皮肤敏感。',
      tags: ['毛孩放松', '服务细致'],
    },
    {
      merchantId: 'm2',
      rating: 4,
      content: '造型满意，高峰时段稍等了一会儿。',
      tags: ['性价比高', '预约准时'],
    },
    {
      merchantId: 'm3',
      rating: 4,
      content: '实时监控安心，晚上会发日常照片。',
      tags: ['环境干净', '说明清晰'],
    },
    {
      merchantId: 'm4',
      rating: 5,
      content: '老师很有耐心，课后有训练计划。',
      tags: ['态度专业', '服务细致'],
    },
  ];

  const withTags = await prisma.review.findMany();
  const tagged = withTags.filter((r) => Array.isArray(r.tags) && (r.tags as string[]).length > 0).length;
  console.log('existing tagged reviews', tagged);
  if (tagged >= 4) {
    console.log('skip');
    return;
  }

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const svc = services.find((x) => x.merchantId === s.merchantId) || services[0];
    const booking = await prisma.booking.create({
      data: {
        userId: i % 2 === 0 ? demo.id : reviewer.id,
        merchantId: s.merchantId,
        serviceId: svc.id,
        status: 'reviewed',
        bookingAt: new Date(Date.now() - (i + 3) * 86400000),
        verifyCode: `REF${Date.now().toString(36)}${i}`.toUpperCase().slice(0, 12),
        amountCents: svc.priceCents,
        verifiedAt: new Date(Date.now() - (i + 2) * 86400000),
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
        helpfulCount: 5 + i,
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
  console.log('inserted reference reviews');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
