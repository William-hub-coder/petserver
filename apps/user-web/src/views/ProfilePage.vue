<template>
  <div class="page me">
    <div class="hero">
      <header class="topbar">
        <button type="button" class="icon-btn" aria-label="设置" @click="menuTip = '设置与隐私可在下方服务区进入'">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <div class="top-actions">
          <button type="button" class="icon-btn" aria-label="消息" @click="emit('messages')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 7.5A2.5 2.5 0 017.5 5h9A2.5 2.5 0 0119 7.5v6A2.5 2.5 0 0116.5 16H11l-4 3v-3H7.5A2.5 2.5 0 015 13.5v-6z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            v-if="!user"
            type="button"
            class="login-pill"
            @click="showLogin = true"
          >
            登录
          </button>
          <button v-else type="button" class="login-pill ghost" @click="logout">退出</button>
        </div>
      </header>

      <section class="profile" @click="!user && (showLogin = true)">
        <div class="avatar-ring" :class="{ guest: !user }">
          <div class="avatar">{{ avatarText }}</div>
        </div>
        <div class="who">
          <div class="name-row">
            <strong>{{ user?.nickname || '点击登录' }}</strong>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="badges">
            <span class="badge teal">{{ user ? '宠伴会员' : '游客' }}</span>
            <button type="button" class="badge peach" @click.stop="openAddPetFlow">
              毛孩 {{ pets.length }} ›
            </button>
          </div>
          <p v-if="user" class="phone">{{ maskedPhone }}</p>
        </div>
      </section>

      <div class="asset-bar">
        <button type="button" class="asset" @click="emit('orders')">
          <span class="asset-ico mint" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="4" width="14" height="16" rx="2.5" stroke="currentColor" stroke-width="1.7" />
              <path d="M8.5 9h7M8.5 13h7M8.5 17h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </span>
          <span class="asset-txt">预约 <b>{{ bookingCount }}</b></span>
        </button>
        <i class="asset-sep" aria-hidden="true" />
        <button type="button" class="asset" @click="emit('shop-orders')">
          <span class="asset-ico peach" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 8h12l-.8 11a1.5 1.5 0 01-1.5 1.4H8.3a1.5 1.5 0 01-1.5-1.4L6 8z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path d="M9 8V6.5a3 3 0 016 0V8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </span>
          <span class="asset-txt">商城 <b>{{ shopOrderCount }}</b></span>
        </button>
      </div>
    </div>

    <!-- 订单状态（预约 + 商城） -->
    <section class="card">
      <div class="card-hd">
        <h2>订单</h2>
        <button type="button" class="more" @click="emit('orders')">全部 ›</button>
      </div>
      <div class="order-grid">
        <button
          v-for="item in orderEntries"
          :key="item.key"
          type="button"
          class="order-item pressable"
          @click="item.go()"
        >
          <span class="order-ico" aria-hidden="true" v-html="item.icon" />
          <span>{{ item.label }}</span>
          <em v-if="item.count > 0" class="dot">{{ item.count > 9 ? '9+' : item.count }}</em>
        </button>
      </div>
    </section>

    <!-- 我的毛孩：全品类档案 -->
    <section class="card">
      <div class="card-hd">
        <h2>我的毛孩</h2>
        <button type="button" class="more" @click="openAddPetFlow">添加 ›</button>
      </div>
      <p class="pet-scope">猫狗 · 飞禽 · 爬宠 · 小宠 · 水族等合法饲养均可建档</p>
      <div v-if="pets.length" class="pet-row">
        <button
          v-for="p in pets"
          :key="p.id"
          type="button"
          class="pet-card pressable"
          @click="openEditPet(p)"
        >
          <span class="pet-face" :class="p.type">{{ petMark(p.type) }}</span>
          <span class="pet-meta">
            <strong>{{ p.name }}</strong>
            <small>{{ petTypeLabel(p.type) }}{{ p.breed ? ` · ${p.breed}` : '' }}</small>
          </span>
        </button>
        <button type="button" class="pet-card add pressable" @click="openAddPetFlow">
          <span class="add-plus">＋</span>
          <span class="pet-meta">
            <strong>添加</strong>
            <small>完善档案</small>
          </span>
        </button>
      </div>
      <div v-else class="mini-grid">
        <button type="button" class="mini pressable" @click="openAddPetFlow">
          <span>
            <strong>添加档案</strong>
            <em>猫狗爬宠飞禽都支持</em>
          </span>
          <span class="mini-dot rose" aria-hidden="true" />
        </button>
        <button type="button" class="mini pressable" @click="emit('go-tab', 2)">
          <span>
            <strong>AI 助手</strong>
            <em>问养宠问题</em>
          </span>
          <span class="mini-dot mint" aria-hidden="true" />
        </button>
        <button type="button" class="mini pressable" @click="emit('go-tab', 1)">
          <span>
            <strong>附近严选</strong>
            <em>找可信门店</em>
          </span>
          <span class="mini-dot sand" aria-hidden="true" />
        </button>
      </div>
    </section>

    <!-- 快捷双入口 -->
    <section class="card twin-card">
      <button type="button" class="twin pressable" @click="emit('mall')">
        <span>
          <strong>严选商城</strong>
          <em>口粮玩具一站购 ›</em>
        </span>
        <span class="twin-ico peach" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M4.5 7.2L5.5 4.5h13l1 2.7V9a2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0V7.2zM6.5 14.5h11V19h-11v-4.5z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
      <button type="button" class="twin pressable" @click="emit('adopt')">
        <span>
          <strong>领养 / 售宠</strong>
          <em>附近靠谱信息 ›</em>
        </span>
        <span class="twin-ico mint" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="15" rx="4" ry="3.4" fill="currentColor" />
            <circle cx="7.4" cy="9.6" r="2" fill="currentColor" />
            <circle cx="10.8" cy="8" r="2" fill="currentColor" />
            <circle cx="14.4" cy="8" r="2" fill="currentColor" />
            <circle cx="17.2" cy="10" r="1.9" fill="currentColor" />
          </svg>
        </span>
      </button>
    </section>

    <!-- 服务宫格 -->
    <section class="card">
      <div class="card-hd">
        <h2>服务</h2>
      </div>
      <div class="svc-grid">
        <button
          v-for="s in services"
          :key="s.key"
          type="button"
          class="svc pressable"
          @click="s.go()"
        >
          <span class="svc-ico" :class="s.tone" aria-hidden="true" v-html="s.icon" />
          <span>{{ s.label }}</span>
        </button>
      </div>
    </section>

    <p class="foot">每一家店，我们都替你看过</p>
    <p v-if="menuTip" class="foot tip-line">{{ menuTip }}</p>

    <Transition name="modal-fade">
      <div v-if="showLogin" key="login" class="modal" @click.self="showLogin = false">
        <div class="panel">
          <h3>手机号登录</h3>
          <input v-model="phone" class="input" maxlength="11" placeholder="手机号" />
          <div class="code-row">
            <input v-model="code" class="input" placeholder="验证码（开发环境 123456）" />
            <button type="button" class="btn-code" @click="sendCode">获取</button>
          </div>
          <p v-if="tip" class="tip">{{ tip }}</p>
          <button type="button" class="btn-accent full" @click="doLogin">登录</button>
          <button type="button" class="link" @click="showLogin = false">取消</button>
        </div>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showPet" key="pet" class="modal" @click.self="closePetModal">
        <div class="panel pet-panel">
          <h3>{{ editingPetId ? '编辑档案' : '添加宠物档案' }}</h3>
          <p class="pet-tip">{{ activeSpecies.careTip }} · 请只登记合法可养物种</p>

          <label class="field">
            <span>昵称</span>
            <input v-model="petForm.name" class="input" placeholder="怎么称呼它" maxlength="20" />
          </label>

          <label class="field">
            <span>品类</span>
            <div class="type-grid">
              <button
                v-for="s in PET_SPECIES"
                :key="s.code"
                type="button"
                class="type-chip"
                :class="{ on: petForm.type === s.code }"
                @click="petForm.type = s.code"
              >
                <em>{{ s.mark }}</em>
                {{ s.label }}
              </button>
            </div>
          </label>

          <label class="field">
            <span>品种 / 物种细类</span>
            <input
              v-model="petForm.breed"
              class="input"
              list="breed-hints"
              :placeholder="activeSpecies.breedHints[0] || '如：豹纹守宫'"
            />
            <datalist id="breed-hints">
              <option v-for="h in activeSpecies.breedHints" :key="h" :value="h" />
            </datalist>
          </label>

          <div class="field-row">
            <label class="field">
              <span>性别</span>
              <select v-model="petForm.gender" class="input">
                <option v-for="g in PET_GENDERS" :key="g.code" :value="g.code">{{ g.label }}</option>
              </select>
            </label>
            <label class="field">
              <span>来源</span>
              <select v-model="petForm.adoptionSource" class="input">
                <option value="">未填写</option>
                <option v-for="s in PET_SOURCES" :key="s.code" :value="s.code">{{ s.label }}</option>
              </select>
            </label>
          </div>

          <div class="field-row">
            <label class="field">
              <span>生日 / 入家日</span>
              <input v-model="petForm.birthday" class="input" type="date" />
            </label>
            <label class="field">
              <span>体重 (kg)</span>
              <input
                v-model.number="petForm.weightKg"
                class="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="可选"
              />
            </label>
          </div>

          <div class="checks">
            <label class="check">
              <input v-model="petForm.vaccinated" type="checkbox" />
              已按医嘱完成关键免疫/检疫
            </label>
            <label v-if="activeSpecies.sterilizeCommon" class="check">
              <input v-model="petForm.sterilized" type="checkbox" />
              已绝育
            </label>
          </div>

          <label class="field">
            <span>饮食要点</span>
            <textarea
              v-model="petForm.dietNote"
              class="input area"
              rows="2"
              placeholder="主粮品牌、喂食频率、禁食清单…"
            />
          </label>
          <label class="field">
            <span>饲养环境</span>
            <textarea
              v-model="petForm.habitatNote"
              class="input area"
              rows="2"
              placeholder="笼箱尺寸、温湿度、UVB、过滤系统…"
            />
          </label>
          <label class="field">
            <span>特殊需求</span>
            <textarea
              v-model="petForm.specialNeeds"
              class="input area"
              rows="2"
              placeholder="用药、分离焦虑、不可混养…"
            />
          </label>
          <label class="field">
            <span>备注</span>
            <textarea
              v-model="petForm.notes"
              class="input area"
              rows="2"
              placeholder="性格、应激习惯、寄养注意事项…"
            />
          </label>

          <p v-if="tip" class="tip">{{ tip }}</p>
          <button type="button" class="btn-primary full" :disabled="petSaving" @click="savePet">
            {{ petSaving ? '保存中…' : '保存档案' }}
          </button>
          <button
            v-if="editingPetId"
            type="button"
            class="link danger"
            :disabled="petSaving"
            @click="removePet"
          >
            删除此档案
          </button>
          <button type="button" class="link" @click="closePetModal">取消</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  api,
  clearAuth,
  getStoredUser,
  getToken,
  mergeAiSessionAfterLogin,
  saveAuth,
  type ApiUser,
} from '../api';
import {
  PET_GENDERS,
  PET_SOURCES,
  PET_SPECIES,
  petSpeciesOf,
  type UserPet,
} from '../lib/pet-species';

const props = defineProps<{ addPetTick?: number }>();
const emit = defineEmits<{
  orders: [];
  mall: [];
  'shop-orders': [];
  messages: [];
  medical: [];
  care: [];
  adopt: [];
  map: [];
  'go-tab': [number];
}>();

const user = ref<ApiUser | null>(getStoredUser());
const pets = ref<UserPet[]>([]);
const bookingCount = ref('0');
const shopOrderCount = ref('0');
const pendingBookings = ref(0);
const activeBookings = ref(0);
const reviewBookings = ref(0);
const shopPending = ref(0);
const shopShip = ref(0);

const showLogin = ref(false);
const showPet = ref(false);
const pendingAddPet = ref(false);
const phone = ref('13800000001');
const code = ref('123456');
const tip = ref('');
const menuTip = ref('');
const editingPetId = ref<string | null>(null);
const petSaving = ref(false);
const petForm = ref({
  name: '',
  type: 'cat',
  breed: '',
  gender: 'unknown',
  adoptionSource: '',
  birthday: '',
  weightKg: null as number | null,
  vaccinated: false,
  sterilized: false,
  dietNote: '',
  habitatNote: '',
  specialNeeds: '',
  notes: '',
});

const activeSpecies = computed(() => petSpeciesOf(petForm.value.type));

const avatarText = computed(() => {
  const n = user.value?.nickname?.trim();
  if (n) return n.slice(0, 1);
  return '宠';
});

const maskedPhone = computed(() => {
  const p = user.value?.phone || '';
  if (p.length < 7) return p;
  return `${p.slice(0, 3)}****${p.slice(-4)}`;
});

const ico = {
  wallet: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="17" height="12.5" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 10h17" stroke="currentColor" stroke-width="1.6"/><circle cx="16.5" cy="14" r="1.2" fill="currentColor"/></svg>`,
  box: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 8.5L12 4l8 4.5v7L12 20l-8-4.5v-7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 12v8M4 8.5l8 3.5 8-3.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  truck: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3V7zM14 10h4.2L21 13.2V16h-7v-6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.6" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="17.5" r="1.6" stroke="currentColor" stroke-width="1.5"/></svg>`,
  star: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 4.5l2.2 4.5 5 .7-3.6 3.5.9 5L12 15.8 7.5 18.2l.9-5L4.8 9.7l5-.7L12 4.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  refund: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5v5l3 1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 9.5H6.2A7 7 0 0012 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};

const orderEntries = computed(() => [
  {
    key: 'pending',
    label: '待确认',
    count: pendingBookings.value,
    icon: ico.wallet,
    go: () => emit('orders'),
  },
  {
    key: 'service',
    label: '待服务',
    count: activeBookings.value,
    icon: ico.box,
    go: () => emit('orders'),
  },
  {
    key: 'ship',
    label: '待收货',
    count: shopShip.value,
    icon: ico.truck,
    go: () => emit('shop-orders'),
  },
  {
    key: 'review',
    label: '待评价',
    count: reviewBookings.value,
    icon: ico.star,
    go: () => emit('orders'),
  },
  {
    key: 'after',
    label: '售后',
    count: shopPending.value,
    icon: ico.refund,
    go: () => emit('shop-orders'),
  },
]);

const svcIcon = {
  booking: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="3.5" width="16" height="17" rx="3" stroke="#fff" stroke-width="1.7"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  shop: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 8h12l-.8 11.2a1.5 1.5 0 01-1.5 1.3H8.3a1.5 1.5 0 01-1.5-1.3L6 8z" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 8V6.5a3 3 0 016 0V8" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  medical: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="4" stroke="#fff" stroke-width="1.7"/><path d="M12 8v8M8 12h8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  care: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 10.5c0-2.5 2-4.5 4.5-4.5 1.4 0 2.6.6 3.5 1.6C13 6.6 14.2 6 15.5 6 18 6 20 8 20 10.5c0 4.2-6.2 7.8-8 8.7-1.8-.9-8-4.5-8-8.7z" fill="#fff"/></svg>`,
  adopt: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="15.2" rx="4.2" ry="3.6" fill="#fff"/><circle cx="7.2" cy="9.8" r="2.1" fill="#fff"/><circle cx="10.6" cy="8.2" r="2.1" fill="#fff"/><circle cx="14.2" cy="8.2" r="2.1" fill="#fff"/><circle cx="17.2" cy="10.2" r="2" fill="#fff"/></svg>`,
  map: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" stroke="#fff" stroke-width="1.7"/><circle cx="12" cy="11" r="2.2" fill="#fff"/></svg>`,
  msg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 7.5A2.5 2.5 0 017.5 5h9A2.5 2.5 0 0119 7.5v6A2.5 2.5 0 0116.5 16H11l-4 3v-3H7.5A2.5 2.5 0 015 13.5v-6z" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  ai: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7.5" stroke="#fff" stroke-width="1.7"/><path d="M9 13.5c.8 1 1.8 1.5 3 1.5s2.2-.5 3-1.5M9.5 10h.01M14.5 10h.01" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>`,
};

const services = computed(() => [
  { key: 'orders', label: '预约订单', tone: 'c1', icon: svcIcon.booking, go: () => emit('orders') },
  { key: 'shop-orders', label: '商城订单', tone: 'c2', icon: svcIcon.shop, go: () => emit('shop-orders') },
  { key: 'medical', label: '医疗问诊', tone: 'c3', icon: svcIcon.medical, go: () => emit('medical') },
  { key: 'care', label: '上门寄养', tone: 'c4', icon: svcIcon.care, go: () => emit('care') },
  { key: 'adopt', label: '领养售宠', tone: 'c5', icon: svcIcon.adopt, go: () => emit('adopt') },
  { key: 'map', label: '附近地图', tone: 'c6', icon: svcIcon.map, go: () => emit('map') },
  { key: 'msg', label: '消息中心', tone: 'c7', icon: svcIcon.msg, go: () => emit('messages') },
  { key: 'ai', label: 'AI 助手', tone: 'c8', icon: svcIcon.ai, go: () => emit('go-tab', 2) },
]);

function petMark(type: string) {
  return petSpeciesOf(type).mark;
}

function petTypeLabel(type: string) {
  return petSpeciesOf(type).label;
}

function resetPetForm() {
  editingPetId.value = null;
  petForm.value = {
    name: '',
    type: 'cat',
    breed: '',
    gender: 'unknown',
    adoptionSource: '',
    birthday: '',
    weightKg: null,
    vaccinated: false,
    sterilized: false,
    dietNote: '',
    habitatNote: '',
    specialNeeds: '',
    notes: '',
  };
}

function closePetModal() {
  showPet.value = false;
  tip.value = '';
  resetPetForm();
}

function openEditPet(p: UserPet) {
  if (!getToken()) {
    showLogin.value = true;
    tip.value = '登录后即可管理宠物档案';
    return;
  }
  editingPetId.value = p.id;
  petForm.value = {
    name: p.name || '',
    type: p.type || 'other',
    breed: p.breed || '',
    gender: p.gender || 'unknown',
    adoptionSource: p.adoptionSource || '',
    birthday: p.birthday || '',
    weightKg: p.weightKg ?? null,
    vaccinated: !!p.vaccinated,
    sterilized: !!p.sterilized,
    dietNote: p.dietNote || '',
    habitatNote: p.habitatNote || '',
    specialNeeds: p.specialNeeds || '',
    notes: p.notes || '',
  };
  tip.value = '';
  showPet.value = true;
}

async function refresh() {
  if (!getToken()) return;
  try {
    const me = await api.me();
    user.value = { id: me.id, phone: me.phone, nickname: me.nickname, role: me.role };
    pets.value = me.pets;
    const bookings = await api.bookings();
    bookingCount.value = String(bookings.length);
    pendingBookings.value = bookings.filter((b) => b.status === 'pending').length;
    activeBookings.value = bookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'pending',
    ).length;
    reviewBookings.value = bookings.filter((b) => b.status === 'verified').length;
    try {
      const orders = await api.shopOrders();
      shopOrderCount.value = String(orders?.length ?? 0);
      shopShip.value = (orders || []).filter((o) =>
        /ship|发货|配送|transit|deliver/i.test(`${o.status} ${o.statusLabel || ''}`),
      ).length;
      shopPending.value = (orders || []).filter((o) =>
        /pay|pending|待付|取消|refund|退/i.test(`${o.status} ${o.statusLabel || ''}`),
      ).length;
    } catch {
      /* optional */
    }
  } catch {
    /* ignore */
  }
}

onMounted(refresh);

function openAddPetFlow() {
  if (!getToken()) {
    pendingAddPet.value = true;
    showLogin.value = true;
    tip.value = '登录后即可添加宠物档案';
    return;
  }
  resetPetForm();
  tip.value = '';
  showPet.value = true;
}

watch(
  () => props.addPetTick,
  (tick, prev) => {
    if (!tick || tick === prev) return;
    openAddPetFlow();
  },
);

async function sendCode() {
  tip.value = '';
  try {
    await api.sendSms(phone.value);
    tip.value = '验证码已发送（开发环境固定 123456）';
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '发送失败';
  }
}

async function doLogin() {
  tip.value = '';
  try {
    const data = await api.login(phone.value, code.value);
    saveAuth(data);
    user.value = data.user;
    showLogin.value = false;
    await mergeAiSessionAfterLogin();
    await refresh();
    if (pendingAddPet.value) {
      pendingAddPet.value = false;
      resetPetForm();
      showPet.value = true;
    }
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '登录失败';
  }
}

function logout() {
  clearAuth();
  user.value = null;
  pets.value = [];
  bookingCount.value = '0';
  shopOrderCount.value = '0';
  pendingBookings.value = 0;
  activeBookings.value = 0;
  reviewBookings.value = 0;
  shopPending.value = 0;
  shopShip.value = 0;
}

function petPayload() {
  const f = petForm.value;
  return {
    name: f.name.trim(),
    type: f.type,
    breed: f.breed.trim() || null,
    gender: f.gender || 'unknown',
    adoptionSource: f.adoptionSource || null,
    birthday: f.birthday || null,
    weightKg: f.weightKg == null || Number.isNaN(f.weightKg) ? null : Number(f.weightKg),
    vaccinated: f.vaccinated,
    sterilized: activeSpecies.value.sterilizeCommon ? f.sterilized : false,
    dietNote: f.dietNote.trim() || null,
    habitatNote: f.habitatNote.trim() || null,
    specialNeeds: f.specialNeeds.trim() || null,
    notes: f.notes.trim() || null,
  };
}

async function savePet() {
  tip.value = '';
  if (!getToken()) {
    tip.value = '请先登录';
    return;
  }
  if (!petForm.value.name.trim()) {
    tip.value = '请填写昵称';
    return;
  }
  petSaving.value = true;
  try {
    const body = petPayload();
    if (editingPetId.value) {
      await api.updatePet(editingPetId.value, body);
    } else {
      await api.createPet(body);
    }
    closePetModal();
    await refresh();
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '保存失败';
  } finally {
    petSaving.value = false;
  }
}

async function removePet() {
  if (!editingPetId.value) return;
  if (!window.confirm('确定删除这份档案？删除后可重新添加。')) return;
  petSaving.value = true;
  tip.value = '';
  try {
    await api.deletePet(editingPetId.value);
    closePetModal();
    await refresh();
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '删除失败';
  } finally {
    petSaving.value = false;
  }
}
</script>

<style scoped>
.me {
  padding-top: 0;
  /* 中间凸起 AI 按钮更高，多留一点以免服务区被底栏挡住 */
  padding-bottom: calc(var(--tabbar-height, 64px) + env(safe-area-inset-bottom, 18px) + 36px);
  background: #f5f6f8;
  min-height: 100%;
  box-sizing: border-box;
}

.hero {
  position: relative;
  padding: calc(8px + env(safe-area-inset-top)) 16px 20px;
  background:
    radial-gradient(120% 80% at 70% -10%, rgba(255, 186, 140, 0.55), transparent 55%),
    linear-gradient(180deg, #ffe8d6 0%, #fff5ee 42%, #f5f6f8 100%);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.icon-btn {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #2a2a2a;
  display: grid;
  place-items: center;
}
.login-pill {
  border: 0;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  background: #1f1f1f;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.login-pill.ghost {
  background: rgba(255, 255, 255, 0.72);
  color: #666;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.profile {
  display: flex;
  align-items: center;
  gap: 14px;
  animation: rise 0.4s ease both;
}
.avatar-ring {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(145deg, #ffb48a, #ffd9b8 50%, #7ad4c8);
  flex-shrink: 0;
  box-shadow: 0 8px 20px rgba(255, 140, 90, 0.2);
}
.avatar-ring.guest {
  background: linear-gradient(145deg, #ddd, #eee);
  box-shadow: none;
}
.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 26px;
  font-weight: 750;
  color: #14756b;
  background: linear-gradient(160deg, #fff, #eef8f6);
  border: 2px solid #fff;
}
.who {
  min-width: 0;
  flex: 1;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #1a1a1a;
}
.name-row strong {
  font-size: 20px;
  font-weight: 750;
  letter-spacing: -0.02em;
}
.name-row svg {
  color: #999;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.badge {
  display: inline-flex;
  align-items: center;
  border: 0;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}
.badge.teal {
  background: #e7f6f3;
  color: #14756b;
}
.badge.peach {
  background: #ffe8d4;
  color: #c25a20;
  cursor: pointer;
}
.phone {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8a8a8a;
}

.asset-bar {
  margin-top: 16px;
  display: flex;
  align-items: center;
  padding: 12px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 18px rgba(40, 30, 20, 0.04);
  animation: rise 0.45s 0.05s ease both;
}
.asset {
  flex: 1;
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px;
}
.asset-ico {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}
.asset-ico.mint {
  background: #e8f7f3;
  color: #14756b;
}
.asset-ico.peach {
  background: #fff0e4;
  color: #d96a3a;
}
.asset-txt {
  font-size: 14px;
  color: #444;
  font-weight: 600;
}
.asset-txt b {
  margin-left: 2px;
  font-weight: 750;
  color: #1a1a1a;
  font-variant-numeric: tabular-nums;
}
.asset-sep {
  width: 1px;
  height: 22px;
  background: rgba(0, 0, 0, 0.08);
}

.card {
  margin: 12px 12px 0;
  padding: 14px 14px 12px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(20, 20, 30, 0.04);
  animation: rise 0.45s 0.08s ease both;
}
.card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.card-hd h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 750;
  color: #1a1a1a;
}
.more {
  border: 0;
  background: transparent;
  font-size: 12px;
  color: #999;
  font-weight: 600;
  padding: 4px 0;
}

.order-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
}
.order-item {
  position: relative;
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px 0 4px;
  font-size: 11px;
  color: #444;
  font-weight: 600;
}
.order-ico {
  width: 28px;
  height: 28px;
  color: #333;
  display: grid;
  place-items: center;
}
.order-ico :deep(svg) {
  display: block;
}
.dot {
  position: absolute;
  top: 0;
  right: 10%;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #e85d4c;
  color: #fff;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
  display: grid;
  place-items: center;
  line-height: 1;
}

.pet-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}
.pet-row::-webkit-scrollbar {
  display: none;
}
.pet-card {
  flex: 0 0 auto;
  min-width: 128px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 0;
  border-radius: 14px;
  background: #f7f8fa;
  text-align: left;
}
.pet-card.add {
  background: #eef8f6;
}
.pet-face {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 750;
  background: #fff;
  color: #14756b;
  flex-shrink: 0;
}
.pet-scope {
  margin: -4px 0 12px;
  font-size: 11px;
  color: #8a9794;
  font-weight: 550;
}
.pet-face.cat {
  color: #c45b6a;
  background: #fff0f3;
}
.pet-face.dog {
  color: #9a6b3a;
  background: #fff6eb;
}
.pet-face.bird {
  color: #2f7d9c;
  background: #e8f5fa;
}
.pet-face.reptile {
  color: #3d8f5a;
  background: #e8f6ec;
}
.pet-face.amphibian {
  color: #4a7c59;
  background: #eaf3ec;
}
.pet-face.small_mammal {
  color: #b07a3a;
  background: #fff4e8;
}
.pet-face.aquatic {
  color: #2b6ea8;
  background: #e8f1fb;
}
.pet-face.other {
  color: #14756b;
  background: #e8f7f3;
}
.add-plus {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #fff;
  color: #14756b;
  font-size: 22px;
  font-weight: 500;
  flex-shrink: 0;
}
.pet-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.pet-meta strong {
  font-size: 14px;
  font-weight: 750;
  color: #1a1a1a;
}
.pet-meta small {
  font-size: 11px;
  color: #999;
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.mini {
  border: 0;
  border-radius: 12px;
  background: #f7f8fa;
  padding: 12px 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
  text-align: left;
  min-height: 72px;
}
.mini strong {
  display: block;
  font-size: 13px;
  font-weight: 750;
  color: #1a1a1a;
}
.mini em {
  display: block;
  margin-top: 4px;
  font-style: normal;
  font-size: 10px;
  color: #999;
  line-height: 1.3;
}
.mini-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}
.mini-dot.rose {
  background: #e85d74;
}
.mini-dot.mint {
  background: #2bb8a6;
}
.mini-dot.sand {
  background: #f0a020;
}

.twin-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
}
.twin {
  border: 0;
  border-radius: 14px;
  background: #f7f8fa;
  padding: 14px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  min-height: 76px;
}
.twin strong {
  display: block;
  font-size: 14px;
  font-weight: 750;
  color: #1a1a1a;
}
.twin em {
  display: block;
  margin-top: 4px;
  font-style: normal;
  font-size: 11px;
  color: #999;
}
.twin-ico {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.twin-ico.peach {
  background: #fff0e4;
  color: #d96a3a;
}
.twin-ico.mint {
  background: #e8f7f3;
  color: #14756b;
}

.svc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 6px;
  padding-bottom: 4px;
}
.svc {
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 650;
  color: #333;
  padding: 0;
}
.svc-ico {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
}
.svc-ico.c1 {
  background: linear-gradient(145deg, #2bb8a6, #1a9e8e);
}
.svc-ico.c2 {
  background: linear-gradient(145deg, #ff9a6b, #f07840);
}
.svc-ico.c3 {
  background: linear-gradient(145deg, #6bb8ff, #4a9ae8);
}
.svc-ico.c4 {
  background: linear-gradient(145deg, #ff8a9a, #e85d74);
}
.svc-ico.c5 {
  background: linear-gradient(145deg, #ffc15e, #f0a020);
}
.svc-ico.c6 {
  background: linear-gradient(145deg, #5ecfc0, #2bb8a6);
}
.svc-ico.c7 {
  background: linear-gradient(145deg, #6ec6ff, #3aa0e8);
}
.svc-ico.c8 {
  background: linear-gradient(145deg, #ff8a6b, #e86a4a);
}

.foot {
  margin: 18px 16px 0;
  text-align: center;
  font-size: 12px;
  color: #b0b0b0;
}
.tip-line {
  margin-top: 6px;
  color: #c25a20;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: grid;
  place-items: end center;
  z-index: 90;
}
.panel {
  width: min(100%, var(--page-max-width, 430px));
  background: #fff;
  border-radius: 22px 22px 0 0;
  padding: 22px 16px calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
}
.pet-panel {
  max-height: min(88vh, 720px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.panel h3 {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 750;
}
.pet-tip {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.45;
  color: #7a8b88;
}
.field {
  display: block;
  margin-bottom: 10px;
}
.field > span {
  display: block;
  font-size: 12px;
  font-weight: 650;
  color: #5a6b68;
  margin-bottom: 4px;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.type-chip {
  border: 1px solid #e5ebe9;
  border-radius: 12px;
  background: #f7f8fa;
  padding: 8px 4px;
  font-size: 11px;
  font-weight: 650;
  color: #5a6b68;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.type-chip em {
  font-style: normal;
  font-size: 13px;
  font-weight: 750;
  color: #14756b;
}
.type-chip.on {
  background: #e6f6f2;
  border-color: rgba(26, 158, 142, 0.35);
  color: #14756b;
}
.checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0 12px;
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #444;
  font-weight: 550;
}
.input {
  width: 100%;
  height: 46px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 0 14px;
  margin: 0;
  box-sizing: border-box;
  background: #f7f8fa;
  font-size: 15px;
}
.input.area {
  height: auto;
  min-height: 64px;
  padding: 10px 14px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.4;
}
.link.danger {
  color: #e85d4c;
}
.code-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}
.btn-code {
  height: 46px;
  border: 0;
  border-radius: 999px;
  padding: 0 16px;
  background: #e8f7f3;
  color: #14756b;
  font-weight: 700;
}
.full {
  width: 100%;
  margin-top: 10px;
}
.link {
  width: 100%;
  margin-top: 8px;
  border: 0;
  background: transparent;
  color: #888;
  min-height: 40px;
}
.tip {
  color: #e85d4c;
  font-size: 13px;
  margin: 4px 0 0;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
