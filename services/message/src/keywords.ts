/** 本地敏感词表（MVP）：命中则拦截，不展示给对方；含活体高监管词 */
export const BLOCKED_KEYWORDS = [
  '加微信',
  '加vx',
  '加VX',
  '私聊转账',
  '赌博',
  '色情',
  '发票代开',
  '办证',
  '枪支',
  '毒品',
  // 活体 / 领养售宠加强
  '无证',
  '走私',
  '黑市',
  '地下交易',
  '活体快递',
  '快递发猫',
  '快递发狗',
  '不看证照',
  '绕过平台',
  '站外成交',
];

export function findBlockedKeyword(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  for (const kw of BLOCKED_KEYWORDS) {
    if (t.includes(kw)) return kw;
  }
  return null;
}
