<template>
  <div>
    <header class="nav"><h1 class="font-h3">信用分</h1></header>
    <div style="padding: 16px; display: grid; gap: 12px">
      <section class="card center">
        <div class="score-ring" :style="{ '--p': score }"><span>{{ score }}</span></div>
        <div class="font-h2" style="margin-top: 12px">{{ gradeText }}</div>
        <p class="font-caption">
          {{ selectedBadge ? '严选认证生效中 · 与运营后台同步' : '完成实地认证后信用分将驱动更多曝光' }}
        </p>
        <button type="button" class="refresh" :disabled="loading" @click="load">
          {{ loading ? '同步中…' : '立即同步' }}
        </button>
      </section>
      <section class="card">
        <h2 class="font-h3">状态说明</h2>
        <div class="dim">
          <span>门店状态</span>
          <strong>{{ status || '—' }}</strong>
        </div>
        <div class="dim">
          <span>严选认证</span>
          <strong>{{ selectedBadge ? '已认证' : '未认证' }}</strong>
        </div>
        <div class="dim">
          <span>最近考察</span>
          <strong>{{ lastInspectedAt || '—' }}</strong>
        </div>
        <p v-if="error" class="err">{{ error }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api } from '../api';

const score = ref(0);
const status = ref('');
const selectedBadge = ref(false);
const lastInspectedAt = ref<string | null>(null);
const loading = ref(false);
const error = ref('');
let timer: ReturnType<typeof setInterval> | null = null;

const gradeText = computed(() => {
  if (score.value >= 90) return '优秀';
  if (score.value >= 80) return '良好';
  if (score.value >= 70) return '一般';
  return '待提升';
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await api.applyStatus();
    score.value = Number(data.creditScore || 0);
    status.value = data.status || '';
    selectedBadge.value = !!data.selectedBadge;
    lastInspectedAt.value = data.lastInspectedAt || null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '同步失败';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, 30000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.center {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.score-ring {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: conic-gradient(#1a9e8e calc(var(--p) * 1%), #e8eef0 0);
  position: relative;
}
.score-ring::after {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: #fff;
}
.score-ring span {
  position: relative;
  z-index: 1;
  font-size: 28px;
  font-weight: 800;
  color: #14756b;
}
.dim {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  font-size: 13px;
  color: #5a6b68;
}
.refresh {
  margin-top: 12px;
  border: 0;
  border-radius: 999px;
  padding: 8px 16px;
  background: #e8f7f3;
  color: #14756b;
  font-weight: 700;
}
.err {
  color: #e85d4c;
  font-size: 13px;
}
.nav {
  padding: calc(12px + env(safe-area-inset-top)) 16px 10px;
  background: #fff;
  border-bottom: 1px solid var(--color-divider, #eef1f0);
}
</style>
