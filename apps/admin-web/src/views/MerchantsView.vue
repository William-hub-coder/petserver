<template>
  <section class="card">
    <div class="hd">
      <div>
        <h2>认证商家管理</h2>
        <p class="note">
          写入后立即影响用户端「附近好店 / 找店」严选角标 · 每 {{ pollSec }}s 自动同步
          <span v-if="lastSync"> · 上次同步 {{ lastSync }}</span>
        </p>
      </div>
      <div class="actions">
        <label class="auto">
          <input v-model="autoRefresh" type="checkbox" />
          自动刷新
        </label>
        <button type="button" :disabled="loading" @click="load">{{ loading ? '同步中…' : '立即同步' }}</button>
      </div>
    </div>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-else-if="tip" class="ok">{{ tip }}</p>

    <div class="stats">
      <span>全部 <b>{{ items.length }}</b></span>
      <span>严选 <b>{{ certifiedCount }}</b></span>
      <span>在线 <b>{{ onlineCount }}</b></span>
    </div>

    <table width="100%" cellspacing="0" cellpadding="10">
      <thead>
        <tr>
          <th>名称</th>
          <th>类目</th>
          <th>状态</th>
          <th>信用分</th>
          <th>严选</th>
          <th>考察</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in items" :key="m.id">
          <td>
            <strong>{{ m.name }}</strong>
            <small>{{ m.city }}{{ m.district || '' }}</small>
          </td>
          <td>{{ m.category }}</td>
          <td>
            <span class="st" :data-s="m.status">{{ statusLabel(m.status) }}</span>
          </td>
          <td class="score">{{ m.creditScore }}</td>
          <td>
            <span v-if="m.selectedBadge" class="trust">严选认证</span>
            <span v-else class="muted">未认证</span>
          </td>
          <td>{{ m.lastInspectedAt || '—' }}</td>
          <td class="ops">
            <button
              v-if="!m.selectedBadge"
              type="button"
              class="ok-btn"
              :disabled="busyId === m.id"
              @click="certify(m.id, true)"
            >
              通过认证并上线
            </button>
            <button
              v-else
              type="button"
              class="warn"
              :disabled="busyId === m.id"
              @click="certify(m.id, false)"
            >
              撤销严选
            </button>
            <button
              v-if="m.status === 'online'"
              type="button"
              class="ghost"
              :disabled="busyId === m.id"
              @click="setStatus(m.id, 'offline')"
            >
              下线
            </button>
            <button
              v-else
              type="button"
              class="ghost"
              :disabled="busyId === m.id"
              @click="setStatus(m.id, 'online')"
            >
              上线
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { api } from '../api';

type Row = Awaited<ReturnType<typeof api.manageMerchants>>[number];

const items = ref<Row[]>([]);
const error = ref('');
const tip = ref('');
const loading = ref(false);
const busyId = ref('');
const autoRefresh = ref(true);
const lastSync = ref('');
const pollSec = 20;
let timer: ReturnType<typeof setInterval> | null = null;

const certifiedCount = computed(() => items.value.filter((m) => m.selectedBadge).length);
const onlineCount = computed(() => items.value.filter((m) => m.status === 'online').length);

function statusLabel(s: string) {
  const map: Record<string, string> = {
    online: '在线',
    offline: '下线',
    pending_inspect: '待考察',
    rejected: '驳回',
    draft: '草稿',
  };
  return map[s] || s;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    items.value = await api.manageMerchants();
    lastSync.value = new Date().toLocaleTimeString();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function certify(id: string, selectedBadge: boolean) {
  tip.value = '';
  busyId.value = id;
  try {
    await api.setCertification(id, {
      selectedBadge,
      status: selectedBadge ? 'online' : undefined,
      highlight: selectedBadge ? '已通过实地考察认证' : '认证已撤销，待复审',
      note: selectedBadge ? 'admin certify' : 'admin revoke',
    });
    tip.value = selectedBadge
      ? '已通过认证并上线，用户端附近列表将优先展示'
      : '已撤销严选，用户端将不再显示严选角标';
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busyId.value = '';
  }
}

async function setStatus(id: string, status: string) {
  tip.value = '';
  busyId.value = id;
  try {
    await api.setCertification(id, { status });
    tip.value = status === 'online' ? '已上线' : '已下线';
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busyId.value = '';
  }
}

function startPoll() {
  stopPoll();
  if (!autoRefresh.value) return;
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, pollSec * 1000);
}

function stopPoll() {
  if (timer) clearInterval(timer);
  timer = null;
}

watch(autoRefresh, startPoll);

onMounted(() => {
  void load();
  startPoll();
  document.addEventListener('visibilitychange', onVis);
});

function onVis() {
  if (document.visibilityState === 'visible' && autoRefresh.value) void load();
}

onUnmounted(() => {
  stopPoll();
  document.removeEventListener('visibilitychange', onVis);
});
</script>

<style scoped>
.hd {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.hd h2 {
  margin: 0;
}
.note {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary, #7a8b88);
}
.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.auto {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5a6b68;
}
.stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #5a6b68;
}
.stats b {
  color: #14756b;
}
table {
  font-size: 13px;
}
th {
  text-align: left;
  color: var(--color-text-secondary, #7a8b88);
  font-weight: 650;
}
td,
th {
  border-top: 1px solid var(--color-divider, #eef1f0);
  vertical-align: top;
}
td strong {
  display: block;
}
td small {
  display: block;
  color: #9aa8a5;
  margin-top: 2px;
}
.score {
  font-weight: 700;
  color: var(--color-primary, #1a9e8e);
}
.trust {
  display: inline-block;
  background: linear-gradient(135deg, #e6b85c, #d4a03a);
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
}
.muted {
  color: #9aa8a5;
}
.st {
  font-size: 12px;
  font-weight: 700;
}
.st[data-s='online'] {
  color: #14756b;
}
.st[data-s='offline'] {
  color: #9aa8a5;
}
.ops {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ops button,
.actions button {
  border: 0;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.ok-btn {
  background: #1a9e8e;
  color: #fff;
}
.warn {
  background: #fff0e4;
  color: #c4783a;
}
.ghost {
  background: #eef2f1;
  color: #5a6b68;
}
.err {
  color: var(--color-danger, #e85d4c);
}
.ok {
  color: #14756b;
}
</style>
