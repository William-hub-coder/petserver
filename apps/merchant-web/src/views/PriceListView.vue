<template>
  <div>
    <header class="nav"><h1 class="font-h3">价目表</h1></header>
    <div style="padding: 16px; display: grid; gap: 12px">
      <article v-for="p in prices" :key="p.name" class="card row">
        <div>
          <div class="font-body" style="font-weight: 600">{{ p.name }}</div>
          <div class="font-caption">{{ p.duration }}</div>
        </div>
        <div class="price">¥{{ p.price }}</div>
      </article>
      <button class="btn-primary" type="button">新增服务（占位）</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const prices = [
  { name: '基础洗护', duration: '约 60 分钟', price: 128 },
  { name: '精致造型', duration: '约 90 分钟', price: 218 },
  { name: '寄养（天）', duration: '含监控', price: 98 },
];
</script>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.price {
  color: var(--color-accent);
  font-weight: 700;
  font-size: 18px;
}
</style>
