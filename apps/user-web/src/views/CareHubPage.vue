<!--
  上门和寄养服务（首页「上门寄养」→ overlay=care）
  寄养：merchants?category=boarding → 到店预约
  上门：service-catalog?kind=home_visit → address + note 下单
-->
<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>上门和寄养服务</h1>
    </header>

    <section class="hero">
      <p class="brand">宠伴 · 照护</p>
      <h2>寄养托管 · 上门照护</h2>
      <p>出差加班也能安心：到店寄养，或上门喂食、遛宠、换垫材/猫砂、照料笼箱与鱼缸。</p>
    </section>

    <div class="tabs">
      <button type="button" :class="{ on: tab === 'boarding' }" @click="tab = 'boarding'">寄养服务</button>
      <button type="button" :class="{ on: tab === 'home' }" @click="tab = 'home'">上门服务</button>
    </div>

    <Transition name="panel-fade" mode="out-in">
      <div v-if="tab === 'boarding'" key="boarding" class="body">
        <p class="hint">严选寄养机构，含监控与日常反馈；到店预约后出示核销码。</p>
        <p v-if="loadingBoard">加载中…</p>
        <article
          v-for="m in boarding"
          :key="m.id"
          class="card item pressable"
          @click="$emit('open-merchant', m.id)"
        >
          <div class="top">
            <strong>{{ m.name }}</strong>
            <span class="dist">{{ m.distanceKm || '-' }}km</span>
          </div>
          <p class="shop">★ {{ m.rating }} · 信用分 {{ m.creditScore }}</p>
          <p class="desc">{{ m.highlight || m.address }}</p>
          <button type="button" class="btn" @click.stop="$emit('open-merchant', m.id)">预约寄养</button>
        </article>
        <p v-if="!loadingBoard && !boarding.length" class="empty">暂无寄养门店</p>
      </div>

      <div v-else key="home" class="body">
        <div class="chips">
          <button
            v-for="c in chips"
            :key="c"
            type="button"
            :class="{ on: chip === c }"
            @click="chip = c"
          >
            {{ c }}
          </button>
        </div>
        <p v-if="loadingHome">加载中…</p>
        <article v-for="s in filteredHome" :key="s.id" class="card item">
          <div class="top">
            <strong>{{ s.name }}</strong>
            <span>¥{{ s.price }}</span>
          </div>
          <p class="shop">{{ s.merchantName }} · {{ s.duration }}</p>
          <p class="desc">{{ s.description }}</p>
          <button type="button" class="btn" @click="pick(s)">预约上门</button>
        </article>
        <p v-if="!loadingHome && !filteredHome.length" class="empty">暂无匹配服务</p>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="current" key="sheet" class="sheet">
        <div class="panel">
          <h3>预约「{{ current.name }}」</h3>
          <label>上门时段</label>
          <select v-model="bookingAt">
            <option v-for="slot in slots" :key="slot.datetime" :value="slot.datetime">
              {{ slot.period }} {{ slot.time }}
            </option>
          </select>
          <label>上门地址（必填）</label>
          <input v-model="address" class="input" placeholder="小区门牌 / 备注门禁" />
          <label>备注（饲喂说明、钥匙交接等）</label>
          <textarea v-model="note" rows="3" placeholder="例如：粮在厨房第二层…" />
          <p v-if="err" class="err">{{ err }}</p>
          <button type="button" class="btn" :disabled="busy" @click="submit">确认预约</button>
          <button type="button" class="link" @click="current = null">取消</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, getToken } from '../api';
import type { Merchant } from '../data/mock';

const emit = defineEmits<{ close: []; booked: [string]; 'open-merchant': [string] }>();

/** boarding=到店寄养商户列表；home=上门服务目录 */
const tab = ref<'boarding' | 'home'>('boarding');
const boarding = ref<Merchant[]>([]);
const homeList = ref<Awaited<ReturnType<typeof api.serviceCatalog>>>([]);
const loadingBoard = ref(false);
const loadingHome = ref(false);
/** 上门服务名关键字过滤（前竀filter，非 API 参数＋*/
const chip = ref('全部');
const chips = ['全部', '遛宠', '喂食', '垫材/猫砂', '笼箱照料', '陪玩'];
const current = ref<(typeof homeList.value)[0] | null>(null);
const slots = ref<Array<{ period: string; time: string; datetime: string }>>([]);
const bookingAt = ref('');
/** 上门地址，后竀home_visit 强制非空 */
const address = ref('上海市静安区');
const note = ref('');
const busy = ref(false);
const err = ref('');

const filteredHome = computed(() => {
  if (chip.value === '全部') return homeList.value;
  return homeList.value.filter((s) => s.name.includes(chip.value));
});

onMounted(async () => {
  loadingBoard.value = true;
  loadingHome.value = true;
  try {
    // category 中seed 一致：boarding（安心寄养小陀m3 等）
    const list = await api.merchants({ city: '上海', category: 'boarding' });
    boarding.value = (list || []) as Merchant[];
  } finally {
    loadingBoard.value = false;
  }
  try {
    homeList.value = await api.serviceCatalog('home_visit');
  } finally {
    loadingHome.value = false;
  }
});

async function pick(s: (typeof homeList.value)[0]) {
  current.value = s;
  err.value = '';
  const ts = await api.timeslots(s.merchantId);
  slots.value = ts.slots;
  bookingAt.value = ts.slots[0]?.datetime || '';
}

/** 上门下单：必须带 address；成功后起App.onServiceBooked ↀ订单列表 */
async function submit() {
  if (!getToken()) {
    err.value = '请先登录（我的 → 登录）';
    return;
  }
  if (!current.value) return;
  busy.value = true;
  err.value = '';
  try {
    const b = await api.createBooking({
      merchantId: current.value.merchantId,
      serviceId: current.value.id,
      bookingAt: bookingAt.value,
      address: address.value,
      note: note.value,
    });
    current.value = null;
    emit('booked', b.id);
  } catch (e) {
    err.value = e instanceof Error ? e.message : '预约失败';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 42; background: var(--color-page); overflow: auto; }
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; background: var(--gradient-brand-head); }
.nav h1 { margin: 0; font-size: 17px; font-weight: 700; color: var(--color-ink); }
.nav button { border: 0; background: transparent; font-size: 28px; color: var(--color-ink); }
.hero {
  margin: 0 16px 12px; padding: 16px; border-radius: var(--radius-lg);
  background: var(--color-card); border: 1px solid var(--color-line); box-shadow: var(--shadow-card);
}
.brand { margin: 0; font-size: 12px; font-weight: 700; color: var(--color-brand); }
.hero h2 { margin: 6px 0; font-size: 18px; color: var(--color-ink); }
.hero p { margin: 0; font-size: 13px; color: var(--color-sub); line-height: 1.45; }
.tabs { display: flex; gap: 6px; padding: 0 16px 12px; }
.tabs button {
  flex: 1; height: 40px; border: 0; border-radius: var(--radius-full);
  background: var(--color-divider); font-weight: 650; color: var(--color-sub);
}
.tabs button.on { background: var(--color-brand); color: #fff; }
.body { padding: 0 16px 28px; }
.hint { margin: 0 0 12px; font-size: 13px; color: var(--color-sub); line-height: 1.45; }
.chips { display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; }
.chips button { flex: 0 0 auto; border: 0; border-radius: 999px; padding: 7px 12px; background: var(--color-divider); font-size: 12px; color: var(--color-sub); }
.chips button.on { background: var(--color-brand); color: #fff; }
.item { padding: 14px; margin-bottom: 10px; }
.top { display: flex; justify-content: space-between; }
.top span { color: var(--color-accent); font-weight: 700; font-variant-numeric: tabular-nums; }
.dist { color: var(--color-sub) !important; font-weight: 600 !important; }
.shop { margin: 6px 0; font-size: 12px; color: var(--color-sub); }
.desc { margin: 0 0 8px; font-size: 13px; color: var(--color-sub); line-height: 1.45; }
.btn { width: 100%; height: 44px; border: 0; border-radius: var(--radius-full); background: var(--color-brand); color: #fff; font-weight: 650; box-shadow: 0 8px 18px rgba(26, 158, 142, 0.22); }
.panel .btn { background: var(--color-accent); box-shadow: var(--shadow-fab); }
.sheet { position: absolute; inset: 0; background: var(--color-overlay); display: grid; place-items: end center; }
.panel { width: 100%; background: #fff; border-radius: 18px 18px 0 0; padding: 16px; }
label { display: block; font-size: 13px; margin: 10px 0 6px; color: var(--color-sub); }
select, textarea, .input { width: 100%; border: 1px solid var(--color-line); border-radius: 12px; padding: 10px; box-sizing: border-box; }
.err { color: var(--color-danger); }
.link { width: 100%; margin-top: 8px; border: 0; background: transparent; color: var(--color-sub); }
.empty { text-align: center; color: var(--color-faint); padding: 30px; }
</style>
