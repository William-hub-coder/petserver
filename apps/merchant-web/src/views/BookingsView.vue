<template>
  <div>
    <header class="nav"><h1 class="font-h3">预约管理</h1></header>
    <div style="padding: 16px; display: grid; gap: 12px">
      <p v-if="err" class="err">{{ err }}</p>
      <p v-else-if="loading">加载中…</p>
      <p v-else-if="!bookings.length" class="hint">暂无预约（请用店长账号 13900000001 登录）</p>
      <article v-for="b in bookings" :key="b.id" class="card row">
        <div>
          <div class="font-body" style="font-weight: 600">{{ b.serviceName || '服务' }}</div>
          <div class="font-caption">{{ b.merchantName }} · {{ formatTime(b.bookingAt) }}</div>
          <div v-if="b.verifyCode" class="font-caption">码：{{ b.verifyCode }}</div>
        </div>
        <span class="tag" :class="tagClass(b.status)">{{ statusLabel(b.status) }}</span>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';

const bookings = ref<Awaited<ReturnType<typeof api.bookings>>>([]);
const loading = ref(false);
const err = ref('');

onMounted(async () => {
  loading.value = true;
  try {
    bookings.value = await api.bookings();
  } catch (e) {
    err.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
});

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    verified: '已核销',
    reviewed: '已评价',
    cancelled: '已取消',
  };
  return map[s] || s;
}

function tagClass(s: string) {
  if (s === 'confirmed' || s === 'pending') return 'confirmed';
  if (s === 'verified' || s === 'reviewed') return 'done';
  return 'pending';
}

function formatTime(iso: string) {
  return iso.replace('T', ' ').slice(0, 16);
}
</script>

<style scoped>
.row { display: flex; justify-content: space-between; align-items: center; }
.tag { font-size: 12px; border-radius: 999px; padding: 4px 10px; }
.tag.pending { background: var(--color-accent-light); color: var(--color-accent); }
.tag.confirmed { background: var(--color-primary-light); color: var(--color-primary); }
.tag.done { background: var(--color-divider); color: var(--color-text-secondary); }
.err { color: #c44; }
.hint { color: #799; }
</style>
