<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>评价商品</h1>
    </header>
    <div class="body">
      <p class="hint">购后真实评价将展示给后续用户选购参考</p>
      <p v-if="productName" class="meta">{{ productName }}</p>

      <h2>评分</h2>
      <div class="stars">
        <button v-for="n in 5" :key="n" type="button" @click="rating = n">
          {{ n <= rating ? '★' : '☆' }}
        </button>
      </div>

      <h2>体验标签</h2>
      <div class="tags">
        <button
          v-for="t in tagOptions"
          :key="t"
          type="button"
          :class="{ on: selected.includes(t) }"
          @click="toggle(t)"
        >
          {{ t }}
        </button>
      </div>

      <h2>文字评价{{ rating <= 2 ? '（必填）' : '' }}</h2>
      <textarea v-model="content" rows="4" placeholder="适口性、包装、发货速度、毛孩反馈…" />
      <p v-if="err" class="err">{{ err }}</p>
      <button type="button" class="btn" :disabled="loading" @click="submit">发布评价</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';

const props = defineProps<{ orderItemId: string; productName?: string }>();
const emit = defineEmits<{ close: []; done: [] }>();

const rating = ref(5);
const content = ref('');
const selected = ref<string[]>([]);
const tagOptions = ref<string[]>([]);
const loading = ref(false);
const err = ref('');

onMounted(async () => {
  try {
    tagOptions.value = await api.productReviewTags();
  } catch {
    tagOptions.value = ['适口性好', '性价比高', '包装完好', '发货快', '毛孩爱吃'];
  }
});

function toggle(t: string) {
  const i = selected.value.indexOf(t);
  if (i >= 0) selected.value.splice(i, 1);
  else if (selected.value.length < 5) selected.value.push(t);
}

async function submit() {
  loading.value = true;
  err.value = '';
  try {
    await api.createProductReview({
      orderItemId: props.orderItemId,
      rating: rating.value,
      content: content.value,
      tags: selected.value,
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
.page { position: absolute; inset: 0; z-index: 50; background: var(--color-page); overflow: auto; }
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; border-bottom: 1px solid var(--color-border); }
.nav h1 { margin: 0; font-size: 17px; }
.nav button { border: 0; background: transparent; font-size: 28px; }
.body { padding: 16px; }
.hint { color: #688; font-size: 13px; }
.meta { font-weight: 700; color: var(--color-primary); }
h2 { font-size: 14px; margin: 16px 0 8px; }
.stars button { border: 0; background: transparent; font-size: 32px; color: #d4a03a; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tags button { border: 1px solid var(--color-border); background: #fff; border-radius: 999px; padding: 8px 12px; font-size: 13px; }
.tags button.on { border-color: var(--color-primary); background: var(--color-primary-light, #e8f7f5); color: var(--color-primary-dark, #0f6f66); }
textarea { width: 100%; border: 1px solid var(--color-border); border-radius: 12px; padding: 12px; box-sizing: border-box; }
.btn { width: 100%; margin-top: 16px; height: 46px; border: 0; border-radius: 14px; background: var(--color-primary); color: #fff; font-weight: 700; }
.err { color: #c44; }
</style>
