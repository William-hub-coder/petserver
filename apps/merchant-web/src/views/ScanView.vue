<template>
  <div>
    <header class="nav"><h1 class="font-h3">扫码核销</h1></header>
    <div style="padding: 16px">
      <section class="card scanner">
        <div class="frame">将核销码置于框内</div>
        <p class="font-caption" style="margin-top: 12px; text-align: center">H5 先支持手动输码</p>
      </section>
      <section class="card" style="margin-top: 12px">
        <input v-model="code" class="input" placeholder="输入核销码" />
        <button class="btn-accent" style="width: 100%; margin-top: 12px" type="button" :disabled="loading" @click="verify">
          确认核销
        </button>
        <p v-if="tip" class="font-caption" style="margin-top: 12px; color: var(--color-primary)">{{ tip }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../api';

const code = ref('');
const tip = ref('');
const loading = ref(false);

async function verify() {
  if (!code.value.trim()) {
    tip.value = '请输入核销码';
    return;
  }
  loading.value = true;
  tip.value = '';
  try {
    const data = await api.verify(code.value.trim());
    tip.value = data.alreadyVerified
      ? `该单已核销（${data.id}）`
      : `核销成功：${data.id} · ${data.status}`;
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '核销失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.scanner { background: #111; color: #fff; }
.frame {
  height: 220px; border: 2px dashed rgba(255,255,255,.5); border-radius: 12px;
  display: grid; place-items: center; color: rgba(255,255,255,.8);
}
.input {
  width: 100%; height: 44px; border: 1px solid var(--color-border); border-radius: 12px; padding: 0 12px;
}
</style>
