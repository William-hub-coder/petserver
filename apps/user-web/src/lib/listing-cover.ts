/** 领养/售宠封面：优先 API coverUrl，否则按物种映射 Unsplash */
const BY_SPECIES: Record<string, string[]> = {
  猫: [
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900&q=80',
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900&q=80',
    'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=900&q=80',
  ],
  狗: [
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=900&q=80',
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=80',
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=900&q=80',
  ],
  飞禽: [
    'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=900&q=80',
    'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=900&q=80',
  ],
  爬宠: [
    'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=900&q=80',
    'https://images.unsplash.com/photo-1534567153574-2b641dbc4033?w=900&q=80',
  ],
  两栖: ['https://images.unsplash.com/photo-1504450874802-0ba2bcd9b5ae?w=900&q=80'],
  小宠: [
    'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=900&q=80',
    'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=900&q=80',
  ],
  水族: [
    'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=900&q=80',
    'https://images.unsplash.com/photo-1535591273668-578e950ea7c4?w=900&q=80',
  ],
  其他: ['https://images.unsplash.com/photo-1450778869180-41d0601efe41?w=900&q=80'],
};

const FALLBACK = 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=900&q=80';

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function listingCoverUrl(p: {
  id?: string;
  species?: string;
  coverUrl?: string | null;
}): string {
  if (p.coverUrl) return p.coverUrl;
  const pool = (p.species && BY_SPECIES[p.species]) || BY_SPECIES['其他'] || [FALLBACK];
  return pool[hash(p.id || p.species || 'x') % pool.length] || FALLBACK;
}
