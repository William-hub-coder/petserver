<template>
  <div class="wrap">
    <section class="card">
      <div class="hd">
        <h2>领养 / 宠物售卖审核</h2>
        <button type="button" @click="load">刷新</button>
      </div>
      <p class="note">
        售卖须核验证照与检疫摘要；领养须确认机构合作信息（可有偿）。通过后用户端可见，驳回将站内信通知发布方。
      </p>
      <p v-if="error" class="err">{{ error }}</p>
      <p v-else-if="!queue.length" class="empty">暂无待审信息</p>
      <article v-for="row in queue" :key="row.id" class="item">
        <div class="cover" v-if="row.coverUrl">
          <img :src="row.coverUrl" alt="" />
        </div>
        <div class="body">
          <div class="top">
            <strong>{{ row.title }}</strong>
            <span class="tag">{{ row.channelLabel || (row.channel === 'adopt' ? '领养' : '宠物售卖') }}</span>
            <span v-if="row.channel === 'adopt'" class="tag muted">{{ row.free ? '无偿' : `有偿 ¥${row.price ?? Math.round((row.priceCents || 0) / 100)}` }}</span>
          </div>
          <p>{{ row.species }} · {{ row.breed || '—' }} · {{ row.merchantName }}</p>
          <p v-if="row.channel === 'sale'" class="lic">
            证照 {{ row.licenseNo || '—' }}｜检疫 {{ row.quarantineNote || '—' }}
          </p>
          <p class="meta">发布方 {{ row.publisherName }} · {{ formatTime(row.createdAt) }}</p>
          <div class="actions">
            <button type="button" class="ghost" @click="resolve(row.id, 'reject')">驳回</button>
            <button type="button" @click="resolve(row.id, 'approve')">通过发布</button>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiPost } from '../api';

type Row = {
  id: string;
  channel: string;
  channelLabel?: string;
  title: string;
  species: string;
  breed?: string | null;
  free?: boolean;
  price?: number;
  priceCents?: number;
  licenseNo?: string | null;
  quarantineNote?: string | null;
  coverUrl?: string | null;
  merchantName?: string;
  publisherName?: string;
  createdAt: string;
};

const queue = ref<Row[]>([]);
const error = ref('');

function formatTime(t: string) {
  return t.replace('T', ' ').slice(0, 16);
}

async function load() {
  error.value = '';
  try {
    queue.value = await apiGet<Row[]>('/pet-listings/moderation/queue');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function resolve(id: string, action: 'approve' | 'reject') {
  const note =
    action === 'reject'
      ? prompt('驳回原因（可选）', '请完善证照与健康材料后重新提审') || undefined
      : undefined;
  try {
    await apiPost(`/pet-listings/moderation/${id}/resolve`, { action, note });
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : '处置失败';
  }
}

onMounted(load);
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
.item {
  display: grid; grid-template-columns: 88px 1fr; gap: 12px;
  border-top: 1px solid #eef2f0; padding: 14px 0;
}
.cover { border-radius: 12px; overflow: hidden; height: 88px; background: #eef6f4; }
.cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.top { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tag {
  font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #fbf3e0; color: #b8862e;
}
.tag.muted { background: #eef3f1; color: #567; }
.body p { margin: 6px 0 0; font-size: 13px; color: #456; }
.lic { color: #678 !important; }
.meta { color: #99a !important; font-size: 12px !important; }
.actions { display: flex; gap: 8px; margin-top: 10px; }
button {
  border: 0; border-radius: 10px; padding: 8px 12px; background: #1a9e8e; color: #fff; cursor: pointer;
}
button.ghost { background: #eef3f1; color: #345; }
</style>
