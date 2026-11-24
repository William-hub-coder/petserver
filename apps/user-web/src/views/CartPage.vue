<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>购物车</h1>
    </header>
    <div class="body">
      <p v-if="!token" class="empty">请先登录后再查看购物车</p>
      <p v-else-if="loading">加载中…</p>
      <p v-else-if="!items.length" class="empty">购物车空空如也，去商城逛逛吧</p>
      <article v-for="i in items" :key="i.id" class="card row">
        <div class="cover" :style="{ background: i.coverTone || '#1a9e8e' }">
          <img :src="coverOf(i)" :alt="i.name" loading="lazy" />
        </div>
        <div class="info">
          <strong>{{ i.name }}</strong>
          <p>{{ i.merchantName }}</p>
          <div class="line">
            <b>¥{{ i.price }}</b>
            <div class="qty">
              <button type="button" @click="setQty(i.productId, i.qty - 1)">−</button>
              <span>{{ i.qty }}</span>
              <button type="button" @click="setQty(i.productId, i.qty + 1)">＋</button>
            </div>
          </div>
        </div>
      </article>
    </div>
    <footer v-if="items.length" class="bar">
      <div>合计 <strong>¥{{ total }}</strong></div>
      <button type="button" class="btn-accent" :disabled="busy" @click="checkout">去结算（模拟支付）</button>
    </footer>
    <p v-if="tip" class="tip">{{ tip }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, getToken } from '../api';
import { productCoverUrl } from '../lib/product-cover';

function coverOf(i: { productId: string; coverUrl?: string | null; coverTone?: string | null }) {
  return productCoverUrl({ id: i.productId, coverUrl: i.coverUrl });
}

const emit = defineEmits<{ close: []; ordered: [string] }>();
const token = getToken();
const loading = ref(false);
const busy = ref(false);
const tip = ref('');
const items = ref<Awaited<ReturnType<typeof api.cart>>['items']>([]);
const total = ref(0);

async function load() {
  if (!token) return;
  loading.value = true;
  try {
    const data = await api.cart();
    items.value = data.items;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function setQty(productId: string, qty: number) {
  const data = await api.updateCart(productId, qty);
  items.value = data.items;
  total.value = data.total;
}

async function checkout() {
  busy.value = true;
  tip.value = '';
  try {
    const order = await api.checkout({ fromCart: true, payNow: true });
    tip.value = '支付成功（模拟）';
    emit('ordered', order.id);
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '结算失败';
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 46; background: var(--color-page); display: flex; flex-direction: column; }
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; border-bottom: 1px solid var(--color-border); }
.nav h1 { margin: 0; font-size: 17px; }
.nav button { border: 0; background: transparent; font-size: 28px; }
.body { flex: 1; overflow: auto; padding: 12px 16px 90px; }
.row { display: grid; grid-template-columns: 72px 1fr; gap: 10px; padding: 10px; margin-bottom: 10px; }
.cover { border-radius: 10px; min-height: 72px; overflow: hidden; }
.cover img { width: 100%; height: 72px; object-fit: cover; display: block; }
.info strong { font-size: 14px; }
.info p { margin: 4px 0 8px; font-size: 12px; color: #799; }
.line { display: flex; justify-content: space-between; align-items: center; }
.line b { color: var(--color-accent); }
.qty { display: flex; align-items: center; gap: 8px; background: #eef3f1; border-radius: 8px; padding: 2px 6px; }
.qty button { border: 0; background: transparent; width: 24px; }
.bar {
  position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid var(--color-border);
}
.bar strong { color: var(--color-accent); font-size: 20px; }
.empty, .tip { text-align: center; color: #799; padding: 24px; }
.tip { color: var(--color-primary); }
</style>
