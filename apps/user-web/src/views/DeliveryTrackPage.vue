<!-- 商城配送实时追踪（美团/淘宝式）；MVP mock 骑手随轮询推迀-->
<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>配送追踪</h1>
    </header>
    <p v-if="err" class="err">{{ err }}</p>
    <p v-else-if="loading" class="hint">加载中…</p>
    <template v-else-if="delivery">
      <div class="status card">
        <strong>{{ delivery.statusLabel }}</strong>
        <p>{{ delivery.courierName }} · {{ delivery.etaText || '计算 ETA…' }}</p>
        <p class="addr">送至 {{ delivery.dest?.address }}</p>
      </div>
      <div ref="mapEl" class="map" />
      <p class="hint">每 4 秒刷新；未配置高德 Key 时使用演示图层与模拟轨迹。</p>
    </template>
    <p v-else class="hint">暂无配送任务，请先在订单中「模拟发货」。</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { api } from '../api';
import { createMap, type MapHandle } from '../lib/amap';

const props = defineProps<{ orderId: string }>();
defineEmits<{ close: [] }>();

const mapEl = ref<HTMLElement | null>(null);
const loading = ref(true);
const err = ref('');
const delivery = ref<Awaited<ReturnType<typeof api.getOrderDelivery>>['delivery']>(null);
let handle: MapHandle | null = null;
let timer: number | null = null;

async function ensureMap(center: { lat: number; lng: number }) {
  if (!mapEl.value) return;
  if (!handle) handle = await createMap(mapEl.value, center, 14);
}

async function refresh() {
  try {
    let data = await api.getOrderDelivery(props.orderId);
    if (!data.delivery) {
      // 自动尝试发货（MVP 联调＋
      data = await api.shipOrder(props.orderId);
    }
    delivery.value = data.delivery;
    if (!delivery.value) return;

    const origin = delivery.value.origin || { lat: 31.235, lng: 121.45 };
    const dest = delivery.value.dest || origin;
    const courier = delivery.value.courier || origin;
    await ensureMap(courier);
    handle?.setMarkers([
      { id: 'o', ...origin, title: '发货', color: '#688' },
      { id: 'd', lat: dest.lat!, lng: dest.lng!, title: '收货', color: '#3d8fd4' },
      { id: 'c', ...courier, title: '骑手', color: '#e07040' },
    ]);
    handle?.setPolyline([origin, courier, { lat: dest.lat!, lng: dest.lng! }]);
    err.value = '';
  } catch (e) {
    err.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await refresh();
  timer = window.setInterval(refresh, 4000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  handle?.destroy();
});

watch(
  () => props.orderId,
  () => refresh(),
);
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 48; background: var(--color-page); display: flex; flex-direction: column; }
.nav { display: flex; align-items: center; gap: 8px; padding: 12px; }
.nav h1 { margin: 0; font-size: 17px; }
.nav button { border: 0; background: transparent; font-size: 28px; }
.status { margin: 0 16px 10px; padding: 12px; }
.status p { margin: 4px 0 0; font-size: 13px; color: #456; }
.addr { color: #688 !important; }
.map { flex: 1; min-height: 260px; margin: 0 12px 12px; border-radius: 16px; overflow: hidden; border: 1px solid var(--color-border); }
.hint { padding: 0 16px 16px; font-size: 12px; color: #899; }
.err { color: #c44; padding: 12px 16px; }
</style>
