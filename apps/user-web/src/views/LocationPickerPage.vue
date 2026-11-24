<!--
  服务定位设置＋
  - 默认使用高精店GPS（街道级逆地理）
  - 可搜索地点自行更换；选定后固定，直到点「使用当前精确定位。
-->
<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>服务定位</h1>
    </header>

    <section class="current card">
      <p class="label">当前用于找店/上门/配送的位置</p>
      <strong>{{ locationLabel(location) }}</strong>
      <p class="addr">{{ locationDetail(location) }}</p>
      <p class="meta">
        <span :class="{ on: location.mode === 'gps' }">
          {{ location.mode === 'gps' ? '高精度定位中' : '手动选点' }}
        </span>
        <span v-if="location.accuracyM != null && location.mode === 'gps'">
          ±{{ Math.round(location.accuracyM) }}m
        </span>
      </p>
      <p v-if="locError && location.mode === 'gps' && !location.live" class="err">
        {{ locError }} · 可在下方搜索手动选点
      </p>
      <button type="button" class="btn" @click="useGps">使用当前精确定位</button>
    </section>

    <section class="search-block">
      <label>自行查找并更换</label>
      <div class="search-row">
        <input
          v-model="q"
          placeholder="小区 / 写字楼 / 商圈 / 地址"
          @keydown.enter.prevent="search"
        />
        <button type="button" :disabled="searching" @click="search">搜索</button>
      </div>
      <p v-if="searchErr" class="err">{{ searchErr }}</p>
      <p v-else-if="searching" class="hint">搜索中…</p>
      <button
        v-for="item in results"
        :key="`${item.lat},${item.lng},${item.name}`"
        type="button"
        class="result"
        @click="pick(item)"
      >
        <strong>{{ item.name }}</strong>
        <span>{{ item.address || `${item.city}${item.district}` }}</span>
      </button>
      <p v-if="!searching && searched && !results.length" class="hint">无结果，换个关键词试试</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../api';
import {
  locationDetail,
  locationLabel,
  setManualLocation,
  usePreciseGps,
  useUserLocation,
} from '../lib/user-location';

const emit = defineEmits<{ close: []; changed: [] }>();
const { location, error: locError } = useUserLocation();

const q = ref('');
const results = ref<
  Array<{
    name: string;
    address: string;
    city: string;
    district: string;
    lat: number;
    lng: number;
  }>
>([]);
const searching = ref(false);
const searched = ref(false);
const searchErr = ref('');

async function search() {
  if (!q.value.trim()) return;
  searching.value = true;
  searched.value = true;
  searchErr.value = '';
  try {
    const data = await api.geoSearch(q.value.trim());
    results.value = data.items || [];
  } catch (e) {
    searchErr.value = e instanceof Error ? e.message : '搜索失败';
    results.value = [];
  } finally {
    searching.value = false;
  }
}

async function pick(item: (typeof results.value)[0]) {
  await setManualLocation(item);
  emit('changed');
  emit('close');
}

function useGps() {
  usePreciseGps();
  emit('changed');
  emit('close');
}
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 50; background: var(--color-page); overflow: auto; }
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; background: var(--gradient-brand-head); }
.nav h1 { margin: 0; font-size: 17px; font-weight: 700; color: var(--color-ink); }
.nav button { border: 0; background: transparent; font-size: 28px; color: var(--color-ink); }
.current { margin: 0 16px 16px; padding: 14px; }
.label { margin: 0; font-size: 12px; color: var(--color-faint); }
.current strong { display: block; margin: 6px 0; font-size: 18px; color: var(--color-ink); }
.addr { margin: 0; font-size: 13px; color: var(--color-sub); line-height: 1.45; }
.meta { display: flex; gap: 10px; margin: 8px 0 12px; font-size: 12px; color: var(--color-faint); }
.meta .on { color: var(--color-brand); font-weight: 700; }
.btn {
  width: 100%; height: 44px; border: 0; border-radius: var(--radius-full);
  background: var(--color-accent); color: #fff; font-weight: 650; box-shadow: var(--shadow-fab);
}
.search-block { padding: 0 16px 28px; }
.search-block label { display: block; font-size: 13px; color: var(--color-sub); margin-bottom: 8px; }
.search-row { display: flex; gap: 8px; }
.search-row input {
  flex: 1; height: 42px; border: 1px solid var(--color-line); border-radius: 12px;
  padding: 0 12px; font-size: 14px;
}
.search-row button {
  border: 0; border-radius: var(--radius-full); padding: 0 14px; background: var(--color-brand); color: #fff; font-weight: 650;
}
.result {
  width: 100%; text-align: left; background: #fff; margin-top: 8px;
  border-radius: var(--radius-lg); padding: 12px; box-shadow: var(--shadow-card); border: 1px solid var(--color-line);
}
.result strong { display: block; font-size: 14px; color: var(--color-ink); }
.result span { display: block; margin-top: 4px; font-size: 12px; color: var(--color-sub); }
.hint, .err { font-size: 12px; margin: 10px 0 0; color: var(--color-sub); }
.err { color: var(--color-danger); }
</style>
