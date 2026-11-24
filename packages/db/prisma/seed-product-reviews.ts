import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.productReview.count();
  if (count > 0) {
    console.log('product reviews already exist:', count);
    return;
  }

  const demo = await prisma.user.findUnique({ where: { phone: '13800000001' } });
  const reviewer = await prisma.user.upsert({
    where: { phone: '13800000088' },
    update: {},
    create: { phone: '13800000088', nickname: '可乐家长' },
  });
  if (!demo) throw new Error('demo user missing');

  const samples = [
    {
      productId: 'p_snack_1',
      rating: 5,
      content: '毛孩超爱吃，训练奖励刚刚好，包装密封很好。',
      tags: ['毛孩爱吃', '包装完好', '适口性好'],
    },
    {
      productId: 'p_snack_1',
      rating: 5,
      content: '发货快，冻干很干爽不返潮。',
      tags: ['发货快', '性价比高'],
    },
    {
      productId: 'p_food_1',
      rating: 5,
      content: '换粮过渡顺利，便便成形，会继续回购。',
      tags: ['适口性好', '成分靠谱'],
    },
    {
      productId: 'p_food_1',
      rating: 4,
      content: '适口性不错，价格稍贵但配方透明。',
      tags: ['说明清晰', '成分靠谱'],
    },
    {
      productId: 'p_care_1',
      rating: 5,
      content: '洗完不干涩，敏感肌也没红。',
      tags: ['效果明显', '说明清晰'],
    },
    {
      productId: 'p_toy_1',
      rating: 4,
      content: '猫咪追着玩，羽毛头可替换很方便。',
      tags: ['性价比高', '包装完好'],
    },
  ];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const product = await prisma.product.findUnique({ where: { id: s.productId } });
    if (!product) continue;
    const order = await prisma.shopOrder.create({
      data: {
        userId: i % 2 === 0 ? demo.id : reviewer.id,
        status: 'paid',
        totalCents: product.priceCents,
        freightCents: 0,
        addressSnapshot: '上海市静安区（评价样例订单）',
        paidAt: new Date(Date.now() - (i + 1) * 86400000),
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            priceCents: product.priceCents,
            qty: 1,
            coverTone: product.coverTone,
          },
        },
      },
      include: { items: true },
    });
    await prisma.productReview.create({
      data: {
        productId: s.productId,
        userId: order.userId,
        orderItemId: order.items[0].id,
        rating: s.rating,
        content: s.content,
        tags: s.tags,
        helpfulCount: 4 + i,
      },
    });
  }

  for (const pid of [...new Set(samples.map((s) => s.productId))]) {
    const agg = await prisma.productReview.aggregate({
      where: { productId: pid },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.product.update({
      where: { id: pid },
      data: {
        rating: Math.round((agg._avg.rating || 0) * 10) / 10,
        reviewCount: agg._count.rating,
      },
    });
  }

  console.log('Seed product reviews OK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
