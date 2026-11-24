import { createRouter, createWebHistory } from 'vue-router';
import { getStoredUser, getToken } from './api';
import LoginView from './views/LoginView.vue';
import ReviewsView from './views/ReviewsView.vue';
import MerchantsView from './views/MerchantsView.vue';
import MessagesView from './views/MessagesView.vue';
import AdoptModerationView from './views/AdoptModerationView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/', redirect: '/merchants' },
    { path: '/merchants', component: MerchantsView },
    { path: '/reviews', component: ReviewsView },
    { path: '/messages', component: MessagesView },
    { path: '/adopt-moderation', component: AdoptModerationView },
  ],
});

router.beforeEach((to) => {
  if (to.meta.public) return true;
  const token = getToken();
  const user = getStoredUser();
  if (!token || user?.role !== 'admin') {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  return true;
});
