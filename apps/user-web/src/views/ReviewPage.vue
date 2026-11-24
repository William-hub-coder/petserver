<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>评价本次服务</h1>
    </header>
    <div class="body">
      <p class="hint">你的真实评价将展示给后续用户选店参考（需先到店核销）</p>
      <p v-if="meta" class="meta">{{ meta.merchantName }} · {{ meta.serviceName }}</p>

      <h2>整体评分</h2>
      <div class="stars">
        <button v-for="n in 5" :key="n" type="button" @click="rating = n">
          {{ n <= rating ? '★' : '☆' }}
        </button>
      </div>
      <p class="rate-label">{{ rateLabel }}</p>

      <h2>体验标签（可多选）</h2>
      <div class="tags">
        <button
          v-for="t in tagOptions"
          :key="t"
          type="button"
          :class="{ on: selectedTags.includes(t) }"
          @click="toggleTag(t)"
        >
          {{ t }}
        </button>
      </div>

      <h2>文字评价{{ rating <= 2 ? '（必填）' : '（建议填写）' }}</h2>
      <textarea
        v-model="content"
        rows="4"
        placeholder="例如：环境是否干净、服务是否专业、毛孩状态如何…"
      />
      <p v-if="err" class="err">{{ err }}</p>
      <button type="button" class="btn" :disabled="loading" @click="submit">发布评价</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api';

const props = defineProps<{ bookingId: string }>();
const emit = defineEmits<{ close: []; done: [] }>();

const rating = ref(5);
const content = ref('');
const loading = ref(false);
const err = ref('');
const tagOptions = ref<string[]>([]);
const selectedTags = ref<string[]>([]);
const meta = ref<{ merchantName?: string; serviceName?: string } | null>(null);

const rateLabel = computed(() => {
  const map = ['', '很差', '一般', '还行', '满意', '非常满意'];
  return map[rating.value] || '';
});

onMounted(async () => {
  try {
    tagOptions.value = await api.reviewTags();
  } catch {
    tagOptions.value = ['环境干净', '态度专业', '服务细致', '性价比高', '预约准时'];
  }
  try {
    const list = await api.bookings();
    const b = list.find((x) => x.id === props.bookingId);
    if (b) meta.value = { merchantName: b.merchantName, serviceName: b.serviceName };
  } catch {
    /* ignore */
  }
});

function toggleTag(t: string) {
  const i = selectedTags.value.indexOf(t);
  if (i >= 0) selectedTags.value.splice(i, 1);
  else if (selectedTags.value.length < 5) selectedTags.value.push(t);
}

async function submit() {
  loading.value = true;
  err.value = '';
  try {
    await api.createReview({
      bookingId: props.bookingId,
      rating: rating.value,
      content: content.value,
      tags: selectedTags.value,
    });
    emit('done');
  } catch (e) {
    err.value = e instanceof Error ? e.message : '提交失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 45; background: var(--color-page); overflow: auto; }
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-page); }
.nav h1 { margin: 0; font-size: 17px; }
.nav button { border: 0; background: transparent; font-size: 28px; }
.body { padding: 16px 16px 40px; }
.hint { margin: 0 0 10px; font-size: 13px; color: #688; line-height: 1.45; }
.meta { margin: 0 0 14px; font-weight: 600; color: var(--color-primary); }
h2 { font-size: 14px; margin: 16px 0 8px; }
.stars button { border: 0; background: transparent; font-size: 34px; color: #d4a03a; }
.rate-label { margin: 0; color: #d4a03a; font-weight: 600; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tags button {
  border: 1px solid var(--color-border); background: #fff; border-radius: 999px;
  padding: 8px 12px; font-size: 13px;
}
.tags button.on { border-color: var(--color-primary); background: var(--color-primary-light, #e8f7f5); color: var(--color-primary-dark, #0f6f66); font-weight: 600; }
textarea { width: 100%; border: 1px solid var(--color-border); border-radius: 12px; padding: 12px; box-sizing: border-box; }
.btn { width: 100%; margin-top: 16px; height: 46px; border: 0; border-radius: 14px; background: var(--color-primary); color: #fff; font-weight: 700; }
.err { color: #c44; }
</style>
