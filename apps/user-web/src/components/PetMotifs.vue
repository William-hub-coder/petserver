<template>
  <!-- 纯装饰层：不占流、不挡点击，叠加爪印/骨头 -->
  <div class="motifs" aria-hidden="true" :class="tone">
    <i
      v-for="d in marks"
      :key="d.id"
      class="mark"
      :class="d.kind"
      :style="{
        top: d.top,
        left: d.left,
        transform: `rotate(${d.rot}deg) scale(${d.scale || 1})`,
        opacity: d.opacity ?? undefined,
      }"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** soft=页面底纹；warm=偏暖点缀；mint=品牌青绿 */
    tone?: 'soft' | 'warm' | 'mint';
    marks?: Array<{
      id: number | string;
      kind: 'paw' | 'bone';
      top: string;
      left: string;
      rot: number;
      scale?: number;
      opacity?: number;
    }>;
  }>(),
  {
    tone: 'soft',
    marks: () => [
      { id: 1, kind: 'paw', top: '6%', left: '82%', rot: 18, scale: 1 },
      { id: 2, kind: 'bone', top: '14%', left: '8%', rot: -22, scale: 0.95 },
      { id: 3, kind: 'paw', top: '48%', left: '4%', rot: -30, scale: 0.85 },
      { id: 4, kind: 'paw', top: '72%', left: '88%', rot: 12, scale: 0.9 },
      { id: 5, kind: 'bone', top: '88%', left: '18%', rot: 16, scale: 0.85 },
    ],
  },
);
</script>

<style scoped>
.motifs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.mark {
  position: absolute;
  width: 20px;
  height: 20px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  opacity: 0.11;
}
.mark.bone {
  width: 26px;
  height: 13px;
}
.soft .mark.paw {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E");
}
.soft .mark.bone {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Cpath fill='%231a9e8e' d='M12 10c-4.4 0-8 3.6-8 8s3.6 8 8 8c1.8 0 3.4-.6 4.7-1.5L28 18l11.3 6.5c1.3.9 2.9 1.5 4.7 1.5 4.4 0 8-3.6 8-8s-3.6-8-8-8c-1.8 0-3.4.6-4.7 1.5L28 16 16.7 9.5C15.4 8.6 13.8 8 12 8zm56 2c-1.8 0-3.4.6-4.7 1.5L52 18l-1.2-.4c.2-.8.4-1.6.4-2.5C51.2 9.4 55.4 6 60.5 6S69.8 9.4 69.8 15.1c0 .9-.1 1.7-.4 2.5L76 22c1.3.9 2.9 1.5 4.7 1.5 4.4 0 8-3.6 8-8s-3.6-8-8-8c-1.8 0-3.4.6-4.7 1.5z'/%3E%3Crect fill='%231a9e8e' x='22' y='14' width='36' height='8' rx='4'/%3E%3Ccircle fill='%231a9e8e' cx='14' cy='12' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='14' cy='24' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='66' cy='12' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='66' cy='24' r='7'/%3E%3C/svg%3E");
}
.warm .mark.paw {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%23ff8c5a' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%23ff8c5a' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%23ff8c5a' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%23ff8c5a' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%23ff8c5a' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E");
}
.warm .mark.bone {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Crect fill='%23d4a03a' x='22' y='14' width='36' height='8' rx='4'/%3E%3Ccircle fill='%23d4a03a' cx='14' cy='12' r='7'/%3E%3Ccircle fill='%23d4a03a' cx='14' cy='24' r='7'/%3E%3Ccircle fill='%23d4a03a' cx='66' cy='12' r='7'/%3E%3Ccircle fill='%23d4a03a' cx='66' cy='24' r='7'/%3E%3C/svg%3E");
}
.mint .mark.paw {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%2314756b' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%2314756b' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%2314756b' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E");
}
.mint .mark.bone {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Crect fill='%2314756b' x='22' y='14' width='36' height='8' rx='4'/%3E%3Ccircle fill='%2314756b' cx='14' cy='12' r='7'/%3E%3Ccircle fill='%2314756b' cx='14' cy='24' r='7'/%3E%3Ccircle fill='%2314756b' cx='66' cy='12' r='7'/%3E%3Ccircle fill='%2314756b' cx='66' cy='24' r='7'/%3E%3C/svg%3E");
}
</style>
