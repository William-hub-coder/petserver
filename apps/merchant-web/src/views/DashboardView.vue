<template>
  <div>
    <header class="nav">
      <div>
        <p class="hello">早上好，店长</p>
        <h1>{{ profile.name || '经营总览' }}</h1>
      </div>
      <span class="badge" :class="{ on: profile.selectedBadge }">
        {{ profile.selectedBadge ? '严选认证' : '未认证' }}
      </span>
    </header>
    <div class="wrap">
      <section class="hero">
        <div>
          <p>认证状态 · 随运营后台实时同步</p>
          <h2>{{ statusText }}</h2>
          <span>
            {{ profile.selectedBadge ? '用户端附近好店优先展示本店' : '完成实地认证后可进入严选流量池' }}
          </span>
        </div>
        <div class="score">
          <b>{{ profile.creditScore || 0 }}</b>
          <small>信用分</small>
        </div>
      </section>

      <section class="card">
        <div class="hd">
          <h3>入驻 / 认证进度</h3>
          <button type="button" :disabled="loading" @click="load">
            {{ loading ? '同步中…' : '刷新' }}
          </button>
        </div>
        <div class="steps">
          <div
            v-for="(s, i) in stages"
            :key="s"
            class="step"
            :class="{ on: s === current, done: i < idx }"
          >
            <i />{{ labels[s] || s }}
          </div>
        </div>
        <p class="sync">
          自动同步 {{ pollSec }}s
          <span v-if="lastSync"> · 上次 {{ lastSync }}</span>
        </p>
        <p v-if="error" class="err">{{ error }}</p>
      </section>

      <section class="card">
        <h3>对用户端的影响</h3>
        <div class="todo">
          {{
            profile.selectedBadge && profile.status === 'online'
              ? '已在 App「附近好店 / 找店」显示严选认证，可被预约'
              : '尚未进入严选推荐；可在运营后台通过认证后实时生效'
          }}
        </div>
        <div class="todo" v-if="profile.lastInspectedAt">最近考察 {{ profile.lastInspectedAt }}</div>
      </section>

      <section class="quick">
        <RouterLink to="/bookings">预约</RouterLink>
        <RouterLink to="/scan">核销</RouterLink>
        <RouterLink to="/credit-score">信用分</RouterLink>
        <RouterLink to="/price-list">价目</RouterLink>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api';

type Profile = {
  status: string;
  current: string;
  merchantId?: string;
  name?: string | null;
  selectedBadge?: boolean;
  creditScore?: number;
  lastInspectedAt?: string | null;
  stages?: string[];
};

const stages = ref(['apply', 'ai_screen', 'inspect', 'review', 'online']);
const current = ref('apply');
const profile = ref<Profile>({ status: 'draft', current: 'apply', selectedBadge: false, creditScore: 0 });
const error = ref('');
const loading = ref(false);
const lastSync = ref('');
const pollSec = 25;
let timer: ReturnType<typeof setInterval> | null = null;

const labels: Record<string, string> = {
  apply: '提交申请',
  ai_screen: 'AI 初筛',
  inspect: '实地考察',
  review: '总部盲审',
  online: '上线运营',
};

const idx = computed(() => Math.max(0, stages.value.indexOf(current.value)));
const statusText = computed(() => {
  if (profile.value.selectedBadge && profile.value.status === 'online') return '严选在线';
  if (profile.value.status === 'online') return '已上线（未严选）';
  if (profile.value.status === 'offline') return '已下线';
  if (profile.value.status === 'pending_inspect') return '待考察';
  return '入驻中';
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await api.applyStatus();
    profile.value = data;
    if (data.stages?.length) stages.value = data.stages;
    current.value = data.current || 'apply';
    lastSync.value = new Date().toLocaleTimeString();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function onVis() {
  if (document.visibilityState === 'visible') void load();
}

onMounted(() => {
  void load();
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, pollSec * 1000);
  document.addEventListener('visibilitychange', onVis);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  document.removeEventListener('visibilitychange', onVis);
});
</script>

<style scoped>
.nav {
  padding: calc(14px + env(safe-area-inset-top)) 16px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid var(--color-divider);
}
.hello {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.nav h1 {
  margin: 2px 0 0;
  font-size: 22px;
}
.badge {
  background: #eef2f1;
  color: #5a6b68;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
}
.badge.on {
  background: linear-gradient(135deg, #d4a03a, #e6b85c);
  color: #fff;
}
.wrap {
  padding: 14px 16px 28px;
  display: grid;
  gap: 12px;
}
.hero {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #e8f7f3, #fff8f0);
}
.hero p {
  margin: 0;
  font-size: 12px;
  color: #7a8b88;
}
.hero h2 {
  margin: 6px 0;
  font-size: 26px;
}
.hero span {
  font-size: 12px;
  color: #5a6b68;
}
.score {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: #fff;
  display: grid;
  place-items: center;
  align-content: center;
  box-shadow: 0 8px 20px rgba(24, 40, 36, 0.08);
}
.score b {
  font-size: 22px;
  color: #14756b;
}
.score small {
  font-size: 10px;
  color: #8a9794;
}
.card {
  background: #fff;
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 2px 10px rgba(20, 30, 28, 0.04);
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hd h3,
.card h3 {
  margin: 0 0 10px;
  font-size: 15px;
}
.hd button {
  border: 0;
  background: #e8f7f3;
  color: #14756b;
  border-radius: 999px;
  padding: 6px 12px;
  font-weight: 700;
  font-size: 12px;
}
.steps {
  display: grid;
  gap: 8px;
}
.step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #9aa8a5;
}
.step i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e5ebe9;
}
.step.done {
  color: #14756b;
}
.step.done i {
  background: #1a9e8e;
}
.step.on {
  color: #1a2a28;
  font-weight: 700;
}
.step.on i {
  background: #ff8c5a;
  box-shadow: 0 0 0 3px rgba(255, 140, 90, 0.2);
}
.sync {
  margin: 10px 0 0;
  font-size: 11px;
  color: #9aa8a5;
}
.err {
  color: #e85d4c;
  font-size: 13px;
}
.todo {
  padding: 10px 0;
  border-top: 1px solid #eef2f1;
  font-size: 13px;
  color: #5a6b68;
}
.todo:first-of-type {
  border-top: 0;
}
.quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.quick a {
  text-align: center;
  text-decoration: none;
  background: #fff;
  border-radius: 14px;
  padding: 12px 6px;
  font-size: 12px;
  font-weight: 700;
  color: #14756b;
  box-shadow: 0 2px 10px rgba(20, 30, 28, 0.04);
}
</style>
