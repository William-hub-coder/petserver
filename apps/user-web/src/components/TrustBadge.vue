<template>
  <!-- 严选认证：金色专属，权威认证第一要素 -->
  <span class="trust-badge" :class="size" @click.stop="$emit('click')">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3z"
        fill="#fff"
      />
      <path
        d="M9.2 12.1l1.8 1.8 3.8-3.8"
        stroke="#D4A03A"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    {{ text }}
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ text?: string; size?: 'standard' | 'small' }>(), {
  text: '严选认证',
  size: 'standard',
});
defineEmits<{ click: [] }>();
</script>

<style scoped>
.trust-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e6b85c 0%, #d4a03a 100%);
  color: #fff;
  font-weight: 650;
  box-shadow: var(--shadow-trust);
  letter-spacing: 0.02em;
}
.trust-badge.standard {
  height: 26px;
  padding: 0 10px;
  font-size: 11px;
}
.trust-badge.small {
  height: 22px;
  padding: 0 8px;
  font-size: 10px;
}
</style>
