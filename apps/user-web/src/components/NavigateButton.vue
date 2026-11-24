<template>
  <button type="button" class="nav-btn" :class="variant" @click="go">
    <slot>导航前往</slot>
  </button>
</template>

<script setup lang="ts">
import { openAmapNavigation } from '../lib/amap';

const props = withDefaults(
  defineProps<{
    lat?: number | null;
    lng?: number | null;
    name?: string;
    variant?: 'primary' | 'ghost';
  }>(),
  { variant: 'primary' },
);

function go() {
  if (props.lat == null || props.lng == null) {
    alert('该门店暂无坐标，无法导航');
    return;
  }
  openAmapNavigation({ lat: props.lat, lng: props.lng, name: props.name });
}
</script>

<style scoped>
.nav-btn {
  border: 0;
  border-radius: 12px;
  height: 42px;
  padding: 0 14px;
  font-weight: 700;
  cursor: pointer;
}
.nav-btn.primary { background: #3d8fd4; color: #fff; }
.nav-btn.ghost { background: #e8f0f8; color: #3d8fd4; }
</style>
