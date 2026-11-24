<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>宠伴严选商城</h1>
      <button type="button" class="cart-btn" @click="$emit('open-cart')">
        购物车<span v-if="cartCount" class="badge">{{ cartCount }}</span>
      </button>
    </header>

    <div class="search">
      <input v-model="keyword" placeholder="搜主粮、垫材、鸟粮、鱼缸…" @keyup.enter="load" />
      <button type="button" @click="load">搜索</button>
    </div>

    <div class="cats">
      <button
        v-for="c in categories"
        :key="c.key"
        type="button"
        :class="{ on: category === c.key }"
        @click="category = c.key; load()"
      >
        {{ c.label }}
      </button>
    </div>

    <div class="sorts">
      <button type="button" :class="{ on: sort === 'sales' }" @click="sort = 'sales'; load()">销量</button>
      <button type="button" :class="{ on: sort === 'rating' }" @click="sort = 'rating'; load()">好评</button>
      <button type="button" :class="{ on: sort === 'price_asc' }" @click="sort = 'price_asc'; load()">价格↑</button>
      <button type="button" :class="{ on: sort === 'price_desc' }" @click="sort = 'price_desc'; load()">价格↓</button>
    </div>

    <p class="tip">不含活体交易 · 保健品非药品 · 支持严选店家货源</p>

    <div v-if="loading" class="empty">加载中…</div>
    <div v-else class="grid">
      <article
        v-for="p in products"
        :key="p.id"
        class="card pressable"
        @click="$emit('open-product', p.id)"
      >
        <div class="cover" :style="{ background: p.coverTone }">
          <img :src="coverOf(p)" :alt="p.name" loading="lazy" />
          <span v-if="p.selectedBadge" class="badge-yx">严选</span>
        </div>
        <div class="body">
          <h3>{{ p.name }}</h3>
          <p>{{ p.subtitle }}</p>
          <div class="rate" v-if="p.reviewCount">★{{ Number(p.rating || 0).toFixed(1) }} · {{ p.reviewCount }}评</div>
          <div class="foot">
            <strong>¥{{ p.price }}</strong>
            <small v-if="p.originalPrice">¥{{ p.originalPrice }}</small>
            <span>已售 {{ p.sales }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, getToken } from '../api';
import { productCoverUrl } from '../lib/product-cover';

defineEmits<{ close: []; 'open-product': [string]; 'open-cart': [] }>();

function coverOf(p: { id: string; category?: string; coverUrl?: string | null }) {
  return productCoverUrl(p);
}

const categories = ref<Array<{ key: string; label: string }>>([{ key: '全部', label: '全部' }]);
const category = ref('全部');
const keyword = ref('');
const sort = ref('sales');
const products = ref<Awaited<ReturnType<typeof api.products>>>([]);
const loading = ref(false);
const cartCount = ref(0);

async function load() {
  loading.value = true;
  try {
    products.value = await api.products({
      category: category.value,
      keyword: keyword.value || undefined,
      sort: sort.value,
    });
  } finally {
    loading.value = false;
  }
}

async function refreshCart() {
  if (!getToken()) {
    cartCount.value = 0;
    return;
  }
  try {
    const c = await api.cart();
    cartCount.value = c.count;
  } catch {
    cartCount.value = 0;
  }
}

onMounted(async () => {
  try {
    categories.value = await api.productCategories();
  } catch {
    /* keep default */
  }
  await load();
  await refreshCart();
});

defineExpose({ refreshCart });
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 40; background: var(--color-page); overflow: auto; padding-bottom: 24px; }
.nav {
  display: grid; grid-template-columns: 40px 1fr auto; align-items: center;
  padding: calc(12px + env(safe-area-inset-top)) 12px 10px; position: sticky; top: 0;
  background: rgba(247,248,250,.96); backdrop-filter: blur(8px); z-index: 2;
}
.nav h1 { margin: 0; text-align: center; font-size: 17px; font-weight: 700; color: var(--color-ink); }
.nav button { border: 0; background: transparent; font-size: 26px; color: var(--color-ink); }
.cart-btn { position: relative; font-size: 13px !important; font-weight: 600; color: var(--color-brand); }
.badge {
  position: absolute; top: -4px; right: -8px; min-width: 16px; height: 16px; border-radius: 999px;
  background: var(--color-accent); color: #fff; font-size: 10px; display: grid; place-items: center;
}
.search { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 0 16px 10px; }
.search input {
  height: 40px; border: 1px solid var(--color-line); border-radius: var(--radius-full); padding: 0 12px;
}
.search button {
  border: 0; border-radius: var(--radius-full); padding: 0 14px; background: var(--color-brand); color: #fff; font-weight: 650;
}
.cats, .sorts { display: flex; gap: 8px; padding: 0 16px 10px; overflow-x: auto; }
.cats button, .sorts button {
  flex: 0 0 auto; border: 0; border-radius: 999px; padding: 7px 12px; background: var(--color-divider); font-size: 12px; color: var(--color-sub);
}
.cats button.on, .sorts button.on { background: var(--color-brand); color: #fff; }
.tip { margin: 0 16px 12px; font-size: 12px; color: var(--color-sub); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 16px; }
.card { overflow: hidden; border-radius: var(--radius-lg); background: #fff; border: 1px solid var(--color-line); box-shadow: var(--shadow-card); }
.cover {
  height: 120px; position: relative; background: var(--color-brand-light); overflow: hidden;
}
.cover img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.badge-yx {
  position: absolute; top: 8px; left: 8px; z-index: 1;
  background: linear-gradient(135deg, #e6b85c, #d4a03a); color: #fff;
  font-size: 10px; border-radius: 8px; padding: 3px 8px; font-weight: 650; box-shadow: var(--shadow-trust);
}
.body { padding: 10px; }
.body h3 { margin: 0; font-size: 13px; line-height: 1.35; height: 36px; overflow: hidden; color: var(--color-ink); font-weight: 650; }
.body p { margin: 4px 0 8px; font-size: 11px; color: var(--color-sub); height: 30px; overflow: hidden; }
.rate { font-size: 11px; color: var(--color-gold); font-weight: 700; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
.foot { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.foot strong { color: var(--color-accent); font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.foot small { text-decoration: line-through; color: var(--color-faint); font-size: 11px; }
.foot span { margin-left: auto; font-size: 11px; color: var(--color-faint); }
.empty { text-align: center; color: var(--color-faint); padding: 40px; }
</style>
