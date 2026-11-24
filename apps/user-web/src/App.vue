<template>
  <div class="phone-shell">
    <!-- 启动闪屏：Logo 入场后淡出进入主界面 -->
    <SplashScreen v-if="showSplash" @done="onSplashDone" />

    <!-- 底栏 Tab + 所有业务模块：统一 page-fade，点击进入/返回都有淡入淡出 -->
    <Transition name="page-fade" mode="out-in">
      <HomePage
        v-if="!overlay && tab === 0"
        key="tab-home"
        :unread="unread"
        @go-tab="onTab"
        @open-merchant="openMerchant"
        @open-mall="overlay = 'mall'"
        @open-medical="overlay = 'medical'"
        @open-care="overlay = 'care'"
        @open-adopt="overlay = 'adopt'"
        @open-map="overlay = 'map'"
        @open-location="overlay = 'location'"
        @open-pets="openPets"
        @open-messages="overlay = 'messages'"
      />
      <MerchantListPage
        v-else-if="!overlay && tab === 1"
        key="tab-list"
        @open-merchant="openMerchant"
      />
      <CircleFeedPage
        v-else-if="!overlay && tab === 3"
        key="tab-circle"
        ref="circleFeedRef"
        @compose="openCircleCompose"
        @open-post="openCirclePost"
      />
      <ProfilePage
        v-else-if="!overlay && tab === 4"
        key="tab-me"
        :add-pet-tick="profileAddPetTick"
        @orders="overlay = 'orders'"
        @mall="overlay = 'mall'"
        @shop-orders="overlay = 'shop-orders'"
        @messages="overlay = 'messages'"
        @medical="overlay = 'medical'"
        @care="overlay = 'care'"
        @adopt="overlay = 'adopt'"
        @map="overlay = 'map'"
        @go-tab="onTab"
      />
      <MerchantDetailPage
        v-else-if="overlay === 'detail' && detailMerchant"
        key="ov-detail"
        :merchant="detailMerchant"
        @close="closeDetail"
        @book="overlay = 'booking'"
        @contact="contactMerchant"
      />
      <BookingPage
        v-else-if="overlay === 'booking' && detailId"
        key="ov-booking"
        :merchant-id="detailId"
        @close="overlay = 'detail'"
        @booked="onBooked"
      />
      <OrdersPage
        v-else-if="overlay === 'orders'"
        key="ov-orders"
        @close="closeOverlay"
        @qrcode="openQr"
        @review="openReview"
        @live="openHomeVisitTrack"
      />
      <QrcodePage
        v-else-if="overlay === 'qrcode' && activeBookingId"
        key="ov-qr"
        :booking-id="activeBookingId"
        @close="overlay = 'orders'"
      />
      <ReviewPage
        v-else-if="overlay === 'review' && activeBookingId"
        key="ov-review"
        :booking-id="activeBookingId"
        @close="overlay = 'orders'"
        @done="overlay = 'orders'"
      />
      <MallPage
        v-else-if="overlay === 'mall'"
        key="ov-mall"
        @close="closeOverlay"
        @open-product="openProduct"
        @open-cart="overlay = 'cart'"
      />
      <ProductDetailPage
        v-else-if="overlay === 'product' && activeProductId"
        key="ov-product"
        :product-id="activeProductId"
        @close="overlay = 'mall'"
        @open-cart="overlay = 'cart'"
        @ordered="onShopOrdered"
        @contact="contactMall"
      />
      <CartPage
        v-else-if="overlay === 'cart'"
        key="ov-cart"
        @close="overlay = 'mall'"
        @ordered="onShopOrdered"
      />
      <ShopOrdersPage
        v-else-if="overlay === 'shop-orders'"
        key="ov-shop-orders"
        @close="closeOverlay"
        @review="openProductReview"
        @track="openDeliveryTrack"
      />
      <ProductReviewPage
        v-else-if="overlay === 'product-review' && reviewTarget"
        key="ov-product-review"
        :order-item-id="reviewTarget.orderItemId"
        :product-name="reviewTarget.productName"
        @close="overlay = 'shop-orders'"
        @done="overlay = 'shop-orders'"
      />
      <MedicalHubPage
        v-else-if="overlay === 'medical'"
        key="ov-medical"
        @close="closeOverlay"
        @booked="onServiceBooked"
        @open-merchant="openMerchant"
      />
      <CareHubPage
        v-else-if="overlay === 'care'"
        key="ov-care"
        @close="closeOverlay"
        @booked="onServiceBooked"
        @open-merchant="openMerchant"
      />
      <AdoptHubPage
        v-else-if="overlay === 'adopt'"
        key="ov-adopt"
        @close="closeOverlay"
        @open-listing="openListing"
        @open-map="openAdoptMap"
      />
      <ListingDetailPage
        v-else-if="overlay === 'listing-detail' && activeListingId"
        key="ov-listing"
        :listing-id="activeListingId"
        @close="closeListing"
        @open-chat="openChat"
        @open-map="openAdoptMap"
      />
      <MapPage
        v-else-if="overlay === 'map'"
        key="ov-map"
        @close="closeMapFromAdopt"
        @open-merchant="openMerchant"
        @open-location="overlay = 'location'"
      />
      <DeliveryTrackPage
        v-else-if="overlay === 'delivery-track' && trackOrderId"
        key="ov-delivery"
        :order-id="trackOrderId"
        @close="overlay = 'shop-orders'"
      />
      <HomeVisitTrackPage
        v-else-if="overlay === 'home-visit-track' && trackBookingId"
        key="ov-home-visit"
        :booking-id="trackBookingId"
        @close="overlay = 'orders'"
      />
      <LocationPickerPage
        v-else-if="overlay === 'location'"
        key="ov-location"
        @close="overlay = null"
        @changed="onLocationChanged"
      />
      <ChatThreadPage
        v-else-if="overlay === 'chat' && activeChatId"
        key="ov-chat"
        :conversation-id="activeChatId"
        :peer-name="activeChatName"
        @close="closeChat"
      />
      <MessageCenterPage
        v-else-if="overlay === 'messages'"
        key="ov-messages"
        @close="overlay = null"
        @open-chat="openChat"
        @unread-changed="refreshUnread"
      />
      <CirclePostDetailPage
        v-else-if="overlay === 'circle-detail' && activeCirclePostId"
        key="ov-circle-detail"
        :post-id="activeCirclePostId"
        @close="closeCircleDetail"
        @need-login="askLoginForCircle"
      />
      <CircleComposePage
        v-else-if="overlay === 'circle-compose'"
        key="ov-circle-compose"
        @close="overlay = null"
        @published="onCirclePublished"
        @need-login="askLoginForCircle"
      />
    </Transition>

    <!-- AI 对话常驻：切 Tab 不销毁，避免丢失本地气泡；历史仍从服务端记忆恢复 -->
    <div v-show="!overlay && tab === 2" class="ai-tab-host">
      <AIChatPage :active="!overlay && tab === 2" />
    </div>

    <Transition name="page-fade">
      <BottomTabBar
        v-if="!overlay"
        key="tabbar"
        :model-value="tab"
        :unread="unread"
        @update:model-value="onTab"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * 用户端应用壳（无 vue-router）。
 *
 * ## 导航模型
 * - `tab`：底栏 0 首页 / 1 找店 / 2 AI / 3 圈子 / 4 我的（仅当 overlay===null 时可见）
 * - `overlay`：全屏业务页，与 Tab 共用 page-fade 过渡；消息中心为 messages overlay
 *
 * ## 首页分类 → overlay
 * | 分类     | overlay   | 组件              |
 * |----------|-----------|-------------------|
 * | 医疗     | medical   | MedicalHubPage    |
 * | 上门寄养 | care      | CareHubPage       |
 * | 领养售宠 | adopt     | AdoptHubPage      |
 * | 商品     | mall      | MallPage          |
 *
 * ## 预约完成后的分流
 * - 到店预约 `onBooked` → `qrcode`
 * - 线上/上门 `onServiceBooked` → `orders`
 *
 * ## hubReturn
 * 从 medical/care 点进门店时记下板块；关闭详情回到原 Hub。
 */
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import BottomTabBar from './components/BottomTabBar.vue';
import SplashScreen from './components/SplashScreen.vue';
import HomePage from './views/HomePage.vue';
import MerchantListPage from './views/MerchantListPage.vue';
import AIChatPage from './views/AIChatPage.vue';
import MessageCenterPage from './views/MessageCenterPage.vue';
import ChatThreadPage from './views/ChatThreadPage.vue';
import CircleFeedPage from './views/CircleFeedPage.vue';
import CirclePostDetailPage from './views/CirclePostDetailPage.vue';
import CircleComposePage from './views/CircleComposePage.vue';
import ProfilePage from './views/ProfilePage.vue';
import MerchantDetailPage from './views/MerchantDetailPage.vue';
import BookingPage from './views/BookingPage.vue';
import OrdersPage from './views/OrdersPage.vue';
import QrcodePage from './views/QrcodePage.vue';
import ReviewPage from './views/ReviewPage.vue';
import MallPage from './views/MallPage.vue';
import ProductDetailPage from './views/ProductDetailPage.vue';
import CartPage from './views/CartPage.vue';
import ShopOrdersPage from './views/ShopOrdersPage.vue';
import ProductReviewPage from './views/ProductReviewPage.vue';
import MedicalHubPage from './views/MedicalHubPage.vue';
import CareHubPage from './views/CareHubPage.vue';
import AdoptHubPage from './views/AdoptHubPage.vue';
import ListingDetailPage from './views/ListingDetailPage.vue';
import MapPage from './views/MapPage.vue';
import DeliveryTrackPage from './views/DeliveryTrackPage.vue';
import HomeVisitTrackPage from './views/HomeVisitTrackPage.vue';
import LocationPickerPage from './views/LocationPickerPage.vue';
import { getMerchant, type Merchant } from './data/mock';
import { api, getToken } from './api';

type Overlay =
  | null
  | 'detail'
  | 'booking'
  | 'orders'
  | 'qrcode'
  | 'review'
  | 'mall'
  | 'product'
  | 'cart'
  | 'shop-orders'
  | 'product-review'
  | 'medical'
  | 'care'
  | 'adopt'
  | 'listing-detail'
  | 'map'
  | 'delivery-track'
  | 'home-visit-track'
  | 'location'
  | 'chat'
  | 'messages'
  | 'circle-detail'
  | 'circle-compose';

const tab = ref(0);
const unread = ref(0);
/** 冷启动闪屏；结束后淡入主页 */
const showSplash = ref(true);

function onSplashDone() {
  showSplash.value = false;
  document.getElementById('boot-splash')?.remove();
}
const activeCirclePostId = ref<string | null>(null);
const circleFeedRef = ref<{ reload?: () => void } | null>(null);
const detailId = ref<string | null>(null);
const detailMerchant = ref<Merchant | null>(null);
const overlay = ref<Overlay>(null);
const activeBookingId = ref<string | null>(null);
const activeProductId = ref<string | null>(null);
const activeListingId = ref<string | null>(null);
const activeChatId = ref<string | null>(null);
const activeChatName = ref('');
const chatReturn = ref<Overlay>(null);
const mapReturn = ref<Overlay>(null);
const reviewTarget = ref<{ orderItemId: string; productName: string } | null>(null);
const hubReturn = ref<'medical' | 'care' | 'map' | 'adopt' | null>(null);
const trackOrderId = ref<string | null>(null);
const trackBookingId = ref<string | null>(null);
/** 递增后触发「我的」页打开添加宠物 */
const profileAddPetTick = ref(0);
let unreadTimer: ReturnType<typeof setInterval> | null = null;

function onTab(i: number) {
  closeOverlay();
  tab.value = i;
}

async function openPets() {
  closeOverlay();
  tab.value = 4;
  // 等「我的」页挂载后再递增，确保 watch 能收到变化
  await nextTick();
  profileAddPetTick.value += 1;
}

async function refreshUnread() {
  if (!getToken()) {
    unread.value = 0;
    return;
  }
  try {
    const s = await api.unreadSummary();
    unread.value = s.total;
  } catch {
    /* ignore */
  }
}

function openChat(payload: { id: string; name: string }) {
  chatReturn.value = overlay.value;
  activeChatId.value = payload.id;
  activeChatName.value = payload.name;
  overlay.value = 'chat';
}

function closeChat() {
  activeChatId.value = null;
  activeChatName.value = '';
  refreshUnread();
  if (chatReturn.value && chatReturn.value !== 'chat') {
    overlay.value = chatReturn.value;
    chatReturn.value = null;
    return;
  }
  chatReturn.value = null;
  overlay.value = 'messages';
}

function openCirclePost(id: string) {
  activeCirclePostId.value = id;
  overlay.value = 'circle-detail';
}

function openCircleCompose() {
  if (!getToken()) {
    askLoginForCircle();
    return;
  }
  overlay.value = 'circle-compose';
}

function closeCircleDetail() {
  activeCirclePostId.value = null;
  overlay.value = null;
  tab.value = 3;
}

function onCirclePublished(id: string) {
  overlay.value = null;
  tab.value = 3;
  activeCirclePostId.value = id;
  nextTick(() => {
    circleFeedRef.value?.reload?.();
    overlay.value = 'circle-detail';
  });
}

function askLoginForCircle() {
  alert('请先登录后再互动（「我的」页可用演示号 13800000001 / 123456）');
  overlay.value = null;
  tab.value = 4;
}

async function contactMerchant() {
  if (!detailId.value) return;
  try {
    const c = await api.openConversation({
      kind: 'merchant_support',
      merchantId: detailId.value,
    });
    openChat({ id: c.id, name: detailMerchant.value?.name || '商家' });
  } catch (e) {
    alert(e instanceof Error ? e.message : '无法发起会话');
  }
}

async function contactMall(merchantId: string, merchantName?: string) {
  try {
    const c = await api.openConversation({ kind: 'mall_support', merchantId });
    openChat({ id: c.id, name: merchantName || '店家' });
  } catch (e) {
    alert(e instanceof Error ? e.message : '无法发起会话');
  }
}

async function openMerchant(id: string) {
  if (overlay.value === 'medical' || overlay.value === 'care' || overlay.value === 'map') {
    hubReturn.value = overlay.value;
  }
  detailId.value = id;
  detailMerchant.value = getMerchant(id) ?? null;
  overlay.value = 'detail';
  try {
    const m = await api.merchant(id);
    detailMerchant.value = m as Merchant;
  } catch {
    /* keep mock */
  }
}

function closeDetail() {
  detailId.value = null;
  detailMerchant.value = null;
  activeBookingId.value = null;
  if (hubReturn.value) {
    overlay.value = hubReturn.value;
    hubReturn.value = null;
    return;
  }
  overlay.value = null;
}

function openProduct(id: string) {
  activeProductId.value = id;
  overlay.value = 'product';
}

function openListing(id: string) {
  activeListingId.value = id;
  overlay.value = 'listing-detail';
}

function closeListing() {
  activeListingId.value = null;
  overlay.value = 'adopt';
}

function openAdoptMap() {
  mapReturn.value = overlay.value;
  overlay.value = 'map';
}

function closeMapFromAdopt() {
  if (mapReturn.value) {
    overlay.value = mapReturn.value;
    mapReturn.value = null;
    return;
  }
  closeOverlay();
}

function closeOverlay() {
  overlay.value = null;
  detailId.value = null;
  detailMerchant.value = null;
  activeBookingId.value = null;
  activeProductId.value = null;
  activeListingId.value = null;
  activeChatId.value = null;
  activeChatName.value = '';
  activeCirclePostId.value = null;
  chatReturn.value = null;
  mapReturn.value = null;
  reviewTarget.value = null;
  hubReturn.value = null;
  trackOrderId.value = null;
  trackBookingId.value = null;
}

function openDeliveryTrack(orderId: string) {
  trackOrderId.value = orderId;
  overlay.value = 'delivery-track';
}

function openHomeVisitTrack(bookingId: string) {
  trackBookingId.value = bookingId;
  overlay.value = 'home-visit-track';
}

function openProductReview(payload: { orderItemId: string; productName: string }) {
  reviewTarget.value = payload;
  overlay.value = 'product-review';
}

function onBooked(id: string) {
  activeBookingId.value = id;
  overlay.value = 'qrcode';
}

async function onServiceBooked(id: string) {
  // 线上问诊预约后后端已开会话；能打开则进线程，否则回订单列表（上门等）
  try {
    const c = await api.openConversation({ kind: 'doctor_consult', bookingId: id });
    chatReturn.value = null;
    activeChatId.value = c.id;
    activeChatName.value = '问诊会话';
    overlay.value = 'chat';
    refreshUnread();
  } catch {
    overlay.value = 'orders';
  }
}

function openQr(id: string) {
  activeBookingId.value = id;
  overlay.value = 'qrcode';
}

function openReview(id: string) {
  activeBookingId.value = id;
  overlay.value = 'review';
}

function onShopOrdered(_id: string) {
  overlay.value = 'shop-orders';
}

function onLocationChanged() {
  /* HomePage / MerchantListPage 已订阅定位变更 */
}

onMounted(() => {
  document.getElementById('boot-splash')?.classList.add('hide');
  refreshUnread();
  unreadTimer = setInterval(refreshUnread, 5000);
});
onUnmounted(() => {
  if (unreadTimer) clearInterval(unreadTimer);
});
</script>

<style scoped>
.phone-shell {
  width: 100%;
  max-width: var(--page-max-width);
  min-height: 100vh;
  margin: 0 auto;
  background: var(--color-page);
  position: relative;
  box-shadow: 0 18px 50px rgba(24, 40, 34, 0.16);
  overflow: hidden;
}
.ai-tab-host {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  background: var(--color-page);
}

.phone-shell > :deep(.page-fade-enter-active),
.phone-shell > :deep(.page-fade-leave-active) {
  width: 100%;
}
</style>
