<template>
  <div class="splash" :class="{ out: leaving }" aria-hidden="true">
    <div class="stage">
      <div class="glow" />
      <div class="mark" :class="{ in: entered }">
        <img src="/brand/petpal-logo.png" alt="宠伴 PetPal" width="168" height="168" />
      </div>
      <p class="tag" :class="{ in: entered }">每一家店，我们都替你看过</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const emit = defineEmits<{ done: [] }>();

const entered = ref(false);
const leaving = ref(false);

/** 展示时长（含入场），之后淡出 */
const HOLD_MS = 1600;
const FADE_MS = 520;

onMounted(() => {
  requestAnimationFrame(() => {
    entered.value = true;
  });
  window.setTimeout(() => {
    leaving.value = true;
    window.setTimeout(() => emit('done'), FADE_MS);
  }, HOLD_MS);
});
</script>

<style scoped>
.splash {
  /* 相对视口居中，避免按整页内容高度把 Logo 顶到下方 */
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  background:
    radial-gradient(120% 80% at 50% 42%, rgba(255, 186, 140, 0.32), transparent 55%),
    linear-gradient(165deg, #e8f6f4 0%, #ffffff 48%, #fff5ee 100%);
  transition: opacity 520ms ease, visibility 520ms ease;
}
.splash.out {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
/* Logo 占位居中；标语绝对定位在下方，不把图标顶偏 */
.stage {
  position: relative;
  width: 168px;
  height: 168px;
}
.glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(26, 158, 142, 0.18), transparent 70%);
  filter: blur(2px);
  pointer-events: none;
}
.mark {
  position: relative;
  width: 168px;
  height: 168px;
  border-radius: 36px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 16px 40px rgba(26, 60, 52, 0.12);
  opacity: 0;
  transform: scale(0.88) translateY(10px);
  transition:
    opacity 480ms ease,
    transform 560ms cubic-bezier(0.22, 1, 0.36, 1);
}
.mark.in {
  opacity: 1;
  transform: scale(1) translateY(0);
}
.mark img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.tag {
  position: absolute;
  top: calc(100% + 20px);
  left: 50%;
  margin: 0;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.04em;
  color: #5a6b68;
  opacity: 0;
  transform: translate(-50%, 8px);
  transition:
    opacity 420ms 120ms ease,
    transform 480ms 120ms ease;
}
.tag.in {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
