<!--
  医疗大板块（首页分类「医疗」→ App overlay=medical）
  线上问诊：GET /service-catalog?kind=online_consult，¥5 服务费文案
  线下就医：GET /merchants?category=hospital → open-merchant
-->
<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>医疗</h1>
    </header>

    <section class="hero">
      <p class="brand">宠伴 · 医疗</p>
      <h2>线上问诊与线下就医</h2>
      <p>先分诊、再决定；急重症请立即前往附近宠物医院。</p>
    </section>

    <div class="tabs">
      <button type="button" :class="{ on: tab === 'online' }" @click="tab = 'online'">线上问诊</button>
      <button type="button" :class="{ on: tab === 'offline' }" @click="tab = 'offline'">线下就医</button>
    </div>

    <Transition name="panel-fade" mode="out-in">
      <!-- 线上问诊 -->
      <div v-if="tab === 'online'" key="online" class="body">
        <div class="fee card">
          <strong>先收 ¥5 服务费</strong>
          <p>接通后由兽医分诊；问题解决后按咨询深度酌情补收，急重症将建议立刻线下就医。</p>
        </div>
        <p v-if="loadingConsult">加载中…</p>
        <article v-for="s in consultList" :key="s.id" class="card item">
          <div class="top">
            <strong>{{ s.name }}</strong>
            <span>¥{{ s.price }} 起</span>
          </div>
          <p class="shop">{{ s.merchantName }} · 信用分{{ s.creditScore }}</p>
          <p class="desc">{{ s.description }}</p>
          <button type="button" class="btn" @click="pick(s)">支付 ¥5 开始问诊</button>
        </article>
      </div>

      <!-- 线下就医 -->
      <div v-else key="offline" class="body">
        <div class="urgent card">
          <strong>需要立马就医？</strong>
          <p>以下为附近严选宠物医院，支持到店预约与核销。出现呼吸困难、持续抽搐、大量出血等请直接送医或拨打急救。</p>
        </div>
        <p v-if="loadingHospitals">加载附近医院…</p>
        <article
          v-for="m in hospitals"
          :key="m.id"
          class="card hospital pressable"
          @click="$emit('open-merchant', m.id)"
        >
          <div class="top">
            <strong>{{ m.name }}</strong>
            <span class="dist">{{ m.distanceKm || '-' }}km</span>
          </div>
          <p class="shop">★{{ m.rating }} · 信用分{{ m.creditScore }} · {{ m.address }}</p>
          <p class="tags">
            <span v-for="t in (m.tags || []).slice(0, 3)" :key="t">{{ t }}</span>
          </p>
          <button type="button" class="btn ghost" @click.stop="$emit('open-merchant', m.id)">
            查看医院 / 预约到店
          </button>
        </article>
        <p v-if="!loadingHospitals && !hospitals.length" class="empty">暂无附近医院数据</p>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="current" key="sheet" class="sheet">
        <div class="panel">
          <h3>{{ current.name }}</h3>
          <p class="fee-line">本次先收服务费 <b>¥5</b>，问诊结束后按情况酌情收费。</p>
          <label>预约时段</label>
          <select v-model="bookingAt">
            <option v-for="slot in slots" :key="slot.datetime" :value="slot.datetime">
              {{ slot.period }} {{ slot.time }}
            </option>
          </select>
          <label>症状 / 咨询问题（必填）</label>
          <textarea v-model="note" rows="4" placeholder="例如：拒食两天、精神差；或爬宠不蜕皮…" />
          <p class="warn">仅健康咨询与分诊建议，不开处方。若建议线下就医，请切到「线下就医」选附近医院。</p>
          <p v-if="err" class="err">{{ err }}</p>
          <button type="button" class="btn" :disabled="busy" @click="submit">确认支付 ¥5 并预约</button>
          <button type="button" class="link" @click="current = null">取消</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, getToken } from '../api';
import type { Merchant } from '../data/mock';

const emit = defineEmits<{ close: []; booked: [string]; 'open-merchant': [string] }>();

/** online=线上问诊列表；offline=附近医院 */
const tab = ref<'online' | 'offline'>('online');
const consultList = ref<Awaited<ReturnType<typeof api.serviceCatalog>>>([]);
const hospitals = ref<Merchant[]>([]);
const loadingConsult = ref(false);
const loadingHospitals = ref(false);
/** 当前正在预约的问诊服务（非空则展示底郀sheet＋*/
const current = ref<(typeof consultList.value)[0] | null>(null);
const slots = ref<Array<{ period: string; time: string; datetime: string }>>([]);
const bookingAt = ref('');
/** 症状描述，后竀online_consult 强制非空 */
const note = ref('');
const busy = ref(false);
const err = ref('');

onMounted(async () => {
  loadingConsult.value = true;
  loadingHospitals.value = true;
  try {
    consultList.value = await api.serviceCatalog('online_consult');
  } finally {
    loadingConsult.value = false;
  }
  try {
    // category 中seed 中医院商户一致：hospital（不是中文「医疗」）
    const list = await api.merchants({ city: '上海', category: 'hospital' });
    hospitals.value = (list || []) as Merchant[];
  } finally {
    loadingHospitals.value = false;
  }
});

/** 选中问诊项ↀ拉该店时殀ↀ打开预约面板 */
async function pick(s: (typeof consultList.value)[0]) {
  current.value = s;
  note.value = '';
  err.value = '';
  const ts = await api.timeslots(s.merchantId);
  slots.value = ts.slots;
  bookingAt.value = ts.slots[0]?.datetime || '';
}

/**
 * 提交问诊预约。
 * UI 文案写「支件¥5」，当前 MVP 未接真实支付，直推createBooking，金额以服务标价为准。
 */
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
.fee, .urgent { padding: 14px; margin-bottom: 12px; }
.fee strong, .urgent strong { display: block; margin-bottom: 6px; color: var(--color-ink); }
.fee p, .urgent p { margin: 0; font-size: 13px; color: var(--color-sub); line-height: 1.45; }
.urgent { border-left: 3px solid var(--color-warn); }
.item, .hospital { padding: 14px; margin-bottom: 10px; }
.top { display: flex; justify-content: space-between; gap: 8px; }
.top span { color: var(--color-accent); font-weight: 700; font-variant-numeric: tabular-nums; }
.dist { color: var(--color-sub) !important; font-weight: 600 !important; }
.shop { margin: 6px 0; font-size: 12px; color: var(--color-sub); }
.desc { margin: 0 0 10px; font-size: 13px; color: var(--color-sub); line-height: 1.45; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 10px; }
.tags span { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: var(--color-brand-light); color: var(--color-brand-dark); }
.btn { width: 100%; height: 44px; border: 0; border-radius: var(--radius-full); background: var(--color-brand); color: #fff; font-weight: 650; box-shadow: 0 8px 18px rgba(26, 158, 142, 0.22); }
.btn.ghost { background: var(--color-brand-light); color: var(--color-brand); box-shadow: none; }
.panel .btn { background: var(--color-accent); box-shadow: var(--shadow-fab); }
.sheet { position: absolute; inset: 0; background: var(--color-overlay); display: grid; place-items: end center; }
.panel { width: 100%; background: #fff; border-radius: 18px 18px 0 0; padding: 16px; }
.panel h3 { margin: 0 0 8px; color: var(--color-ink); }
.fee-line { margin: 0 0 8px; font-size: 13px; color: var(--color-sub); }
label { display: block; font-size: 13px; margin: 10px 0 6px; color: var(--color-sub); }
select, textarea { width: 100%; border: 1px solid var(--color-line); border-radius: 12px; padding: 10px; box-sizing: border-box; }
.warn { font-size: 12px; color: #b26a00; background: var(--color-warn-light); padding: 8px 10px; border-radius: 10px; }
.err { color: var(--color-danger); }
.link { width: 100%; margin-top: 8px; border: 0; background: transparent; color: var(--color-sub); }
.empty { text-align: center; color: var(--color-faint); padding: 24px; }
</style>
