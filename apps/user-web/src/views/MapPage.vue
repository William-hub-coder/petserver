<!--
  找店地图：持续定位（watchPosition），用户移动后刷新附近店与地图中心。
-->
<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>附近地图</h1>
      <button type="button" class="loc" @click="$emit('open-location')">换定位</button>
    </header>
    <p class="hint">
      <span class="dot" :class="{ on: location.live }" />
      {{ hint }}
    </p>
    <p v-if="mapTip" class="map-tip">{{ mapTip }}</p>
    <div ref="mapEl" class="map" />
    <div class="sheet-list">
      <button
        v-for="m in merchants"
        :key="m.id"
        type="button"
        class="row"
        @click="$emit('open-merchant', m.id)"
      >
        <strong>{{ m.name }}</strong>
        <span>{{ m.distanceKm ? `${m.distanceKm}km` : m.address }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api } from '../api';
import { createMap, hasAmapJsKey, type MapHandle } from '../lib/amap';
import {
  locationLabel,
  onLocationSignificantChange,
  startLocationWatch,
  useUserLocation,
} from '../lib/user-location';
import type { Merchant } from '../data/mock';

const emit = defineEmits<{ close: []; 'open-merchant': [string]; 'open-location': [] }>();

const { location, error } = useUserLocation();
const mapEl = ref<HTMLElement | null>(null);
const merchants = ref<Merchant[]>([]);
const mapTip = ref('');
let handle: MapHandle | null = null;
let unsub: (() => void) | null = null;

const hint = computed(() => {
  if (error.value && !location.value.live) {
    return `定位未开启（${error.value}）· 可点右上角「换定位」手动选点`;
  }
  if (!location.value.live) return '正在获取实时位置…也可点「换定位」手动选点';
  return `${locationLabel(location.value)} · 位置随你移动更新`;
});

async function loadMerchants(lat: number, lng: number) {
  const list = await api.merchants({
    city: location.value.city || '上海',
    lat: String(lat),
    lng: String(lng),
  });
  merchants.value = (list || []) as Merchant[];
  const shopMarkers = merchants.value
    .filter((m) => m.lat != null && m.lng != null)
    .map((m) => ({
      id: m.id,
      lat: Number(m.lat),
      lng: Number(m.lng),
      title: m.name,
      color: '#1a9e8e',
    }));
  // 用户蓝点 + 商户炀
  handle?.setMarkers([
    {
      id: 'me',
      lat,
      lng,
      title: '我',
      color: '#3d8fd4',
    },
    ...shopMarkers,
  ]);
  handle?.setCenter({ lat, lng });
}

onMounted(async () => {
  if (!mapEl.value) return;
  const map = await createMap(mapEl.value, { lat: location.value.lat, lng: location.value.lng }, 14);
  handle = map;
  if (map.engine === 'lite') {
    mapTip.value = hasAmapJsKey()
      ? '高德地图未加载成功，已用演示图层。请在 .env 配置 VITE_AMAP_SECURITY_CODE（与控制台安全密钥一致）后重启 user-web'
      : '未配置 VITE_AMAP_JS_KEY，当前为演示图层';
  } else {
    mapTip.value = '';
  }
  startLocationWatch();
  unsub = onLocationSignificantChange((s) => {
    void loadMerchants(s.lat, s.lng);
  });
  await loadMerchants(location.value.lat, location.value.lng);
});

onUnmounted(() => {
  unsub?.();
  // 首页/找店仍可能需要定位，不在此全局 stop；仅销毁地图
  handle?.destroy();
  handle = null;
});
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 42; background: var(--color-page); display: flex; flex-direction: column; }
.nav { display: flex; align-items: center; gap: 8px; padding: 12px; }
.nav h1 { margin: 0; font-size: 17px; flex: 1; }
.nav button { border: 0; background: transparent; font-size: 28px; }
.loc { font-size: 14px !important; font-weight: 700; color: var(--color-primary); }
.hint { margin: 0 16px 8px; font-size: 12px; color: #688; display: flex; align-items: center; gap: 6px; }
.map-tip {
  margin: 0 16px 8px;
  font-size: 11px;
  color: #8a6a28;
  background: var(--color-gold-bg);
  border-radius: 10px;
  padding: 8px 10px;
  line-height: 1.4;
}
.dot { width: 7px; height: 7px; border-radius: 50%; background: #bcc; }
.dot.on { background: #1a9e8e; box-shadow: 0 0 0 4px rgba(26,158,142,.2); }
.map { flex: 1; min-height: 220px; margin: 0 12px; border-radius: 16px; overflow: hidden; border: 1px solid var(--color-border); }
.sheet-list { max-height: 38%; overflow: auto; padding: 10px 12px 20px; }
.row {
  width: 100%; text-align: left; border: 0; background: #fff; border-radius: 12px;
  padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; gap: 8px;
  box-shadow: var(--shadow-card);
}
.row span { color: #688; font-size: 12px; }
</style>
