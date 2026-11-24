/**
 * 商品封面：优先 API coverUrl，否则按商品 id / 类目映射 Unsplash 实拍。
 */
const BY_ID: Record<string, string> = {
  p_food_1: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&q=80',
  p_food_2: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
  p_snack_1: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80',
  p_toy_1: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80',
  p_care_1: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&q=80',
  p_supply_1: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
  p_supply_2: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
  p_health_1: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&q=80',
};

const BY_CATEGORY: Record<string, string[]> = {
  主粮: [
    'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&q=80',
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
  ],
  零食: ['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80'],
  玩具: [
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&q=80',
    'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80',
  ],
  洗护: ['https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&q=80'],
  日用: [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
  ],
  保健: ['https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&q=80'],
};

const FALLBACK = 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80';

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function productCoverUrl(p: {
  id?: string;
  productId?: string;
  category?: string;
  coverUrl?: string | null;
}): string {
  if (p.coverUrl) return p.coverUrl;
  const id = p.id || p.productId || '';
  if (id && BY_ID[id]) return BY_ID[id];
  const pool = (p.category && BY_CATEGORY[p.category]) || BY_CATEGORY['主粮'];
  if (!pool?.length) return FALLBACK;
  return pool[hash(id || p.category || 'x') % pool.length] || FALLBACK;
}
