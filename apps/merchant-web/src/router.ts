import { createRouter, createWebHistory } from 'vue-router';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import BookingsView from './views/BookingsView.vue';
import ScanView from './views/ScanView.vue';
import CreditScoreView from './views/CreditScoreView.vue';
import PriceListView from './views/PriceListView.vue';
import MessagesView from './views/MessagesView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'login', component: LoginView },
    { path: '/dashboard', component: DashboardView },
    { path: '/bookings', component: BookingsView },
    { path: '/scan', component: ScanView },
    { path: '/credit-score', component: CreditScoreView },
    { path: '/price-list', component: PriceListView },
    { path: '/messages', component: MessagesView },
  ],
});
