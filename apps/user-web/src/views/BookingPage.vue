<template>
  <div class="page">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>预约服务</h1>
    </header>
    <div class="body" v-if="detail">
      <p class="shop">{{ detail.name }}</p>
      <h2>选择服务</h2>
      <button
        v-for="s in detail.services"
        :key="s.id || s.name"
        type="button"
        class="opt"
        :class="{ on: serviceId === (s.id || s.name) }"
        @click="serviceId = s.id || s.name"
      >
        <strong>{{ s.name }}</strong>
        <span>¥{{ s.price }} · {{ s.duration }}</span>
      </button>
      <h2>选择时段</h2>
      <div class="slots">
        <button
          v-for="slot in slots"
          :key="slot.datetime"
          type="button"
          class="opt"
          :class="{ on: bookingAt === slot.datetime }"
          @click="bookingAt = slot.datetime"
        >
          {{ slot.period }} {{ slot.time }}
        </button>
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button type="button" class="btn" :disabled="loading" @click="submit">确认预约</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, getToken } from '../api';

const props = defineProps<{ merchantId: string }>();
const emit = defineEmits<{ close: []; booked: [id: string] }>();

const detail = ref<Awaited<ReturnType<typeof api.merchant>> | null>(null);
const slots = ref<Array<{ period: string; time: string; datetime: string }>>([]);
const serviceId = ref('');
const bookingAt = ref('');
const loading = ref(false);
const err = ref('');

onMounted(async () => {
  detail.value = await api.merchant(props.merchantId);
  const svc = detail.value.services?.[0] as { id?: string; name: string } | undefined;
  if (svc) serviceId.value = svc.id || svc.name;
  const ts = await api.timeslots(props.merchantId);
  slots.value = ts.slots;
  if (slots.value[0]) bookingAt.value = slots.value[0].datetime;
});

async function submit() {
  err.value = '';
  if (!getToken()) {
    err.value = '请先登录（我的 → 登录）';
    return;
  }
  if (!serviceId.value || !bookingAt.value) {
    err.value = '请选择服务与时段';
    return;
  }
  loading.value = true;
  try {
    const b = await api.createBooking({
      merchantId: props.merchantId,
      serviceId: serviceId.value,
      bookingAt: bookingAt.value,
    });
    emit('booked', b.id);
  } catch (e) {
    err.value = e instanceof Error ? e.message : '预约失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 40; background: var(--color-page); display: flex; flex-direction: column; }
.nav { display: flex; align-items: center; gap: 8px; padding: 14px 12px; border-bottom: 1px solid var(--color-divider); background: var(--gradient-brand-head); }
.nav h1 { margin: 0; font-size: 17px; font-weight: 700; color: var(--color-ink); }
.nav button { border: 0; background: transparent; font-size: 28px; line-height: 1; color: var(--color-ink); }
.body { padding: 16px; overflow: auto; }
.shop { color: var(--color-brand); font-weight: 600; }
h2 { font-size: 14px; margin: 16px 0 8px; color: var(--color-ink); }
.opt { width: 100%; text-align: left; border: 1px solid var(--color-line); border-radius: var(--radius-lg); padding: 12px; margin-bottom: 8px; background: #fff; display: flex; justify-content: space-between; box-shadow: var(--shadow-card); }
.opt.on { border-color: var(--color-brand); background: var(--color-brand-light); }
.slots { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.btn { width: 100%; margin-top: 16px; height: 46px; border: 0; border-radius: var(--radius-full); background: var(--color-accent); color: #fff; font-weight: 650; box-shadow: var(--shadow-fab); }
.err { color: var(--color-danger); font-size: 13px; }
</style>
