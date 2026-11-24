<template>
  <div class="wrap">
    <section class="card">
      <h2>A6 消息模板</h2>
      <p v-if="tplError" class="err">{{ tplError }}</p>
      <ul>
        <li v-for="t in templates" :key="t.code || t.id">
          {{ t.title || t.name }}（{{ t.code || t.id }}）
        </li>
      </ul>
      <button type="button" @click="loadTemplates">刷新模板</button>
    </section>

    <section class="card">
      <div class="hd">
        <h2>会话审核队列</h2>
        <button type="button" @click="loadQueue">刷新</button>
      </div>
      <p class="note">关键词拦截与用户举报进入此队列；处置「屏蔽」将关闭会话并隐藏消息。</p>
      <p v-if="qError" class="err">{{ qError }}</p>
      <p v-else-if="!queue.length" class="empty">暂无待审工单</p>
      <article v-for="f in queue" :key="f.id" class="flag">
        <div class="top">
          <strong>{{ f.merchantName || '会话' }}</strong>
          <span>{{ f.userName }}</span>
          <time>{{ formatTime(f.createdAt) }}</time>
        </div>
        <p class="reason">{{ f.reason }}</p>
        <p v-if="f.body" class="body">「{{ f.body }}」</p>
        <div class="actions">
          <button type="button" class="ghost" @click="resolve(f.id, 'dismiss')">忽略</button>
          <button type="button" class="danger" @click="resolve(f.id, 'action')">屏蔽并关房</button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiPost } from '../api';

type Tpl = { id?: string; code?: string; name?: string; title?: string };
type Flag = {
  id: string;
  reason: string;
  createdAt: string;
  body?: string;
  merchantName?: string;
  userName?: string;
};

const templates = ref<Tpl[]>([]);
const queue = ref<Flag[]>([]);
const tplError = ref('');
const qError = ref('');

function formatTime(t: string) {
  return t.replace('T', ' ').slice(0, 16);
}

async function loadTemplates() {
  tplError.value = '';
  try {
    templates.value = await apiGet<Tpl[]>('/messages/templates');
  } catch (e) {
    tplError.value = `模板不可用：${e instanceof Error ? e.message : String(e)}`;
  }
}

async function loadQueue() {
  qError.value = '';
  try {
    queue.value = await apiGet<Flag[]>('/messages/moderation/queue');
  } catch (e) {
    qError.value = `队列不可用：${e instanceof Error ? e.message : String(e)}`;
  }
}

async function resolve(id: string, action: 'dismiss' | 'action') {
  try {
    await apiPost(`/messages/moderation/${id}/resolve`, { action });
    await loadQueue();
  } catch (e) {
    qError.value = e instanceof Error ? e.message : '处置失败';
  }
}

onMounted(() => {
  loadTemplates();
  loadQueue();
});
</script>

<style scoped>
.wrap { display: flex; flex-direction: column; gap: 16px; }
.card {
  background: #fff; border-radius: 16px; padding: 18px 20px;
  box-shadow: 0 1px 0 rgba(20,40,30,0.06);
}
.hd { display: flex; justify-content: space-between; align-items: center; }
h2 { margin: 0 0 10px; font-size: 18px; }
.note { color: #678; font-size: 13px; margin: 0 0 12px; }
.err { color: #a33; }
.empty { color: #899; padding: 20px 0; }
.flag {
  border-top: 1px solid #eef2f0; padding: 12px 0;
}
.flag .top { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.flag time { margin-left: auto; color: #99a; font-size: 12px; }
.reason { margin: 6px 0; font-weight: 600; }
.body { margin: 0 0 8px; color: #456; font-size: 13px; }
.actions { display: flex; gap: 8px; }
button {
  border: 0; border-radius: 10px; padding: 8px 12px; background: #1a9e8e; color: #fff; cursor: pointer;
}
button.ghost { background: #eef3f1; color: #345; }
button.danger { background: #d4573c; }
</style>
