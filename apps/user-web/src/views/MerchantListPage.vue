<template>
  <div class="page list-page">
    <div class="bg-paws" aria-hidden="true" />
    <PetMotifs tone="soft" />

    <header class="nav">
      <div class="head">
        <div class="titles">
          <p class="brand">
            <span class="brand-paw" aria-hidden="true" />
            宠伴 · 附近实景
          </p>
          <h1>
            <span class="bone" aria-hidden="true" />
            找店
            <span class="bone flip" aria-hidden="true" />
          </h1>
          <p class="sub">高德实时周边 · 严选认证优先推荐</p>
        </div>
      </div>

      <div class="search-bar">
        <span class="lens" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8" />
            <path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </span>
        <input
          v-model="keyword"
          :placeholder="searchPlaceholder"
          @keyup.enter="searchNow"
        />
        <button v-if="keyword" type="button" class="clear" @click="clearKeyword">清除</button>
      </div>

      <div class="chips">
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          :class="{ on: filter === f.key }"
          @click="setModule(f.key)"
        >
          <span class="chip-ico" aria-hidden="true">{{ f.icon }}</span>
          {{ f.label }}
        </button>
      </div>
      <div class="sorts">
        <button
          v-for="s in sorts"
          :key="s.key"
          type="button"
          :class="{ on: sort === s.key }"
          @click="sort = s.key"
        >
          {{ s.label }}
        </button>
      </div>
      <p class="kw-hint">
        搜索词：<b>{{ activeKeywords }}</b>
        <span v-if="!amapConfigured"> · 演示模式（未配置高德 Key）</span>
      </p>
    </header>

    <div class="summary">
      <span class="count">
        <i class="count-paw" aria-hidden="true" />
        <template v-if="loading">正在搜索附近…</template>
        <template v-else>
          附近 <b>{{ sorted.length }}</b> 家
          · 认证 <b>{{ certifiedCount }}</b>
        </template>
      </span>
      <button type="button" class="loc" @click="searchNow">
        {{ location.live ? locationLabel(location) + ' · 刷新' : '开启定位找附近' }}
      </button>
    </div>
    <p v-if="tip" class="tip-banner">{{ tip }}</p>

    <div class="list">
      <MerchantCard
        v-for="m in sorted"
        :key="m.id"
        :merchant="m"
        @click="onOpen(m)"
      />
      <div v-if="!loading && !sorted.length" class="empty-pet">
        <p>附近暂无结果，换个模块或关键词试试</p>
        <button type="button" class="empty-cta" @click="reset">重置</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import MerchantCard from '../components/MerchantCard.vue';
import PetMotifs from '../components/PetMotifs.vue';
import type { Merchant } from '../data/mock';
import { api } from '../api';
import {
  locationLabel,
  onLocationSignificantChange,
  startLocationWatch,
  useUserLocation,
} from '../lib/user-location';

const emit = defineEmits<{ 'open-merchant': [string] }>();

const MODULE_KEYWORDS: Record<string, string> = {
  全部: '宠物店|宠物医院|宠物美容',
  医疗: '宠物医院|动物医院',
  洗护: '宠物美容|宠物洗护|宠物店',
  寄养: '宠物寄养|宠物酒店',
  训练: '宠物训练|训犬',
};

const { location } = useUserLocation();
const merchants = ref<Merchant[]>([]);
const keyword = ref('');
const filter = ref('全部');
const sort = ref('综合');
const loading = ref(false);
const tip = ref('');
const amapConfigured = ref(true);
const certifiedCount = ref(0);
const activeKeywords = ref(MODULE_KEYWORDS['全部']!);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let reqSeq = 0;

const filters = [
  { key: '全部', label: '全部', icon: '✦' },
  { key: '医疗', label: '医疗', icon: '✚' },
  { key: '洗护', label: '洗护', icon: '♨' },
  { key: '寄养', label: '寄养', icon: '⌂' },
  { key: '训练', label: '训练', icon: '◆' },
];
const sorts = [
  { key: '综合', label: '综合' },
  { key: '距离', label: '距离' },
  { key: '评分', label: '评分' },
  { key: '信用分', label: '信用分' },
];

const searchPlaceholder = computed(() => {
  const base = MODULE_KEYWORDS[filter.value] || '宠物店';
  return `默认「${base.split('|')[0]}」· 可改关键词回车搜索`;
});

function normalize(list: Merchant[]) {
  return list.map((m) => ({
    ...m,
    tags: Array.isArray(m.tags) ? m.tags : [],
    services: Array.isArray(m.services) ? m.services : [],
    reviews: Array.isArray(m.reviews) ? m.reviews : [],
    rating: Number(m.rating || 0),
    inspectedAt: m.inspectedAt || (m.selectedBadge ? '待更新' : '未认证'),
    coverTone: m.coverTone || 'linear-gradient(145deg,#1a9e8e,#0f6f66)',
    selectedBadge: !!m.selectedBadge,
    source: m.source || (String(m.id).startsWith('amap:') ? 'amap' : 'certified'),
    bookable: m.bookable !== false && !String(m.id).startsWith('amap:'),
  }));
}

async function loadNearby() {
  const seq = ++reqSeq;
  loading.value = true;
  tip.value = '';
  try {
    const data = await api.merchantsNearby({
      city: location.value.city || undefined,
      lat: String(location.value.lat),
      lng: String(location.value.lng),
      module: filter.value,
      keyword: keyword.value.trim() || undefined,
      limit: 10,
    });
    if (seq !== reqSeq) return;
    merchants.value = normalize(data.items || []);
    activeKeywords.value = data.keywords || MODULE_KEYWORDS[filter.value] || '宠物店';
    amapConfigured.value = data.amapConfigured !== false;
    certifiedCount.value = data.certifiedCount ?? merchants.value.filter((m) => m.selectedBadge).length;
  } catch (e) {
    if (seq !== reqSeq) return;
    tip.value = e instanceof Error ? e.message : '附近搜索失败';
  } finally {
    if (seq === reqSeq) loading.value = false;
  }
}

function scheduleSearch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void loadNearby();
  }, 380);
}

function searchNow() {
  if (debounceTimer) clearTimeout(debounceTimer);
  void loadNearby();
}

function setModule(key: string) {
  filter.value = key;
  // 切模块时清空自定义词，用模块默认关键词实时搜
  keyword.value = '';
  searchNow();
}

function clearKeyword() {
  keyword.value = '';
  searchNow();
}

function reset() {
  keyword.value = '';
  filter.value = '全部';
  sort.value = '综合';
  searchNow();
}

function onOpen(m: Merchant) {
  tip.value = '';
  if (m.source === 'amap' || String(m.id).startsWith('amap:') || m.bookable === false) {
    tip.value = '该店来自高德地图实景，尚未通过宠伴实地认证，暂不可在线预约；可优先选择带「严选认证」的门店。';
    return;
  }
  emit('open-merchant', m.id);
}

const sorted = computed(() => {
  const list = [...merchants.value];
  if (sort.value === '距离') list.sort((a, b) => a.distanceKm - b.distanceKm);
  if (sort.value === '评分') list.sort((a, b) => b.rating - a.rating);
  if (sort.value === '信用分') list.sort((a, b) => b.creditScore - a.creditScore);
  // 综合：后端已按认证优先；前端保持认证在前
  if (sort.value === '综合') {
    list.sort((a, b) => {
      const ac = a.selectedBadge ? 1 : 0;
      const bc = b.selectedBadge ? 1 : 0;
      if (ac !== bc) return bc - ac;
      return a.distanceKm - b.distanceKm;
    });
  }
  return list;
});

let unsubLoc: (() => void) | null = null;

let pollTimer: ReturnType<typeof setInterval> | null = null;

function onVis() {
  if (document.visibilityState === 'visible') void loadNearby();
}

onMounted(() => {
  startLocationWatch();
  unsubLoc = onLocationSignificantChange(() => {
    void loadNearby();
  });
  void loadNearby();
  document.addEventListener('visibilitychange', onVis);
  // 认证状态变更后回前台自动同步；定位变化也会触发
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') void loadNearby();
  }, 40000);
});

onUnmounted(() => {
  unsubLoc?.();
  if (debounceTimer) clearTimeout(debounceTimer);
  document.removeEventListener('visibilitychange', onVis);
  if (pollTimer) clearInterval(pollTimer);
});

watch(keyword, () => {
  scheduleSearch();
});
</script>

<style scoped>
.list-page {
  position: relative;
  background:
    radial-gradient(120% 55% at 100% 0%, rgba(255, 186, 140, 0.2), transparent 50%),
    radial-gradient(90% 45% at 0% 8%, rgba(26, 158, 142, 0.1), transparent 45%),
    #f4f7f6;
}

.bg-paws {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='%231a9e8e'%3E%3Cellipse cx='40' cy='48' rx='10' ry='8'/%3E%3Ccircle cx='30' cy='36' r='4.2'/%3E%3Ccircle cx='38' cy='32' r='4.2'/%3E%3Ccircle cx='47' cy='33' r='4'/%3E%3Ccircle cx='53' cy='39' r='3.6'/%3E%3Cellipse cx='100' cy='98' rx='10' ry='8' transform='rotate(22 100 98)'/%3E%3Ccircle cx='90' cy='86' r='4.2'/%3E%3Ccircle cx='98' cy='82' r='4.2'/%3E%3Ccircle cx='107' cy='83' r='4'/%3E%3Ccircle cx='113' cy='89' r='3.6'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 140px 140px;
  z-index: 0;
}

.list-page > :not(.motifs):not(.bg-paws) {
  position: relative;
  z-index: 1;
}

.nav {
  position: sticky;
  top: 0;
  z-index: 8;
  padding: calc(10px + env(safe-area-inset-top)) 16px 12px;
  background: rgba(244, 247, 246, 0.88);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(26, 158, 142, 0.08);
}

.head {
  margin-bottom: 12px;
}

.brand {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 750;
  color: var(--color-brand-dark, #14756b);
  letter-spacing: 0.04em;
}

.brand-paw {
  width: 12px;
  height: 12px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%2314756b' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%2314756b' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%2314756b' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}

.nav h1 {
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  font-size: 24px;
  font-weight: 780;
  letter-spacing: -0.03em;
  color: #1a2a28;
}

.bone {
  width: 22px;
  height: 10px;
  opacity: 0.4;
  flex: 0 0 auto;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Ccircle fill='%231a9e8e' cx='12' cy='12' r='8'/%3E%3Ccircle fill='%231a9e8e' cx='12' cy='24' r='8'/%3E%3Ccircle fill='%231a9e8e' cx='68' cy='12' r='8'/%3E%3Ccircle fill='%231a9e8e' cx='68' cy='24' r='8'/%3E%3Crect fill='%231a9e8e' x='12' y='14' width='56' height='8' rx='4'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.bone.flip {
  transform: scaleX(-1);
}

.sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: #7a8b88;
  font-weight: 550;
}

.search-bar {
  border-color: rgba(26, 158, 142, 0.14);
  box-shadow: 0 6px 16px rgba(24, 48, 42, 0.05);
}
.lens {
  display: grid;
  place-items: center;
  color: #1a9e8e;
  flex: 0 0 auto;
}
.search-bar input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 14px;
  min-width: 0;
  color: #1a2a28;
}
.search-bar input::placeholder {
  color: #9aa8a5;
}
.clear {
  border: 0;
  background: transparent;
  color: var(--color-brand, #1a9e8e);
  font-size: 12px;
  font-weight: 650;
}

.chips,
.sorts {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  overflow-x: auto;
  scrollbar-width: none;
}
.chips::-webkit-scrollbar,
.sorts::-webkit-scrollbar {
  display: none;
}
.chips button {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 7px 13px;
  background: rgba(255, 255, 255, 0.92);
  color: #5a6b68;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(20, 40, 36, 0.04);
}
.chips button.on {
  background: #e6f6f2;
  border-color: rgba(26, 158, 142, 0.22);
  color: #14756b;
  box-shadow: 0 4px 12px rgba(26, 158, 142, 0.12);
}
.chip-ico {
  font-size: 11px;
  line-height: 1;
  opacity: 0.85;
}

.sorts button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 6px 12px;
  background: transparent;
  color: #7a8b88;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
  cursor: pointer;
}
.sorts button.on {
  background: linear-gradient(135deg, #1a9e8e, #159687);
  color: #fff;
  box-shadow: 0 6px 14px rgba(26, 158, 142, 0.25);
}

.kw-hint {
  margin: 10px 0 0;
  font-size: 11px;
  color: #8a9794;
  line-height: 1.4;
}
.kw-hint b {
  color: #14756b;
  font-weight: 700;
}

.summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 0;
  font-size: 12px;
  color: #7a8b88;
}
.count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.count-paw {
  width: 12px;
  height: 12px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.summary b {
  color: #1a2a28;
  font-weight: 750;
}
.loc {
  border: 0;
  background: transparent;
  padding: 0;
  max-width: 52%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c4783a;
  font-size: 11px;
  font-weight: 650;
  text-align: right;
  cursor: pointer;
}

.tip-banner {
  margin: 8px 16px 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff6eb;
  color: #9a5a28;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 550;
}

.list {
  padding: 12px 16px;
}

.empty-pet .empty-cta {
  margin-top: 4px;
  border: 0;
  border-radius: 999px;
  padding: 8px 18px;
  background: var(--color-brand, #1a9e8e);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
</style>
