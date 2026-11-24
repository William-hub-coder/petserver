<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>商城订单</h1>
    </header>
    <div class="body">
      <p v-if="!token" class="empty">请先登录</p>
      <p v-else-if="loading">加载中…</p>
      <p v-else-if="!rows.length" class="empty">暂无商城订单</p>
      <article v-for="o in rows" :key="o.id" class="card">
        <div class="top">
          <strong>#{{ o.id.slice(-8).toUpperCase() }}</strong>
          <span>{{ o.statusLabel }}</span>
        </div>
        <div v-for="i in o.items" :key="i.id" class="item">
          <div class="cover" :style="{ background: i.coverTone || '#1a9e8e' }">
            <img :src="coverOf(i)" :alt="i.name" loading="lazy" />
          </div>
          <div class="info">
            <p>{{ i.name }}</p>
            <span>¥{{ i.price }} × {{ i.qty }}</span>
            <button
              v-if="i.canReview"
              type="button"
              class="rev"
              @click="$emit('review', { orderItemId: i.id, productName: i.name })"
            >
              评价晒单
            </button>
            <span v-else-if="i.reviewed" class="done">已评价</span>
          </div>
        </div>
        <div class="foot">
          <span>{{ formatTime(o.createdAt) }}</span>
          <b>合计 ¥{{ o.total }}</b>
        </div>
        <div class="actions">
          <button v-if="o.canShip" type="button" @click="ship(o.id)">模拟发货</button>
          <button v-if="o.canTrack" type="button" class="ghost" @click="$emit('track', o.id)">
            查看配送
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, getToken } from '../api';
import { productCoverUrl } from '../lib/product-cover';

function coverOf(i: { productId: string; coverUrl?: string | null }) {
  return productCoverUrl({ id: i.productId, coverUrl: i.coverUrl });
}

const emit = defineEmits<{
  close: [];
  review: [{ orderItemId: string; productName: string }];
  track: [orderId: string];
}>();
const token = getToken();
const loading = ref(false);
const rows = ref<Awaited<ReturnType<typeof api.shopOrders>>>([]);
const busyId = ref<string | null>(null);

async function load() {
  if (!token) return;
  loading.value = true;
  try {
    rows.value = await api.shopOrders();
  } finally {
    loading.value = false;
  }
}

async function ship(id: string) {
  busyId.value = id;
  try {
    await api.shipOrder(id);
    await load();
    emit('track', id);
  } catch (e) {
    alert(e instanceof Error ? e.message : '发货失败');
  } finally {
    busyId.value = null;
  }
}

onMounted(load);
defineExpose({ reload: load });

function formatTime(iso: string) {
  return iso.replace('T', ' ').slice(0, 16);
}
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 46; background: var(--color-page); }
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; border-bottom: 1px solid var(--color-border); }
.nav h1 { margin: 0; font-size: 17px; }
.nav button { border: 0; background: transparent; font-size: 28px; }
.body { padding: 12px 16px; }
.card { padding: 12px; margin-bottom: 10px; }
.top { display: flex; justify-content: space-between; margin-bottom: 8px; }
.top span { color: var(--color-primary); font-size: 13px; font-weight: 600; }
.item { display: grid; grid-template-columns: 48px 1fr; gap: 8px; margin-bottom: 8px; }
.actions { display: flex; gap: 8px; margin-top: 8px; }
.actions button { border: 0; border-radius: var(--radius-full); padding: 8px 14px; background: var(--color-brand); color: #fff; font-size: 13px; font-weight: 650; }
.actions button.ghost { background: var(--color-info-light); color: var(--color-info); }
.cover { border-radius: 8px; min-height: 48px; width: 48px; overflow: hidden; }
.cover img { width: 48px; height: 48px; object-fit: cover; display: block; }
.info p { margin: 0 0 4px; font-size: 13px; }
.info span { font-size: 12px; color: #799; }
.rev {
  display: inline-block; margin-top: 6px; border: 0; border-radius: 8px; padding: 4px 10px;
  background: var(--color-primary); color: #fff; font-size: 12px; font-weight: 600;
}
.done { display: inline-block; margin-top: 6px; color: #899; font-size: 12px; }
.foot { display: flex; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 8px; font-size: 13px; }
.foot b { color: var(--color-accent); }
.empty { text-align: center; color: #899; padding: 40px; }
</style>
