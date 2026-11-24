<template>
  <div class="page adopt">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>领养售宠</h1>
      <button type="button" class="map-link" @click="$emit('open-map')">地图</button>
    </header>

    <section class="hero">
      <img
        class="hero-bg"
        src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&q=80"
        alt=""
      />
      <div class="hero-veil" />
      <div class="hero-copy">
        <p class="brand">宠伴 · 安心找伴</p>
        <h2>领养 · 宠物售卖</h2>
        <p>猫狗、飞禽、爬宠、小宠等合法物种均可；售宠仅限入驻店/繁育场，不做活体一键下单。</p>
      </div>
    </section>

    <div class="tabs">
      <button type="button" :class="{ on: tab === 'adopt' }" @click="tab = 'adopt'; load()">
        领养
      </button>
      <button type="button" :class="{ on: tab === 'sale' }" @click="tab = 'sale'; load()">
        宠物售卖
      </button>
    </div>

    <p class="comply">
      {{
        tab === 'adopt'
          ? '领养可为无偿或有偿（如疫苗/绝育保证金）· 须申请与回访意愿 · 联系仅走站内会话'
          : '仅入驻宠物店 / 持证繁育场 · 须展示许可证与检疫摘要 · 线下核验成交'
      }}
    </p>

    <div class="filters">
      <button
        v-for="s in speciesFilters"
        :key="s"
        type="button"
        :class="{ on: species === s }"
        @click="species = s; load()"
      >
        {{ s }}
      </button>
    </div>

    <p v-if="loading" class="empty">加载中…</p>
    <p v-else-if="loadError" class="empty err">{{ loadError }}</p>
    <div v-else-if="!list.length" class="empty-pet">
      <p>暂无{{ tab === 'adopt' ? '领养' : '售宠' }}信息</p>
      <button type="button" class="retry" @click="load()">重试</button>
    </div>
    <div v-else class="grid">
      <article
        v-for="item in list"
        :key="item.id"
        class="card pressable"
        @click="$emit('open-listing', item.id)"
      >
        <div class="cover">
          <img :src="coverOf(item)" :alt="item.title" loading="lazy" />
          <div class="shade" />
          <span class="pill" :class="item.channel">{{ pillText(item) }}</span>
          <div class="badges">
            <em v-if="item.vaccinated">已疫苗</em>
            <em v-if="item.sterilized">已绝育</em>
          </div>
          <strong class="title-on">{{ item.title }}</strong>
        </div>
        <div class="meta">
          <span>{{ item.species }} · {{ item.breed || '品种待询' }}</span>
          <span v-if="item.distanceKm != null">{{ item.distanceKm }}km</span>
          <span v-else>{{ item.district || item.city }}</span>
        </div>
        <div class="foot">
          <b v-if="item.free">免费</b>
          <b v-else>¥{{ item.price }}</b>
          <small>{{ item.merchantName }}</small>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api } from '../api';
import { listingCoverUrl } from '../lib/listing-cover';
import { listingSpeciesFilters } from '../lib/pet-species';
import { useUserLocation } from '../lib/user-location';

defineEmits<{ close: []; 'open-listing': [string]; 'open-map': [] }>();

const { location } = useUserLocation();
const tab = ref<'adopt' | 'sale'>('adopt');
const species = ref('全部');
const speciesFilters = listingSpeciesFilters();
const list = ref<Awaited<ReturnType<typeof api.petListings>>>([]);
const loading = ref(false);
const loadError = ref('');

function coverOf(item: { id: string; species: string; coverUrl?: string | null }) {
  return listingCoverUrl(item);
}

function pillText(item: { channel: string; free: boolean; priceLabel?: string }) {
  if (item.priceLabel) return item.priceLabel;
  if (item.channel === 'sale') return '在售';
  return item.free ? '免费领养' : '有偿领养';
}

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    list.value = await api.petListings({
      channel: tab.value,
      species: species.value === '全部' ? undefined : species.value,
      lat: location.value.lat,
      lng: location.value.lng,
      // 不按定位城市硬过滤，避免「上海市」等与演示数据不一致时整页空白
    });
  } catch (e) {
    list.value = [];
    loadError.value = e instanceof Error ? e.message : '加载失败，请检查网络后重试';
  } finally {
    loading.value = false;
  }
}

watch(tab, () => {
  species.value = '全部';
});

onMounted(load);
</script>

<style scoped>
.adopt { padding-bottom: 28px; }
.nav {
  display: grid; grid-template-columns: 40px 1fr auto; align-items: center;
  padding: calc(10px + env(safe-area-inset-top)) 12px 8px;
  position: sticky; top: 0; z-index: 3;
  background: rgba(247,248,250,.92); backdrop-filter: blur(12px);
}
.nav h1 { margin: 0; text-align: center; font-size: 17px; }
.nav button { border: 0; background: transparent; font-size: 26px; color: var(--color-ink); }
.map-link { font-size: 13px !important; font-weight: 650; color: var(--color-brand) !important; }
.hero {
  position: relative; margin: 0 16px 12px; height: 148px; border-radius: 20px; overflow: hidden;
  box-shadow: var(--shadow-card);
}
.hero-bg { width: 100%; height: 100%; object-fit: cover; }
.hero-veil {
  position: absolute; inset: 0;
  background: linear-gradient(120deg, rgba(20,40,34,.72) 10%, rgba(26,158,142,.35) 70%, transparent);
}
.hero-copy {
  position: absolute; left: 16px; right: 16px; bottom: 14px; color: #fff;
}
.brand { margin: 0; font-size: 11px; letter-spacing: .08em; opacity: .9; font-weight: 700; }
.hero-copy h2 { margin: 4px 0; font-size: 20px; letter-spacing: -.02em; }
.hero-copy p { margin: 0; font-size: 12px; line-height: 1.4; opacity: .92; max-width: 90%; }
.tabs { display: flex; gap: 8px; padding: 0 16px 10px; }
.tabs button {
  flex: 1; border: 0; border-radius: 999px; padding: 10px; font-weight: 700; font-size: 13px;
  background: #eef3f1; color: var(--color-sub);
}
.tabs button.on { background: var(--color-brand); color: #fff; box-shadow: 0 8px 18px rgba(26,158,142,.28); }
.comply {
  margin: 0 16px 10px; padding: 10px 12px; border-radius: 12px; font-size: 12px; line-height: 1.45;
  background: var(--color-gold-bg); color: #8a6a28; border: 1px solid rgba(212,160,58,.25);
}
.filters { display: flex; gap: 8px; padding: 0 16px 12px; }
.filters button {
  border: 0; border-radius: 999px; padding: 6px 12px; background: #fff; font-size: 12px;
  color: var(--color-sub); box-shadow: var(--shadow-card);
}
.filters button.on { background: var(--color-brand-light); color: var(--color-brand-dark); font-weight: 700; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 16px; }
.card { overflow: hidden; border-radius: 18px; border: 1px solid rgba(229,231,235,.9); }
.cover { position: relative; height: 150px; background: var(--color-brand-light); }
.cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shade {
  position: absolute; inset: auto 0 0 0; height: 70%;
  background: linear-gradient(180deg, transparent, rgba(20,30,28,.72));
}
.pill {
  position: absolute; top: 8px; left: 8px; z-index: 1;
  font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px; color: #fff;
}
.pill.adopt { background: var(--color-trust); }
.pill.sale { background: linear-gradient(135deg, #e6b85c, #d4a03a); }
.badges { position: absolute; top: 8px; right: 8px; z-index: 1; display: flex; flex-direction: column; gap: 4px; }
.badges em {
  font-style: normal; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 999px;
  background: rgba(255,255,255,.92); color: var(--color-brand-dark);
}
.title-on {
  position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 1;
  color: #fff; font-size: 13px; line-height: 1.3; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.meta {
  display: flex; justify-content: space-between; gap: 6px; padding: 8px 10px 0;
  font-size: 11px; color: var(--color-sub);
}
.foot { display: flex; align-items: baseline; gap: 6px; padding: 6px 10px 10px; }
.foot b { color: var(--color-accent); font-size: 15px; }
.foot small { margin-left: auto; color: var(--color-faint); font-size: 11px; max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { text-align: center; color: var(--color-faint); padding: 36px; }
.empty.err { color: #b26a00; }
.empty-pet { text-align: center; color: var(--color-faint); padding: 36px 16px; }
.retry {
  margin-top: 12px; border: 0; border-radius: 999px; padding: 8px 16px;
  background: var(--color-brand); color: #fff; font-weight: 650; font-size: 13px;
}
</style>
