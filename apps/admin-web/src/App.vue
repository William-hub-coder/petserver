<template>
  <RouterView v-if="isLogin" />
  <div v-else class="layout">
    <aside class="side">
      <div class="brand">
        <div class="logo">宠</div>
        <div>
          <h2>宠伴后台</h2>
          <p>认证联动 · 运营中枢</p>
        </div>
      </div>
      <nav>
        <RouterLink to="/merchants">认证商家</RouterLink>
        <RouterLink to="/reviews">评审队列</RouterLink>
        <RouterLink to="/messages">消息与审核</RouterLink>
        <RouterLink to="/adopt-moderation">领养/售宠审核</RouterLink>
      </nav>
      <div class="side-foot">
        <p>{{ user?.nickname || '管理员' }}</p>
        <button type="button" class="logout" @click="logout">退出登录</button>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div>
          <h1>{{ title }}</h1>
          <p>认证写回后，用户端附近找店将优先展示严选门店</p>
        </div>
        <div class="chips">
          <span class="gold">Admin 安全门禁</span>
          <span>网关鉴权</span>
        </div>
      </header>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { clearAuth, getStoredUser } from './api';

const route = useRoute();
const router = useRouter();
const user = computed(() => getStoredUser());
const isLogin = computed(() => route.path === '/login');

const title = computed(() => {
  if (route.path.includes('merchants')) return '认证商家管理';
  if (route.path.includes('messages')) return '消息与审核';
  if (route.path.includes('adopt-moderation')) return '领养/售宠审核';
  return '盲审评审队列';
});

function logout() {
  clearAuth();
  void router.replace('/login');
}
</script>

<style scoped>
.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 28px;
}
.logo {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  display: grid;
  place-items: center;
  font-weight: 800;
}
.brand h2 {
  margin: 0;
  font-size: 18px;
}
.brand p {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.85;
}
.side-foot {
  margin-top: 28px;
  font-size: 12px;
  opacity: 0.9;
}
.side-foot p {
  margin: 0 0 8px;
}
.logout {
  border: 0;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}
.topbar h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: -0.02em;
}
.topbar p {
  margin: 6px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.chips {
  display: flex;
  gap: 8px;
}
.chips span {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: var(--shadow-card);
}
.chips .gold {
  background: var(--color-trust-gold-bg);
  color: #a67b28;
  border-color: transparent;
}
</style>
