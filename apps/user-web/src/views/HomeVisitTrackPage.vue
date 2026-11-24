<!-- 上门服务：服务者实时位罀+ 爱宠上门锚点 -->
<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>服务位置</h1>
    </header>
    <p v-if="err" class="err">{{ err }}</p>
    <p v-else-if="loading" class="hint">加载中…</p>
    <template v-else-if="live">
      <div class="status card">
        <strong>{{ live.phaseLabel }}</strong>
        <p>{{ live.serviceName }} · {{ live.merchantName }}</p>
        <p class="addr">{{ live.address }}</p>
        <p v-if="live.etaText">{{ live.etaText }}</p>
      </div>
      <div ref="mapEl" class="map" />
      <p class="hint">绿点为爱宠上门点；橙点为服务者。MVP 爱宠位置=预约地址。</p>
      <NavigateButton
        v-if="live.petAnchor"
        class="navbtn"
        :lat="live.petAnchor.lat"
        :lng="live.petAnchor.lng"
        :name="live.address || '上门点'"
      >
        导航到上门点
      </NavigateButton>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { api } from '../api';
import { createMap, type MapHandle } from '../lib/amap';
import NavigateButton from '../components/NavigateButton.vue';

const props = defineProps<{ bookingId: string }>();
defineEmits<{ close: [] }>();

const mapEl = ref<HTMLElement | null>(null);
const loading = ref(true);
const err = ref('');
const live = ref<Awaited<ReturnType<typeof api.bookingLive>> | null>(null);
let handle: MapHandle | null = null;
let timer: number | null = null;

async function refresh() {
  try {
    live.value = await api.bookingLive(props.bookingId);
    const pet = live.value.petAnchor;
    const provider = live.value.provider;
    const center = provider || pet;
    if (!mapEl.value || !center) return;
    if (!handle) handle = await createMap(mapEl.value, center, 14);
    const markers = [];
    if (pet?.lat != null) {
      markers.push({
        id: 'pet',
        lat: pet.lat,
        lng: pet.lng!,
        title: '爱宠',
        color: '#1a9e8e',
      });
    }
    if (provider) {
      markers.push({
        id: 'p',
        lat: provider.lat,
        lng: provider.lng,
        title: '服务者',
        color: '#e07040',
      });
    }
    handle.setMarkers(markers);
    if (provider && pet?.lat != null) {
      handle.setPolyline([
        { lat: provider.lat, lng: provider.lng },
        { lat: pet.lat, lng: pet.lng! },
      ]);
    }
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
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 48; background: var(--color-page); display: flex; flex-direction: column; }
.nav { display: flex; align-items: center; gap: 8px; padding: 12px; }
.nav h1 { margin: 0; font-size: 17px; }
.nav button { border: 0; background: transparent; font-size: 28px; }
.status { margin: 0 16px 10px; padding: 12px; }
.status p { margin: 4px 0 0; font-size: 13px; color: #456; }
.addr { color: #688 !important; }
.map { flex: 1; min-height: 260px; margin: 0 12px; border-radius: 16px; overflow: hidden; border: 1px solid var(--color-border); }
.hint { padding: 10px 16px; font-size: 12px; color: #899; }
.navbtn { margin: 0 16px 20px; width: calc(100% - 32px); }
.err { color: #c44; padding: 12px 16px; }
</style>
