<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>上门服务</h1>
    </header>
    <section class="hero">
      <p class="brand">寄养照护 · 上门</p>
      <h2>遛宠 · 喂食 · 环境照料</h2>
      <p>严选上门服务人员到家照护，结束后反馈记录，适合出差/加班的铲屎官。</p>
    </section>

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

    <div class="body">
      <p v-if="loading">加载中…</p>
      <article v-for="s in filtered" :key="s.id" class="card item">
        <div class="top">
          <strong>{{ s.name }}</strong>
          <span>¥{{ s.price }}</span>
        </div>
        <p class="shop">{{ s.merchantName }} · {{ s.duration }}</p>
        <p class="desc">{{ s.description }}</p>
        <button type="button" class="btn" @click="pick(s)">预约上门</button>
      </article>
      <p v-if="!loading && !filtered.length" class="empty">暂无匹配服务</p>
    </div>

    <div v-if="current" class="sheet">
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
        <textarea
          v-model="note"
          rows="3"
          placeholder="例如：粮/冻干位置、温湿度设定、禁混养、换垫材周期…"
        />
        <p v-if="err" class="err">{{ err }}</p>
        <button type="button" class="btn" :disabled="busy" @click="submit">确认预约</button>
        <button type="button" class="link" @click="current = null">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, getToken } from '../api';

const emit = defineEmits<{ close: []; booked: [string] }>();
const list = ref<Awaited<ReturnType<typeof api.serviceCatalog>>>([]);
const loading = ref(false);
const chip = ref('全部');
const chips = ['全部', '遛宠', '喂食', '垫材/猫砂', '笼箱照料', '陪玩'];
const current = ref<(typeof list.value)[0] | null>(null);
const slots = ref<Array<{ period: string; time: string; datetime: string }>>([]);
const bookingAt = ref('');
const address = ref('上海市静安区');
const note = ref('');
const busy = ref(false);
const err = ref('');

const filtered = computed(() => {
  if (chip.value === '全部') return list.value;
  return list.value.filter((s) => s.name.includes(chip.value));
});

onMounted(async () => {
  loading.value = true;
  try {
    list.value = await api.serviceCatalog('home_visit');
  } finally {
    loading.value = false;
  }
});

async function pick(s: (typeof list.value)[0]) {
  current.value = s;
  err.value = '';
  const ts = await api.timeslots(s.merchantId);
  slots.value = ts.slots;
  bookingAt.value = ts.slots[0]?.datetime || '';
}

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
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; }
.nav h1 { margin: 0; font-size: 17px; }
.nav button { border: 0; background: transparent; font-size: 28px; }
.hero {
  margin: 0 16px 12px; padding: 18px; border-radius: 18px; color: #fff;
  background: linear-gradient(145deg,#3da655,#1a9e8e);
}
.brand { margin: 0; opacity: .9; font-size: 12px; font-weight: 700; }
.hero h2 { margin: 6px 0; font-size: 20px; }
.hero p { margin: 0; font-size: 13px; opacity: .92; line-height: 1.45; }
.chips { display: flex; gap: 8px; padding: 0 16px 12px; overflow-x: auto; }
.chips button { flex: 0 0 auto; border: 0; border-radius: 999px; padding: 7px 12px; background: #eef3f1; font-size: 12px; }
.chips button.on { background: var(--color-primary); color: #fff; }
.body { padding: 0 16px 24px; }
.item { padding: 14px; margin-bottom: 10px; }
.top { display: flex; justify-content: space-between; }
.top span { color: var(--color-accent); font-weight: 700; }
.shop { margin: 6px 0; font-size: 12px; color: #688; }
.desc { margin: 0 0 10px; font-size: 13px; color: #445; line-height: 1.45; }
.btn { width: 100%; height: 42px; border: 0; border-radius: 12px; background: var(--color-primary); color: #fff; font-weight: 700; }
.sheet { position: absolute; inset: 0; background: rgba(0,0,0,.4); display: grid; place-items: end center; }
.panel { width: 100%; background: #fff; border-radius: 18px 18px 0 0; padding: 16px; }
label { display: block; font-size: 13px; margin: 10px 0 6px; color: #566; }
select, textarea, .input { width: 100%; border: 1px solid var(--color-border); border-radius: 12px; padding: 10px; box-sizing: border-box; }
.err { color: #c44; }
.link { width: 100%; margin-top: 8px; border: 0; background: transparent; color: #688; }
.empty { text-align: center; color: #899; padding: 30px; }
</style>
