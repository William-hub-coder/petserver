<template>
  <nav class="tabbar" aria-label="主导航">
    <span class="stitch" aria-hidden="true" />
    <button
      v-for="item in leftTabs"
      :key="item.index"
      class="tab"
      :class="{ active: modelValue === item.index }"
      type="button"
      @click="$emit('update:modelValue', item.index)"
    >
      <span class="icon-wrap">
        <component :is="modelValue === item.index ? item.activeIcon : item.icon" />
      </span>
      <span class="label">{{ item.label }}</span>
    </button>

    <div class="fab-slot" aria-hidden="true" />

    <button
      v-for="item in rightTabs"
      :key="item.index"
      class="tab"
      :class="{ active: modelValue === item.index }"
      type="button"
      @click="$emit('update:modelValue', item.index)"
    >
      <span class="icon-wrap">
        <component :is="modelValue === item.index ? item.activeIcon : item.icon" />
      </span>
      <span class="label">{{ item.label }}</span>
    </button>

    <button
      class="fab"
      :class="{ active: modelValue === 2 }"
      type="button"
      aria-label="AI助手"
      @click="$emit('update:modelValue', 2)"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"
          fill="currentColor"
        />
        <path
          d="M18.5 14.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"
          fill="currentColor"
          opacity="0.85"
        />
      </svg>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { h } from 'vue';

withDefaults(
  defineProps<{
    modelValue: number;
    unread?: number;
  }>(),
  { unread: 0 },
);
defineEmits<{ 'update:modelValue': [number] }>();

function iconHome(filled = false) {
  return {
    render: () =>
      h(
        'svg',
        { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' },
        filled
          ? [h('path', { d: 'M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z', fill: 'currentColor' })]
          : [
              h('path', {
                d: 'M4.5 10.8L12 4.5l7.5 6.3V20a.8.8 0 01-.8.8h-4.7v-5.5H10v5.5H5.3a.8.8 0 01-.8-.8v-9.2z',
                stroke: 'currentColor',
                'stroke-width': '1.6',
                'stroke-linejoin': 'round',
              }),
            ],
      ),
  };
}

function iconStore(filled = false) {
  return {
    render: () =>
      h(
        'svg',
        { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' },
        filled
          ? [h('path', { d: 'M4 7l1.2-3h13.6L20 7v2a3 3 0 01-3 3 3 3 0 01-3-2.8A3 3 0 0111 12a3 3 0 01-3-2.8A3 3 0 015 12a3 3 0 01-3-3V7zm2 8h12v5H6v-5z', fill: 'currentColor' })]
          : [
              h('path', {
                d: 'M4.5 7.2L5.5 4.5h13l1 2.7V9a2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0 2.5 2.5 0 01-5 0V7.2zM6.5 14.5h11V19h-11v-4.5z',
                stroke: 'currentColor',
                'stroke-width': '1.6',
                'stroke-linejoin': 'round',
              }),
            ],
      ),
  };
}

function iconCircle(filled = false) {
  return {
    render: () =>
      h(
        'svg',
        { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' },
        filled
          ? [
              h('ellipse', { cx: '12', cy: '15.2', rx: '4.2', ry: '3.6', fill: 'currentColor' }),
              h('circle', { cx: '7.2', cy: '9.8', r: '2.1', fill: 'currentColor' }),
              h('circle', { cx: '10.6', cy: '8.2', r: '2.1', fill: 'currentColor' }),
              h('circle', { cx: '14.2', cy: '8.2', r: '2.1', fill: 'currentColor' }),
              h('circle', { cx: '17.2', cy: '10.2', r: '2', fill: 'currentColor' }),
            ]
          : [
              h('ellipse', {
                cx: '12',
                cy: '15.2',
                rx: '4.2',
                ry: '3.6',
                stroke: 'currentColor',
                'stroke-width': '1.6',
              }),
              h('circle', { cx: '7.2', cy: '9.8', r: '2', stroke: 'currentColor', 'stroke-width': '1.5' }),
              h('circle', { cx: '10.6', cy: '8.2', r: '2', stroke: 'currentColor', 'stroke-width': '1.5' }),
              h('circle', { cx: '14.2', cy: '8.2', r: '2', stroke: 'currentColor', 'stroke-width': '1.5' }),
              h('circle', { cx: '17.2', cy: '10.2', r: '1.9', stroke: 'currentColor', 'stroke-width': '1.5' }),
            ],
      ),
  };
}

function iconMe(filled = false) {
  return {
    render: () =>
      h(
        'svg',
        { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' },
        filled
          ? [
              h('circle', { cx: '12', cy: '8', r: '3.5', fill: 'currentColor' }),
              h('path', { d: 'M5 19.2c.8-3.4 3.4-5.2 7-5.2s6.2 1.8 7 5.2', fill: 'currentColor' }),
            ]
          : [
              h('circle', { cx: '12', cy: '8', r: '3.2', stroke: 'currentColor', 'stroke-width': '1.6' }),
              h('path', {
                d: 'M5.5 19c.9-3.1 3.3-4.7 6.5-4.7s5.6 1.6 6.5 4.7',
                stroke: 'currentColor',
                'stroke-width': '1.6',
                'stroke-linecap': 'round',
              }),
            ],
      ),
  };
}

const leftTabs = [
  { index: 0, label: '首页', icon: iconHome(false), activeIcon: iconHome(true) },
  { index: 1, label: '找店', icon: iconStore(false), activeIcon: iconStore(true) },
];
const rightTabs = [
  { index: 3, label: '圈子', icon: iconCircle(false), activeIcon: iconCircle(true) },
  { index: 4, label: '我的', icon: iconMe(false), activeIcon: iconMe(true) },
];
</script>

<style scoped>
.tabbar {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: 390px;
  height: calc(var(--tabbar-height) + env(safe-area-inset-bottom, 16px));
  padding: 0 0 env(safe-area-inset-bottom, 16px);
  display: grid;
  grid-template-columns: 1fr 1fr 52px 1fr 1fr;
  align-items: start;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 0.5px solid rgba(26, 158, 142, 0.14);
  box-shadow: var(--shadow-fixed);
  z-index: 50;
}
.tabbar .stitch {
  position: absolute;
  left: 28px;
  right: 28px;
  top: 0;
  height: 0;
  border-top: 1.5px dashed rgba(26, 158, 142, 0.22);
  pointer-events: none;
}
.tab {
  position: relative;
  border: 0;
  background: transparent;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: color 0.2s ease;
}
.tab.active {
  color: var(--color-brand);
}
.tab.active .icon-wrap {
  transform: translateY(-1px);
}
.tab.active .label {
  font-weight: 700;
}
.icon-wrap {
  position: relative;
  width: 28px;
  height: 24px;
  display: grid;
  place-items: center;
  transition: transform 180ms var(--ease-out);
}
.label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.fab-slot {
  width: 52px;
}
.fab {
  position: absolute;
  left: 50%;
  top: -20px;
  transform: translateX(-50%);
  width: var(--fab-size);
  height: var(--fab-size);
  border: 3px solid #fff;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.22), transparent 42%),
    var(--color-accent);
  color: #fff;
  box-shadow: var(--shadow-fab), 0 0 0 1px rgba(26, 158, 142, 0.08);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 110ms var(--ease-out), box-shadow 0.18s ease;
}
.tabbar::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 6px;
  width: 12px;
  height: 12px;
  opacity: 0.14;
  pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.tabbar::after {
  content: '';
  position: absolute;
  right: 14px;
  top: 8px;
  width: 16px;
  height: 8px;
  opacity: 0.12;
  pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Crect fill='%231a9e8e' x='22' y='14' width='36' height='8' rx='4'/%3E%3Ccircle fill='%231a9e8e' cx='14' cy='12' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='14' cy='24' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='66' cy='12' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='66' cy='24' r='7'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.fab:active {
  transform: translateX(-50%) scale(0.97);
}
.fab.active {
  box-shadow: 0 10px 24px rgba(255, 140, 90, 0.48), 0 0 0 1px rgba(26, 158, 142, 0.12);
}
</style>
