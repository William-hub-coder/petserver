/**
 * 找店模块 → 高德周边搜索关键词（用 | 表示 OR）。
 * 模块切换时填入对应词，再结合用户自定义 keyword 实时拉取。
 */
export const NEARBY_MODULE_KEYWORDS: Record<string, string> = {
  全部: '宠物店|宠物医院|宠物美容',
  all: '宠物店|宠物医院|宠物美容',
  医疗: '宠物医院|动物医院',
  hospital: '宠物医院|动物医院',
  洗护: '宠物美容|宠物洗护|宠物店',
  grooming: '宠物美容|宠物洗护|宠物店',
  寄养: '宠物寄养|宠物酒店',
  boarding: '宠物寄养|宠物酒店',
  训练: '宠物训练|训犬',
  training: '宠物训练|训犬',
};

export function resolveNearbyKeywords(module?: string, keyword?: string): string {
  const custom = (keyword || '').trim();
  if (custom) return custom;
  const key = (module || '全部').trim();
  return NEARBY_MODULE_KEYWORDS[key] || NEARBY_MODULE_KEYWORDS['全部']!;
}

/** 模块 → 站内 category（用于优先匹配严选库） */
export function moduleToCategory(module?: string): string | undefined {
  const m = (module || '').trim();
  const map: Record<string, string> = {
    医疗: 'hospital',
    hospital: 'hospital',
    洗护: 'grooming',
    grooming: 'grooming',
    寄养: 'boarding',
    boarding: 'boarding',
    训练: 'training',
    training: 'training',
  };
  return map[m];
}
