<template>
  <section class="card">
    <div class="head">
      <div>
        <h2>盲审评审队列</h2>
        <p class="sub">商户名 / 专员名已脱敏，仅基于证据决策</p>
      </div>
      <button type="button" @click="load">刷新队列</button>
    </div>
    <p v-if="error" class="err">{{ error }}</p>
    <div v-else class="list">
      <article v-for="item in items" :key="item.id" class="row">
        <div>
          <div class="title">{{ item.merchantAlias }}</div>
          <div class="meta">预览分 {{ item.scorePreview }} · {{ item.status }}</div>
        </div>
        <div class="actions">
          <button type="button" class="ghost">查看证据</button>
          <button type="button">进入评审</button>
        </div>
      </article>
      <div v-if="!items.length" class="empty">暂无待审任务</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet } from '../api';

type Item = {
  id: string;
  merchantAlias: string;
  scorePreview: number;
  status: string;
};

const items = ref<Item[]>([]);
const error = ref('');

async function load() {
  error.value = '';
  try {
    items.value = await apiGet<Item[]>('/inspect/reviews/queue');
  } catch (e) {
    error.value = `网关不可用：${e instanceof Error ? e.message : String(e)}`;
  }
}

onMounted(load);
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 8px;
}
.sub {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.err {
  color: var(--color-danger);
}
.list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f7fbfa;
  border: 1px solid #e8f0ed;
}
.title {
  font-weight: 600;
  margin-bottom: 4px;
}
.meta {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.actions {
  display: flex;
  gap: 8px;
}
.ghost {
  background: #fff;
  color: var(--color-primary-dark);
  border: 1px solid rgba(26, 158, 142, 0.3);
}
.empty {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: 28px 0;
}
</style>
