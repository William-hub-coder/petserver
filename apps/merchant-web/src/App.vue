<template>
  <div class="phone-shell">
    <RouterView />
    <nav v-if="showTab" class="tabbar">
      <RouterLink to="/dashboard">工作台</RouterLink>
      <RouterLink to="/bookings">预约</RouterLink>
      <RouterLink to="/scan">核销</RouterLink>
      <RouterLink to="/messages">消息</RouterLink>
      <RouterLink to="/credit-score">信用分</RouterLink>
      <RouterLink to="/price-list">价目</RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

const route = useRoute();
const showTab = computed(() => route.path !== '/');
</script>
