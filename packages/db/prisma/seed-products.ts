import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Unsplash 宠物用品实拍（免费可商用），按品类挑选 */
const products = [
  {
    id: 'p_food_1',
    merchantId: 'm1',
    name: '严选低温烘焙猫粮（成猫）',
    category: '主粮',
    subtitle: '无谷配方 · 高蛋白 · 适口性好',
    coverTone: 'linear-gradient(145deg,#ff9a6a,#1a9e8e)',
    coverUrl: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&q=80',
    priceCents: 16800,
    originalPriceCents: 19800,
    stock: 120,
    sales: 856,
    unit: '袋',
    tags: ['猫咪', '主粮', '严选'],
    detail:
      '适用于1岁以上成猫。原料可追溯，不含诱食剂。\n注意：本平台不销售活体；请按宠物体重饲喂，敏感肠胃请先少量试吃。',
    specs: { weight: '2kg', suited: '成猫', shelfLife: '18个月' },
  },
  {
    id: 'p_food_2',
    merchantId: 'm1',
    name: '肠道友好犬用益生菌粮',
    category: '主粮',
    subtitle: '添加益生元 · 小颗粒易咀嚼',
    coverTone: 'linear-gradient(145deg,#d4a03a,#0f8f82)',
    coverUrl: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
    priceCents: 18900,
    originalPriceCents: 22900,
    stock: 80,
    sales: 432,
    unit: '袋',
    tags: ['狗狗', '主粮', '肠胃'],
    detail: '适合小型/中型成犬日常主食。换粮请7天过渡。',
    specs: { weight: '1.5kg', suited: '成犬', shelfLife: '12个月' },
  },
  {
    id: 'p_snack_1',
    merchantId: 'm2',
    name: '冻干鸡胸肉零食',
    category: '零食',
    subtitle: '单一肉源 · 低脂高蛋白',
    coverTone: 'linear-gradient(145deg,#ff8c5a,#d4a03a)',
    coverUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80',
    priceCents: 4900,
    originalPriceCents: 5900,
    stock: 300,
    sales: 2103,
    unit: '罐',
    tags: ['零食', '冻干', '训练奖励'],
    detail: '猫狗可共用冻干零食，训练奖励首选。请密封冷藏保存。',
    specs: { weight: '50g', suited: '猫/狗', shelfLife: '12个月' },
  },
  {
    id: 'p_toy_1',
    merchantId: 'm2',
    name: '逗猫羽毛棒套装',
    category: '玩具',
    subtitle: '可替换羽毛头 · 静音铃铛',
    coverTone: 'linear-gradient(145deg,#3d8fd4,#1a9e8e)',
    coverUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80',
    priceCents: 3900,
    originalPriceCents: 4500,
    stock: 200,
    sales: 980,
    unit: '套',
    tags: ['玩具', '猫咪', '互动'],
    detail: '含3个可替换羽毛头。玩耍时请看护，避免误食羽毛。',
    specs: { length: '60cm', suited: '猫咪', material: '木质+羽毛' },
  },
  {
    id: 'p_care_1',
    merchantId: 'm2',
    name: '温和宠物洗护液',
    category: '洗护',
    subtitle: '无泪配方 · 适合敏感肌',
    coverTone: 'linear-gradient(145deg,#4A90D9,#ff8c5a)',
    coverUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&q=80',
    priceCents: 6800,
    originalPriceCents: 7800,
    stock: 150,
    sales: 667,
    unit: '瓶',
    tags: ['洗护', '敏感肌'],
    detail: 'pH 温和，可用于猫狗日常清洁。避开眼睛与耳道。',
    specs: { volume: '300ml', suited: '猫/狗', scent: '无香精' },
  },
  {
    id: 'p_supply_1',
    merchantId: 'm3',
    name: '封闭式抽屉猫砂盆',
    category: '日用',
    subtitle: '防外溅 · 活性炭滤芯',
    coverTone: 'linear-gradient(145deg,#3da655,#1a9e8e)',
    coverUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
    priceCents: 25900,
    originalPriceCents: 29900,
    stock: 45,
    sales: 210,
    unit: '个',
    tags: ['日用', '猫咪', '除臭'],
    detail: '适合多猫家庭，侧入式门帘降低扬尘。',
    specs: { size: '大号', color: '雾灰', suited: '猫咪' },
  },
  {
    id: 'p_supply_2',
    merchantId: 'm4',
    name: '狗狗防滑训练垫',
    category: '日用',
    subtitle: '关节友好 · 易清洗',
    coverTone: 'linear-gradient(145deg,#d4a03a,#3d8fd4)',
    coverUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
    priceCents: 12900,
    originalPriceCents: 14900,
    stock: 60,
    sales: 188,
    unit: '张',
    tags: ['训练', '狗狗', '日用'],
    detail: '训练与居家防滑两用，可机洗。',
    specs: { size: '120x80cm', material: 'TPE', suited: '狗狗' },
  },
  {
    id: 'p_health_1',
    merchantId: 'm1',
    name: '化毛膏（营养膏）',
    category: '保健',
    subtitle: '辅助化毛 · 非药品',
    coverTone: 'linear-gradient(145deg,#1a9e8e,#0f6f66)',
    coverUrl: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&q=80',
    priceCents: 7800,
    originalPriceCents: 8800,
    stock: 220,
    sales: 1450,
    unit: '支',
    tags: ['保健', '猫咪'],
    detail:
      '本产品为营养补充类，非药品、不做诊疗承诺。若宠物持续呕吐请及时就医。',
    specs: { volume: '120g', suited: '猫咪', note: '非处方' },
  },
];

async function main() {
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        category: p.category,
        subtitle: p.subtitle,
        coverTone: p.coverTone,
        coverUrl: p.coverUrl,
        priceCents: p.priceCents,
        originalPriceCents: p.originalPriceCents,
        stock: p.stock,
        sales: p.sales,
        unit: p.unit,
        tags: p.tags,
        detail: p.detail,
        specs: p.specs,
        status: 'on_sale',
      },
      create: {
        ...p,
        status: 'on_sale',
      },
    });
  }
  console.log('Seed products OK:', products.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
