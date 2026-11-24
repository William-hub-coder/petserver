<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>我的订单</h1>
    </header>
    <div class="body">
      <p v-if="!token" class="hint">请先登录后查看订单</p>
      <p v-else-if="loading">加载中…</p>
      <p v-else-if="!rows.length" class="hint">暂无预约</p>
      <article v-for="b in rows" :key="b.id" class="card">
        <div class="row">
          <strong>{{ b.merchantName }}</strong>
          <span>{{ statusLabel(b) }}</span>
        </div>
        <p>
          <em v-if="b.channel && b.channel !== 'onsite'" class="tag">{{ channelLabel(b.channel) }}</em>
          {{ b.serviceName }} · ¥{{ (b.amountCents / 100).toFixed(0) }}
        </p>
        <p class="time">{{ formatTime(b.bookingAt) }}</p>
        <p v-if="b.address" class="meta">上门：{{ b.address }}</p>
        <p v-if="b.note" class="meta">备注：{{ b.note }}</p>
        <div class="actions">
          <button
            v-if="b.status === 'confirmed' && b.channel === 'onsite'"
            type="button"
            @click="$emit('qrcode', b.id)"
          >
            核销码
          </button>
          <button
            v-if="canLive(b)"
            type="button"
            class="ghost"
            @click="$emit('live', b.id)"
          >
            查看服务位置
          </button>
          <button
            v-if="canComplete(b)"
            type="button"
            :disabled="busyId === b.id"
            @click="complete(b.id)"
          >
            {{ busyId === b.id ? '处理中…' : '确认完成' }}
          </button>
          <button v-if="b.status === 'verified'" type="button" @click="$emit('review', b.id)">
            去评价
          </button>
        </div>
        <p v-if="errId === b.id && errMsg" class="err">{{ errMsg }}</p>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 「我的订单」——服务预约单（不含商城shop-orders）。
 *
 * ## 挀channel 展示的动佀
 * | channel         | confirmed 时按钀| 完成吀|
 * |-----------------|------------------|--------|
 * | onsite          | 核销码ↀqrcode  | 商家核销后出现「去评价。|
 * | online_consult  | 确认完成         | verified →「去评价。|
 * | home_visit      | 确认完成         | 同上 |
 *
 * 「确认完成」调甀api.completeBooking ↀPOST /bookings/:id/complete
 * （后端禁止对 onsite 调用，前端用 canComplete 双重限制＋
 */
import { onMounted, ref } from 'vue';
import { api, getToken } from '../api';

defineEmits<{ close: []; qrcode: [id: string]; review: [id: string]; live: [id: string] }>();

const token = getToken();
const loading = ref(false);
const rows = ref<Awaited<ReturnType<typeof api.bookings>>>([]);
const busyId = ref<string | null>(null);
const errId = ref<string | null>(null);
const errMsg = ref('');

onMounted(async () => {
  if (!token) return;
  await reload();
});

async function reload() {
  loading.value = true;
  try {
    rows.value = await api.bookings();
  } finally {
    loading.value = false;
  }
}

function channelLabel(c: string) {
  if (c === 'online_consult') return '线上问诊';
  if (c === 'home_visit') return '上门服务';
  return '到店';
}

function canComplete(b: { status: string; channel?: string }) {
  return (
    (b.status === 'confirmed' || b.status === 'pending') &&
    (b.channel === 'online_consult' || b.channel === 'home_visit')
  );
}

function canLive(b: { status: string; channel?: string }) {
  return (
    b.channel === 'home_visit' &&
    (b.status === 'confirmed' || b.status === 'pending' || b.status === 'verified')
  );
}

function statusLabel(b: { status: string; channel?: string }) {
  if (b.status === 'confirmed') {
    if (b.channel === 'online_consult') return '待问诊';
    if (b.channel === 'home_visit') return '待上门';
    return '待到店';
  }
  const map: Record<string, string> = {
    pending: '待确认',
    verified: '已完成',
    reviewed: '已评价',
    cancelled: '已取消',
  };
  return map[b.status] || b.status;
}

function formatTime(iso: string) {
  return iso.replace('T', ' ').slice(0, 16);
}

async function complete(id: string) {
  busyId.value = id;
  errId.value = null;
  errMsg.value = '';
  try {
    await api.completeBooking(id);
    await reload();
  } catch (e) {
    errId.value = id;
    errMsg.value = e instanceof Error ? e.message : '操作失败';
  } finally {
    busyId.value = null;
  }
}
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 40; background: var(--color-page); overflow: auto; }
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; border-bottom: 1px solid var(--color-divider); background: var(--gradient-brand-head); }
.nav h1 { margin: 0; font-size: 17px; font-weight: 700; color: var(--color-ink); }
.nav button { border: 0; background: transparent; font-size: 28px; color: var(--color-ink); }
.body { padding: 12px 16px; }
.card { background: #fff; border-radius: var(--radius-lg); padding: 14px; margin-bottom: 10px; border: 1px solid var(--color-line); box-shadow: var(--shadow-card); }
.row { display: flex; justify-content: space-between; color: var(--color-ink); }
.time, .hint, .meta { color: var(--color-sub); font-size: 13px; margin: 4px 0 0; }
.tag {
  display: inline-block;
  font-style: normal;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--color-brand-light);
  color: var(--color-brand);
  margin-right: 4px;
}
.actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.actions button { border: 0; border-radius: var(--radius-full); padding: 8px 14px; background: var(--color-brand); color: #fff; font-size: 13px; font-weight: 650; }
.actions button.ghost { background: var(--color-info-light); color: var(--color-info); }
.actions button:disabled { opacity: .6; }
.err { color: var(--color-danger); font-size: 12px; margin: 6px 0 0; }
</style>
