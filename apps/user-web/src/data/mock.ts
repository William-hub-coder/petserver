export type Merchant = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  creditScore: number;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  lat?: number | null;
  lng?: number | null;
  inspectedAt: string;
  coverTone: string;
  /** 可选实拍封面；缺省时由 merchant-cover 映射 */
  coverImage?: string;
  address: string;
  openUntil: string;
  priceLevel: string;
  highlight: string;
  /** 严选实地认证 */
  selectedBadge?: boolean;
  /** certified=站内；amap=高德实景 */
  source?: 'certified' | 'amap';
  bookable?: boolean;
  amapPoiId?: string;
  tel?: string;
  services: { id?: string; name: string; price: number; duration: string }[];
  reviews: { user: string; score: number; text: string; date: string }[];
};

export const merchants: Merchant[] = [
  {
    id: 'm1',
    name: '暖爪宠物医院（静安店）',
    category: 'hospital',
    tags: ['医疗', '疫苗', '绝育'],
    creditScore: 92,
    rating: 4.9,
    reviewCount: 328,
    distanceKm: 1.2,
    inspectedAt: '2026.07.12',
    coverTone: 'linear-gradient(145deg,#0f8f82 0%,#1a9e8e 45%,#3d8fd4 100%)',
    address: '静安区南京西路1266号',
    openUntil: '21:00',
    priceLevel: '¥¥',
    highlight: '手术室与药品分柜通过实地核查',
    services: [
      { name: '基础体检', price: 128, duration: '30分钟' },
      { name: '猫三联疫苗', price: 168, duration: '20分钟' },
      { name: '绝育咨询', price: 0, duration: '15分钟' },
    ],
    reviews: [
      { user: '豆豆妈妈', score: 5, text: '医生很细致，候诊区干净，报告也能在 App 里看到。', date: '3天前' },
      { user: '奶茶家长', score: 5, text: '严选认证不是摆设，消毒记录齐全。', date: '1周前' },
    ],
  },
  {
    id: 'm2',
    name: '毛孩洗护美学馆',
    category: 'grooming',
    tags: ['洗护', '美容', 'SPA'],
    creditScore: 86,
    rating: 4.7,
    reviewCount: 156,
    distanceKm: 0.8,
    inspectedAt: '2026.06.28',
    coverTone: 'linear-gradient(145deg,#ff9a6a 0%,#ff8c5a 50%,#d4a03a 100%)',
    address: '静安区愚园路380号',
    openUntil: '20:30',
    priceLevel: '¥¥',
    highlight: '吹水间独立分区，噪声与通风达标',
    services: [
      { name: '基础洗护', price: 128, duration: '60分钟' },
      { name: '精致造型', price: 218, duration: '90分钟' },
    ],
    reviews: [
      { user: '可乐家长', score: 5, text: '洗完毛不打结，店员会提前确认皮肤敏感。', date: '昨天' },
    ],
  },
  {
    id: 'm3',
    name: '安心寄养小院',
    category: 'boarding',
    tags: ['寄养', '监控', '接送'],
    creditScore: 78,
    rating: 4.5,
    reviewCount: 89,
    distanceKm: 2.4,
    inspectedAt: '2026.05.16',
    coverTone: 'linear-gradient(145deg,#3da655 0%,#1a9e8e 70%)',
    address: '普陀区光复西路88号',
    openUntil: '22:00',
    priceLevel: '¥',
    highlight: '笼舍消毒记录完整，已要求整改垫料异味',
    services: [
      { name: '日托', price: 68, duration: '8小时' },
      { name: '寄养（晚）', price: 98, duration: '含监控' },
    ],
    reviews: [
      { user: '阿福爸爸', score: 4, text: '实时监控安心，晚上会发日常照片。', date: '5天前' },
    ],
  },
  {
    id: 'm4',
    name: '爪爪行为训练中心',
    category: 'training',
    tags: ['训练', '幼犬', '行为'],
    creditScore: 88,
    rating: 4.8,
    reviewCount: 112,
    distanceKm: 3.1,
    inspectedAt: '2026.07.02',
    coverTone: 'linear-gradient(145deg,#d4a03a 0%,#1a9e8e 90%)',
    address: '长宁区延安西路2099号',
    openUntil: '19:30',
    priceLevel: '¥¥¥',
    highlight: '训练师资质齐全，训练场地防滑达标',
    services: [
      { name: '幼犬启蒙课', price: 299, duration: '45分钟' },
      { name: '行为矫正评估', price: 199, duration: '40分钟' },
    ],
    reviews: [{ user: '圆圆', score: 5, text: '老师很有耐心，课后有训练计划。', date: '2周前' }],
  },
];

export const messages = [
  {
    id: '1',
    type: '系统',
    title: '欢迎来到宠伴',
    body: '每一家店，我们都替你看过。完成宠物档案可解锁更准推荐。',
    time: '刚刚',
    unread: true,
  },
  {
    id: '2',
    type: '系统',
    title: '考察通过通知',
    body: '「暖爪宠物医院」已完成实地复检，信用分更新为 92。',
    time: '昨天',
    unread: true,
  },
  {
    id: '3',
    type: '订单',
    title: '预约提醒',
    body: '明日 10:00「毛孩洗护美学馆」洗护预约即将开始。',
    time: '周一',
    unread: false,
  },
];

export function getMerchant(id: string) {
  return merchants.find((m) => m.id === id);
}
