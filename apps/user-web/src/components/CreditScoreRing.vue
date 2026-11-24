<template>
  <!-- 信用分环：颜色按分数；入场动画建立信任感 -->
  <div class="ring" :style="boxStyle" @click="$emit('click')">
    <svg :width="size" :height="size" viewBox="0 0 80 80">
      <circle
        cx="40"
        cy="40"
        :r="radius"
        fill="none"
        stroke="var(--color-divider)"
        :stroke-width="stroke"
      />
      <circle
        class="progress"
        cx="40"
        cy="40"
        :r="radius"
        fill="none"
        :stroke="strokeColor"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="animatedOffset"
        transform="rotate(-90 40 40)"
      />
    </svg>
    <div class="center">
      <div class="score tabular" :class="sizeClass">{{ displayScore }}</div>
      <div v-if="showLabel" class="label" :style="{ color: strokeColor }">{{ grade }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    score: number;
    size?: number;
    showLabel?: boolean;
  }>(),
  { size: 56, showLabel: true },
);
defineEmits<{ click: [] }>();

const radius = 32;
const stroke = computed(() => (props.size <= 56 ? 6 : 8));
const circumference = 2 * Math.PI * radius;
const displayScore = ref(0);
const animatedOffset = ref(circumference);

const strokeColor = computed(() => {
  if (props.score >= 85) return 'var(--color-trust)';
  if (props.score >= 70) return 'var(--color-warn)';
  return 'var(--color-danger)';
});
const grade = computed(() => {
  if (props.score >= 85) return '优选';
  if (props.score >= 70) return '良好';
  return '待改进';
});
const boxStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));
const sizeClass = computed(() => (props.size >= 80 ? 'lg' : 'sm'));

function animateTo(target: number) {
  const from = displayScore.value;
  const start = performance.now();
  const dur = 900;
  const tick = (t: number) => {
    const p = Math.min(1, (t - start) / dur);
    const ease = 1 - (1 - p) ** 3;
    const v = Math.round(from + (target - from) * ease);
    displayScore.value = v;
    animatedOffset.value = circumference * (1 - Math.min(100, Math.max(0, v)) / 100);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

onMounted(() => animateTo(props.score));
watch(
  () => props.score,
  (n) => animateTo(n),
);
</script>

<style scoped>
.ring {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ring svg {
  width: 100%;
  height: 100%;
}
.progress {
  transition: stroke 0.3s ease;
}
.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.score {
  font-weight: 700;
  color: var(--color-ink);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.score.sm {
  font-size: 14px;
}
.score.lg {
  font-size: 24px;
}
.label {
  font-size: 10px;
  margin-top: 2px;
  font-weight: 600;
}
</style>
