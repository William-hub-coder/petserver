import { createRouter, createWebHistory } from 'vue-router';

/** Tab 由 App 内 IndexedStack 管理；此处仅占位，避免无匹配路由 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'root',
      component: { template: '<div />' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});
