/**
 * 商户封面：优先真实摄影 URL，避免纯渐变伪装图片。
 * API 暂无 coverImage 字段时，按 id/category 稳定映射 Unsplash 实拍。
 */
import type { Merchant } from '../data/mock';

const BY_CATEGORY: Record<string, string[]> = {
  hospital: [
    'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&q=80',
    'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&q=80',
  ],
  grooming: [
    'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&q=80',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&q=80',
  ],
  boarding: [
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80',
    'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80',
  ],
  training: [
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
  ],
};

const FALLBACK =
  'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80';

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function merchantCoverUrl(m: Pick<Merchant, 'id' | 'category'> & { coverImage?: string | null }): string {
  if (m.coverImage) return m.coverImage;
  const pool = BY_CATEGORY[m.category] || BY_CATEGORY.boarding;
  return pool[hash(m.id) % pool.length] || FALLBACK;
}
