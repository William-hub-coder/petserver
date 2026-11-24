<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>线上问诊</h1>
    </header>
    <section class="hero">
      <p class="brand">医疗 · 在线咨询</p>
      <h2>严选医院兽医在线分诊</h2>
      <p>健康咨询与就医建议，不开处方；急症请立即线下就医。</p>
    </section>

    <div class="body">
      <p v-if="loading">加载中…</p>
      <article v-for="s in list" :key="s.id" class="card item">
        <div class="top">
          <strong>{{ s.name }}</strong>
          <span>¥{{ s.price }}</span>
        </div>
        <p class="shop">{{ s.merchantName }} · 信用分{{ s.creditScore }}</p>
        <p class="desc">{{ s.description }}</p>
        <button type="button" class="btn" @click="pick(s)">预约问诊</button>
      </article>
    </div>

    <div v-if="current" class="sheet">
      <div class="panel">
        <h3>预约「{{ current.name }}」</h3>
        <label>预约时段</label>
        <select v-model="bookingAt">
          <option v-for="slot in slots" :key="slot.datetime" :value="slot.datetime">
            {{ slot.period }} {{ slot.time }}
          </option>
        </select>
        <label>症状 / 咨询问题（必填）</label>
        <textarea
          v-model="note"
          rows="4"
          placeholder="例如：拒食两天、精神差；鸟类羽毛竖起；是否建议到院…"
        />
        <p class="warn">本服务仅提供健康咨询与分诊建议，不构成诊断，不开具处方。</p>
        <p v-if="err" class="err">{{ err }}</p>
        <button type="button" class="btn" :disabled="busy" @click="submit">确认预约</button>
        <button type="button" class="link" @click="current = null">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, getToken } from '../api';

const emit = defineEmits<{ close: []; booked: [string] }>();
const list = ref<Awaited<ReturnType<typeof api.serviceCatalog>>>([]);
const loading = ref(false);
const current = ref<(typeof list.value)[0] | null>(null);
const slots = ref<Array<{ period: string; time: string; datetime: string }>>([]);
const bookingAt = ref('');
const note = ref('');
const busy = ref(false);
const err = ref('');

onMounted(async () => {
  loading.value = true;
  try {
    list.value = await api.serviceCatalog('online_consult');
  } finally {
    loading.value = false;
  }
});

async function pick(s: (typeof list.value)[0]) {
  current.value = s;
  note.value = '';
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
  background: linear-gradient(145deg,#3d8fd4,#1a9e8e);
}
.brand { margin: 0; opacity: .9; font-size: 12px; font-weight: 700; }
.hero h2 { margin: 6px 0; font-size: 20px; }
.hero p { margin: 0; font-size: 13px; opacity: .92; line-height: 1.45; }
.body { padding: 0 16px 24px; }
.item { padding: 14px; margin-bottom: 10px; }
.top { display: flex; justify-content: space-between; gap: 8px; }
.top span { color: var(--color-accent); font-weight: 700; }
.shop { margin: 6px 0; font-size: 12px; color: #688; }
.desc { margin: 0 0 10px; font-size: 13px; color: #445; line-height: 1.45; }
.btn { width: 100%; height: 42px; border: 0; border-radius: 12px; background: var(--color-primary); color: #fff; font-weight: 700; }
.sheet { position: absolute; inset: 0; background: rgba(0,0,0,.4); display: grid; place-items: end center; }
.panel { width: 100%; background: #fff; border-radius: 18px 18px 0 0; padding: 16px; }
.panel h3 { margin: 0 0 12px; }
label { display: block; font-size: 13px; margin: 10px 0 6px; color: #566; }
select, textarea { width: 100%; border: 1px solid var(--color-border); border-radius: 12px; padding: 10px; box-sizing: border-box; }
.warn { font-size: 12px; color: #b26a00; background: #fff7e8; padding: 8px 10px; border-radius: 10px; }
.err { color: #c44; }
.link { width: 100%; margin-top: 8px; border: 0; background: transparent; color: #688; }
</style>
