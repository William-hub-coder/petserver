/** 前端宠物品类目录（与 packages/shared/src/pets.ts 对齐） */
export const PET_TYPE_CODES = [
  'cat',
  'dog',
  'bird',
  'reptile',
  'amphibian',
  'small_mammal',
  'aquatic',
  'other',
] as const;

export type PetTypeCode = (typeof PET_TYPE_CODES)[number];

export type PetSpeciesDef = {
  code: PetTypeCode;
  label: string;
  listingLabel: string;
  mark: string;
  breedHints: string[];
  sterilizeCommon: boolean;
  careTip: string;
};

export const PET_SPECIES: PetSpeciesDef[] = [
  {
    code: 'cat',
    label: '猫',
    listingLabel: '猫',
    mark: '猫',
    breedHints: ['英短', '美短', '布偶', '橘猫', '狸花', '暹罗', '无品种'],
    sterilizeCommon: true,
    careTip: '疫苗、驱虫、绝育与室内环境是重点',
  },
  {
    code: 'dog',
    label: '狗',
    listingLabel: '狗',
    mark: '犬',
    breedHints: ['柯基', '边牧', '泰迪', '金毛', '柴犬', '中华田园犬', '无品种'],
    sterilizeCommon: true,
    careTip: '疫苗、驱虫、运动量与社会化训练',
  },
  {
    code: 'bird',
    label: '飞禽',
    listingLabel: '飞禽',
    mark: '鸟',
    breedHints: ['虎皮鹦鹉', '玄凤', '牡丹鹦鹉', '文鸟', '金丝雀', '鸽子', '其他合法鸟类'],
    sterilizeCommon: false,
    careTip: '注意合法物种、笼具通风、营养与噪音管理',
  },
  {
    code: 'reptile',
    label: '爬宠',
    listingLabel: '爬宠',
    mark: '爬',
    breedHints: ['豹纹守宫', '鬃狮蜥', '玉米蛇', '球蟒', '苏卡达陆龟', '红耳龟', '其他合法爬宠'],
    sterilizeCommon: false,
    careTip: '温湿度、UVB/加热与垫材比「撸一撸」更关键',
  },
  {
    code: 'amphibian',
    label: '两栖',
    listingLabel: '两栖',
    mark: '两',
    breedHints: ['角蛙', '火蜥蜴', '爪蟾', '其他合法两栖'],
    sterilizeCommon: false,
    careTip: '水质/湿度与皮肤敏感，少直接用手抓握',
  },
  {
    code: 'small_mammal',
    label: '小宠',
    listingLabel: '小宠',
    mark: '小',
    breedHints: ['仓鼠', '荷兰猪', '兔子', '龙猫', '松鼠', '雪貂', '其他合法小宠'],
    sterilizeCommon: true,
    careTip: '笼具空间、咀嚼物与昼夜习性要匹配',
  },
  {
    code: 'aquatic',
    label: '水族',
    listingLabel: '水族',
    mark: '水',
    breedHints: ['金鱼', '锦鲤', '斗鱼', '神仙鱼', '虾蟹螺', '其他观赏鱼'],
    sterilizeCommon: false,
    careTip: '水质循环、温控与混养兼容性优先',
  },
  {
    code: 'other',
    label: '其他',
    listingLabel: '其他',
    mark: '宠',
    breedHints: ['请注明具体物种（须合法可养）'],
    sterilizeCommon: false,
    careTip: '请确认当地合法饲养规定后再建档',
  },
];

export const PET_GENDERS = [
  { code: 'unknown', label: '未知' },
  { code: 'male', label: '公' },
  { code: 'female', label: '母' },
] as const;

export const PET_SOURCES = [
  { code: 'rescued', label: '救助/领养' },
  { code: 'purchased', label: '购买' },
  { code: 'gifted', label: '赠送' },
  { code: 'bred', label: '自家繁育' },
  { code: 'other', label: '其他' },
] as const;

export function petSpeciesOf(code: string | undefined | null): PetSpeciesDef {
  return PET_SPECIES.find((s) => s.code === code) || PET_SPECIES[PET_SPECIES.length - 1]!;
}

export function listingSpeciesFilters(): string[] {
  return ['全部', ...PET_SPECIES.filter((s) => s.code !== 'other').map((s) => s.listingLabel)];
}

export type UserPet = {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  gender?: string | null;
  birthday?: string | null;
  weightKg?: number | null;
  sterilized?: boolean;
  vaccinated?: boolean;
  dietNote?: string | null;
  habitatNote?: string | null;
  specialNeeds?: string | null;
  notes?: string | null;
  adoptionSource?: string | null;
  avatarUrl?: string | null;
};
