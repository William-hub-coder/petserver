<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>到店核销码</h1>
    </header>
    <div class="body" v-if="data">
      <div class="code">{{ data.verifyCode }}</div>
      <p>请向商家出示此码完成核销</p>
      <p class="sub">{{ data.qrPayload }}</p>
    </div>
    <p v-else class="body">{{ err || '加载中…' }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';

const props = defineProps<{ bookingId: string }>();
defineEmits<{ close: [] }>();
const data = ref<Awaited<ReturnType<typeof api.qrcode>> | null>(null);
const err = ref('');

onMounted(async () => {
  try {
    data.value = await api.qrcode(props.bookingId);
  } catch (e) {
    err.value = e instanceof Error ? e.message : '加载失败';
  }
});
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 45; background: var(--color-brand-dark); color: #fff; }
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; }
.nav h1 { margin: 0; font-size: 17px; font-weight: 700; }
.nav button { border: 0; background: transparent; color: #fff; font-size: 28px; }
.body { text-align: center; padding: 48px 24px; }
.code { font-size: 40px; letter-spacing: 6px; font-weight: 800; background: #fff; color: var(--color-brand-dark); border-radius: var(--radius-lg); padding: 28px 16px; font-variant-numeric: tabular-nums; box-shadow: var(--shadow-elevated); }
.sub { opacity: 0.75; font-size: 12px; word-break: break-all; }
</style>
