<template>
  <div class="page" v-if="product">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>商品详情</h1>
    </header>
    <div class="hero" :style="{ background: product.coverTone }">
      <img class="hero-img" :src="coverOf(product)" :alt="product.name" />
      <span v-if="product.selectedBadge" class="yx">严选货源</span>
    </div>
    <div class="panel">
      <div class="price-row">
        <strong>¥{{ product.price }}</strong>
        <small v-if="product.originalPrice">¥{{ product.originalPrice }}</small>
        <span>已售 {{ product.sales }}</span>
      </div>
      <h2>{{ product.name }}</h2>
      <p class="sub">{{ product.subtitle }}</p>
      <div class="score-line">
        <em>★{{ Number(product.rating || 0).toFixed(1) }}</em>
        <span>{{ product.reviewCount || 0 }} 条评价</span>
      </div>
      <div class="tags">
        <span v-for="t in product.tags" :key="t" class="tag-chip">{{ t }}</span>
      </div>
      <div class="shop card">
        <div>
          <strong>{{ product.merchantName }}</strong>
          <p>信用分{{ product.merchantCreditScore ?? '-' }}</p>
        </div>
        <span v-if="product.selectedBadge" class="tag-chip gold">严选店</span>
      </div>

      <section class="block">
        <h3>规格参数</h3>
        <div class="specs card">
          <div v-for="(v, k) in product.specs" :key="k"><span>{{ k }}</span><b>{{ v }}</b></div>
        </div>
      </section>

      <section class="block">
        <h3>商品详情</h3>
        <p class="detail">{{ product.detail }}</p>
        <p class="warn">{{ product.complianceNote }}</p>
      </section>

      <section class="block">
        <div class="rh-title">
          <h3>购后评价</h3>
          <span v-if="summary">好评率 {{ summary.goodRate }}%</span>
        </div>
        <p class="note">{{ summary?.note || '真实购后评价，可供选购参考' }}</p>
        <div v-if="summary" class="summary card">
          <div class="avg">
            <b>{{ summary.avgRating.toFixed(1) }}</b>
            <span>{{ summary.count }} 条</span>
          </div>
          <div class="top-tags">
            <span v-for="t in summary.topTags" :key="t.name" class="tag-chip">{{ t.name }} {{ t.count }}</span>
          </div>
        </div>
        <div class="filters">
          <button
            v-for="f in filters"
            :key="f.key"
            type="button"
            :class="{ on: filter === f.key }"
            @click="setFilter(f.key)"
          >
            {{ f.label }}
          </button>
        </div>
        <p v-if="loadingReviews" class="empty">加载评价中…</p>
        <p v-else-if="!reviewItems.length" class="empty">暂无此类评价，购买后可留下第一条参考</p>
        <div v-for="r in reviewItems" :key="r.id" class="review card">
          <div class="rh">
            <strong>{{ r.user }}</strong>
            <span>★{{ Number(r.score).toFixed(1) }}</span>
          </div>
          <div v-if="r.tags?.length" class="rtags">
            <span v-for="t in r.tags" :key="t" class="tag-chip">{{ t }}</span>
          </div>
          <p>{{ r.text || '（用户未填写文字）' }}</p>
          <div class="rf">
            <span>{{ r.date }}</span>
            <button type="button" @click="markHelpful(r)">有帮助 {{ r.helpfulCount || 0 }}</button>
          </div>
        </div>
      </section>

      <section class="block qty">
        <span>数量</span>
        <div>
          <button type="button" @click="qty = Math.max(1, qty - 1)">−</button>
          <em>{{ qty }}</em>
          <button type="button" @click="qty = Math.min(product.stock || 99, qty + 1)">＋</button>
        </div>
        <small>库存 {{ product.stock }}</small>
      </section>
    </div>

    <footer class="bar">
      <button type="button" class="btn-ghost" @click="contactShop">联系店家</button>
      <button type="button" class="btn-ghost" @click="$emit('open-cart')">购物车</button>
      <button type="button" class="btn-ghost" :disabled="busy" @click="addCart">加入购物车</button>
      <button type="button" class="btn-accent grow" :disabled="busy" @click="buyNow">立即购买</button>
    </footer>
    <p v-if="tip" class="tip">{{ tip }}</p>
  </div>
  <div v-else class="page"><p class="tip">{{ tip || '加载中…' }}</p></div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api, getToken } from '../api';
import { productCoverUrl } from '../lib/product-cover';

function coverOf(p: { id: string; category?: string; coverUrl?: string | null }) {
  return productCoverUrl(p);
}

const props = defineProps<{ productId: string }>();
const emit = defineEmits<{
  close: [];
  'open-cart': [];
  ordered: [string];
  contact: [string, string];
}>();

function contactShop() {
  if (!product.value?.merchantId) {
    tip.value = '暂无店铺信息';
    return;
  }
  if (!getToken()) {
    tip.value = '请先登录';
    return;
  }
  emit('contact', product.value.merchantId, product.value.merchantName);
}

const product = ref<Awaited<ReturnType<typeof api.product>> | null>(null);
const qty = ref(1);
const busy = ref(false);
const tip = ref('');
const filter = ref('all');
const loadingReviews = ref(false);
const reviewItems = ref<
  Array<{
    id: string;
    user: string;
    score: number;
    text: string;
    tags: string[];
    helpfulCount: number;
    date: string;
  }>
>([]);
const summary = ref<{
  avgRating: number;
  count: number;
  goodRate: number;
  topTags: Array<{ name: string; count: number }>;
  note: string;
} | null>(null);
const filters = [
  { key: 'all', label: '全部' },
  { key: 'good', label: '好评' },
  { key: 'mid', label: '一般' },
  { key: 'bad', label: '差评' },
];

async function loadReviews() {
  loadingReviews.value = true;
  try {
    const data = await api.productReviews(props.productId, filter.value);
    summary.value = data.summary;
    reviewItems.value = data.items;
  } catch {
    reviewItems.value = [];
  } finally {
    loadingReviews.value = false;
  }
}

function setFilter(key: string) {
  filter.value = key;
  loadReviews();
}

async function markHelpful(r: { id: string; helpfulCount: number }) {
  try {
    const data = await api.markProductReviewHelpful(r.id);
    r.helpfulCount = data.helpfulCount;
  } catch {
    /* ignore */
  }
}

onMounted(async () => {
  try {
    product.value = await api.product(props.productId);
    await loadReviews();
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '加载失败';
  }
});

watch(
  () => props.productId,
  async () => {
    product.value = await api.product(props.productId);
    filter.value = 'all';
    await loadReviews();
  },
);

async function addCart() {
  if (!getToken()) {
    tip.value = '请先登录（我的 → 登录）';
    return;
  }
  busy.value = true;
  tip.value = '';
  try {
    await api.addToCart(props.productId, qty.value);
    tip.value = '已加入购物车';
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '加入失败';
  } finally {
    busy.value = false;
  }
}

async function buyNow() {
  if (!getToken()) {
    tip.value = '请先登录（我的 → 登录）';
    return;
  }
  busy.value = true;
  tip.value = '';
  try {
    const order = await api.checkout({
      items: [{ productId: props.productId, qty: qty.value }],
      payNow: true,
    });
    tip.value = '支付成功（模拟），可在商城订单评价';
    emit('ordered', order.id);
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '下单失败';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 45; background: var(--color-page); overflow: auto; padding-bottom: 90px; }
.nav { display: flex; align-items: center; gap: 8px; padding: 12px; position: sticky; top: 0; background: var(--color-page); z-index: 2; }
.nav h1 { margin: 0; font-size: 17px; }
.nav button { border: 0; background: transparent; font-size: 28px; }
.hero { height: 220px; position: relative; overflow: hidden; background: var(--color-brand-light); }
.hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.yx { position: absolute; left: 12px; top: 12px; background: #d4a03a; color: #fff; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; z-index: 1; }
.panel { padding: 16px; }
.price-row { display: flex; align-items: baseline; gap: 8px; }
.price-row strong { color: var(--color-accent); font-size: 28px; }
.price-row small { text-decoration: line-through; color: #99a; }
.price-row span { margin-left: auto; color: #899; font-size: 12px; }
h2 { margin: 8px 0 4px; font-size: 18px; }
.sub { margin: 0 0 6px; color: #688; font-size: 13px; }
.score-line { display: flex; gap: 10px; align-items: baseline; margin-bottom: 8px; }
.score-line em { color: #d4a03a; font-style: normal; font-weight: 700; }
.score-line span { color: #799; font-size: 12px; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.shop { display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 14px; }
.shop p { margin: 4px 0 0; font-size: 12px; color: #799; }
.block h3 { margin: 0 0 8px; font-size: 15px; }
.specs { padding: 10px 12px; }
.specs div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--color-border); font-size: 13px; }
.specs div:last-child { border-bottom: 0; }
.detail { white-space: pre-wrap; line-height: 1.55; color: #445; font-size: 14px; }
.warn { color: #b26a00; font-size: 12px; background: #fff7e8; padding: 10px; border-radius: 10px; }
.rh-title { display: flex; justify-content: space-between; align-items: baseline; }
.rh-title span { color: var(--color-primary); font-size: 13px; font-weight: 600; }
.note { margin: 0 0 8px; font-size: 12px; color: #799; }
.summary { padding: 12px; margin-bottom: 10px; }
.avg { display: flex; gap: 8px; align-items: baseline; margin-bottom: 8px; }
.avg b { font-size: 26px; color: #d4a03a; }
.top-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.filters { display: flex; gap: 8px; margin-bottom: 10px; }
.filters button { border: 0; border-radius: 999px; padding: 6px 12px; background: #eef3f1; font-size: 12px; }
.filters button.on { background: var(--color-primary); color: #fff; }
.review { padding: 12px; margin-bottom: 8px; }
.rh { display: flex; justify-content: space-between; margin-bottom: 4px; }
.rtags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.rf { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #799; }
.rf button { border: 0; background: transparent; color: var(--color-primary); font-weight: 600; }
.empty { color: #899; font-size: 13px; }
.qty { display: flex; align-items: center; gap: 12px; }
.qty div { display: flex; align-items: center; gap: 10px; background: #eef3f1; border-radius: 10px; padding: 4px 8px; }
.qty button { border: 0; background: transparent; font-size: 18px; width: 28px; }
.bar {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; width: min(100%, var(--page-max-width));
  display: flex; gap: 8px; padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: rgba(255,255,255,.97); border-top: 1px solid var(--color-border);
}
.grow { flex: 1; }
.tip { text-align: center; color: var(--color-primary); font-size: 13px; padding: 8px; }
</style>
