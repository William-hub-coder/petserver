<template>
  <div class="page home">
    <div class="brand-head">
      <header class="top">
        <button type="button" class="city pressable" @click="$emit('open-location')">
          <span class="pin" :class="{ on: location.live }" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21s6.5-5.2 6.5-11a6.5 6.5 0 10-13 0c0 5.8 6.5 11 6.5 11z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <circle cx="12" cy="10" r="2.2" fill="currentColor" />
            </svg>
            <i class="pulse" />
          </span>
          <div class="city-copy">
            <strong>
              {{ cityText }}
              <span class="chev" aria-hidden="true">›</span>
            </strong>
            <small>
              <em v-if="location.live || !locError">{{ certifiedMerchants.length }} 家认证</em>
              <em v-else class="warn">定位未开</em>
              <span class="sep" aria-hidden="true">·</span>
              <span class="addr">{{ locAddr }}</span>
            </small>
          </div>
        </button>
        <div class="tools">
          <button type="button" class="tool" aria-label="搜索" @click="$emit('go-tab', 1)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8" />
              <path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
          <button type="button" class="tool" aria-label="消息" @click="$emit('open-messages')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 6.5A1.5 1.5 0 016.5 5h11A1.5 1.5 0 0119 6.5v7a1.5 1.5 0 01-1.5 1.5H10l-3.5 2.5V15H6.5A1.5 1.5 0 015 13.5v-7z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
            </svg>
            <span v-if="unread > 0" class="badge">{{ unread > 99 ? '99+' : unread }}</span>
          </button>
        </div>
      </header>

      <!-- 品牌宣传图：实拍背景 + 左侧文案蒙层，避免首页头区过于空旷 -->
      <section class="promo" @click="$emit('go-tab', 1)">
        <img
          class="promo-bg"
          :class="{ on: promoImgOk }"
          :src="promoCover"
          alt=""
          loading="eager"
          @load="promoImgOk = true"
        />
        <div class="promo-veil" />
        <div class="promo-copy">
          <p class="brand">宠伴 PetPal</p>
          <h1>每一家店，<br />我们都替你看过</h1>
          <p class="desc">实地考察 · 信用分透明 · 把毛孩子交出去也放心</p>
          <button type="button" class="btn-accent" @click.stop="$emit('go-tab', 1)">
            发现严选店
          </button>
        </div>
      </section>

      <div class="search-bar pressable" @click="$emit('go-tab', 1)">
        <span class="lens" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8" />
            <path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </span>
        <span>搜洗护、医疗、上门/寄养、训练…</span>
      </div>
    </div>

    <section class="cats">
      <!-- 宠物主题装饰边框：爪印角饰 + 虚线缝线 + 骨头点缀 -->
      <div class="cats-deco" aria-hidden="true">
        <span class="corner tl" />
        <span class="corner tr" />
        <span class="corner bl" />
        <span class="corner br" />
        <span class="edge-bone top" />
        <span class="edge-bone bottom" />
      </div>
      <header class="cats-head">
        <span class="head-mark" />
        <p>毛孩一站服务</p>
        <span class="head-mark flip" />
      </header>
      <div class="cats-grid">
        <button
          v-for="(c, i) in categories"
          :key="c.name"
          type="button"
          class="cat pressable"
          :style="{ '--i': i }"
          @click="onCategory(c.name)"
        >
          <span class="ci" :class="c.tone" aria-hidden="true">
            <span class="ci-ring" />
            <!-- 洗护：剪刀 + 水滴 -->
            <svg v-if="c.icon === 'groom'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="6.5" cy="7" r="2.5" stroke="currentColor" stroke-width="1.7" />
              <circle cx="6.5" cy="17" r="2.5" stroke="currentColor" stroke-width="1.7" />
              <path d="M8.5 8.5L18 18M8.5 15.5L14 10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              <path d="M18.5 5.5c0 1.2-.9 2.2-1.5 3-.6-.8-1.5-1.8-1.5-3a1.5 1.5 0 013 0z" fill="currentColor" opacity="0.85" />
            </svg>
            <!-- 医疗：十字 -->
            <svg v-else-if="c.icon === 'medical'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" stroke-width="1.7" />
              <path d="M12 7.5v9M7.5 12h9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            <!-- 上门/寄养：小屋 + 爪印 -->
            <svg v-else-if="c.icon === 'care'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 11.5L12 5l8 6.5V19a1 1 0 01-1 1h-5v-5H10v5H5a1 1 0 01-1-1v-7.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              <ellipse cx="15.8" cy="12.2" rx="1.5" ry="1.2" fill="currentColor" />
              <circle cx="14.2" cy="10.4" r=".7" fill="currentColor" />
              <circle cx="15.6" cy="9.9" r=".7" fill="currentColor" />
              <circle cx="17" cy="10.2" r=".65" fill="currentColor" />
              <circle cx="17.9" cy="11.2" r=".6" fill="currentColor" />
            </svg>
            <!-- 领养/宠物售卖：心形 + 爪印 -->
            <svg v-else-if="c.icon === 'adopt'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0112 8.2a3.8 3.8 0 017 2.6C19 15.6 12 20 12 20z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <ellipse cx="12" cy="12.6" rx="1.6" ry="1.3" fill="currentColor" />
              <circle cx="10.2" cy="10.8" r=".7" fill="currentColor" />
              <circle cx="12" cy="10.3" r=".7" fill="currentColor" />
              <circle cx="13.8" cy="10.8" r=".7" fill="currentColor" />
            </svg>
            <!-- 训练：骨头 -->
            <svg v-else-if="c.icon === 'train'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                fill="currentColor"
                d="M8.1 5.4a2.4 2.4 0 00-3.4 3.4l.6.6-.6.6a2.4 2.4 0 103.4 3.4l.6-.6 5.9 5.9-.6.6a2.4 2.4 0 103.4 3.4l.6-.6.6.6a2.4 2.4 0 103.4-3.4l-.6-.6.6-.6a2.4 2.4 0 10-3.4-3.4l-.6.6-5.9-5.9.6-.6a2.4 2.4 0 10-3.4-3.4l-.6.6-.6-.6z"
              />
            </svg>
            <!-- 商品：购物袋 -->
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 8h12l-.8 11.2a1.5 1.5 0 01-1.5 1.3H8.3a1.5 1.5 0 01-1.5-1.3L6 8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              <path d="M9 8V6.5a3 3 0 016 0V8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
          </span>
          <span class="cat-name" :class="{ dual: !!c.lines }">
            <template v-if="c.lines">
              <i v-for="line in c.lines" :key="line">{{ line }}</i>
            </template>
            <template v-else>{{ c.name }}</template>
          </span>
        </button>
      </div>
    </section>

    <button type="button" class="pet-cta pressable card" @click="$emit('open-pets')">
      <div class="paw" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
          <ellipse fill="currentColor" cx="32" cy="40" rx="14" ry="12" />
          <circle fill="currentColor" cx="16" cy="22" r="7" />
          <circle fill="currentColor" cx="28" cy="16" r="7" />
          <circle fill="currentColor" cx="40" cy="16" r="7" />
          <circle fill="currentColor" cx="50" cy="24" r="6.5" />
        </svg>
      </div>
      <div>
        <strong>{{ petCtaTitle }}</strong>
        <p>{{ petCtaSub }}</p>
      </div>
      <span class="go">{{ pets.length ? '去管理 ›' : '去添加 ›' }}</span>
    </button>

    <p v-if="nearLoading" class="near-status">正在根据定位更新附近认证店…</p>

    <template v-if="certifiedMerchants.length">
      <div class="section-title">
        <h2 class="font-h2 title-paw" style="margin: 0">今日严选</h2>
        <button type="button" class="more" @click="$emit('go-tab', 1)">找更多 ›</button>
      </div>
      <!-- Banner 式轮播：左侧文案蒙层 + 底部半透明白点（广告指示器） -->
      <section
        v-if="currentFeatured"
        class="banner pressable"
        @pointerdown="onBannerPointerDown"
        @pointerup="onBannerPointerUp"
        @pointercancel="pauseBanner"
        @click="onBannerClick"
      >
        <Transition name="banner-fade">
          <article :key="currentFeatured.id" class="banner-slide">
            <img class="banner-img" :src="coverOf(currentFeatured)" alt="" />
            <div class="banner-veil" />
            <div class="banner-body">
              <TrustBadge size="small" />
              <h3>{{ currentFeatured.name }}</h3>
              <p>
                ★ {{ Number(currentFeatured.rating).toFixed(1) }} · 信用
                {{ currentFeatured.creditScore }} · {{ currentFeatured.distanceKm }}km
              </p>
            </div>
            <div v-if="featured.length > 1" class="banner-dots" @click.stop>
              <button
                v-for="(_, idx) in featured"
                :key="idx"
                type="button"
                class="bdot"
                :class="{ on: bannerIndex === idx }"
                aria-label="切换推荐"
                @click="goBanner(idx)"
              />
            </div>
          </article>
        </Transition>
      </section>

      <div class="section-title" style="margin-top: 6px">
        <h2 class="font-h2 title-paw" style="margin: 0">附近好店</h2>
        <span class="font-small">认证店 · 随定位更新</span>
      </div>
      <!-- 电影胶片：纵向滑动切换画格，当前清晰、其余若隐若现 -->
      <section class="film">
        <div class="film-deco" aria-hidden="true">
          <span
            v-for="d in filmDecor"
            :key="d.id"
            class="deco"
            :class="d.kind"
            :style="{ top: d.top, left: d.left, transform: `rotate(${d.rot}deg)` }"
          />
        </div>
        <div class="film-rail" aria-hidden="true">
          <i v-for="n in 14" :key="'L' + n" />
        </div>
        <div ref="filmEl" class="film-strip" @scroll.passive="onFilmScroll">
          <div class="film-pad" />
          <article
            v-for="(m, idx) in certifiedMerchants"
            :key="m.id"
            class="film-frame"
            :data-film-idx="idx"
            :style="filmFrameStyle(idx)"
          >
            <div class="frame-bar" />
            <MerchantCard :merchant="m" @click="$emit('open-merchant', m.id)" />
            <div class="frame-bar" />
          </article>
          <div class="film-pad" />
        </div>
        <div class="film-rail" aria-hidden="true">
          <i v-for="n in 14" :key="'R' + n" />
        </div>
      </section>
      <p class="film-cap">
        {{ filmIndex + 1 }} / {{ certifiedMerchants.length }} · 上下滑动切换 · 随定位实时更新
      </p>
    </template>

    <div v-else-if="!nearLoading" class="near-empty card">
      <span class="near-empty-ico" aria-hidden="true" />
      <p>不好意思，当地还没有已认证的门店</p>
      <small>可先去「找店」查看地图实景，或换个定位再试试</small>
      <button type="button" class="near-empty-btn" @click="$emit('go-tab', 1)">去找店</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type CSSProperties } from 'vue';
import TrustBadge from '../components/TrustBadge.vue';
import MerchantCard from '../components/MerchantCard.vue';
import type { Merchant } from '../data/mock';
import { api, getToken } from '../api';
import { merchantCoverUrl } from '../lib/merchant-cover';
import {
  locationDetail,
  locationLabel,
  onLocationSignificantChange,
  startLocationWatch,
  useUserLocation,
} from '../lib/user-location';

withDefaults(
  defineProps<{
    unread?: number;
  }>(),
  { unread: 0 },
);

const emit = defineEmits<{
  'go-tab': [number];
  'open-merchant': [string];
  'open-mall': [];
  'open-medical': [];
  'open-care': [];
  'open-adopt': [];
  'open-map': [];
  'open-location': [];
  'open-pets': [];
  'open-messages': [];
}>();

const { location, error: locError } = useUserLocation();
const cityText = computed(() => locationLabel(location.value));
const locAddr = computed(() => {
  if (locError.value && !location.value.live) return '点击设置服务定位';
  const d = locationDetail(location.value);
  if (d) return d.length > 22 ? `${d.slice(0, 22)}…` : d;
  return location.value.live ? '定位已开启' : '点击设置服务定位';
});
/** 附近已认证门店（实时，随定位刷新） */
const certifiedMerchants = ref<Merchant[]>([]);
const nearLoading = ref(true);
const pets = ref<Array<{ id: string; name: string; type: string }>>([]);
const petCtaTitle = computed(() =>
  pets.value.length
    ? `已有 ${pets.value.length} 份宠物档案（猫狗/异宠均可）`
    : '还没有宠物档案 · 支持猫狗飞禽爬宠等',
);
const petCtaSub = computed(() =>
  pets.value.length
    ? pets.value.map((p) => p.name).slice(0, 3).join('、') + (pets.value.length > 3 ? '…' : '')
    : '建档后按品种/年龄推荐更合适的店与服务',
);
/** 首页头图：温馨宠物实拍（Unsplash），作品牌宣传背景 */
const promoCover =
  'https://images.unsplash.com/photo-1544568100-847a948585b9?w=1200&q=80';
const promoImgOk = ref(false);
/** 今日严选：仅已认证店，按信用分轮播 */
const featured = computed(() =>
  [...certifiedMerchants.value]
    .sort((a, b) => (b.creditScore || 0) - (a.creditScore || 0))
    .slice(0, Math.min(5, certifiedMerchants.value.length || 0)),
);
const bannerIndex = ref(0);
const currentFeatured = computed(() => featured.value[bannerIndex.value] || featured.value[0] || null);

const BANNER_MS = 6500;
const BANNER_RESUME_MS = 7000;
let bannerTimer: ReturnType<typeof setInterval> | null = null;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;
let swipeX = 0;
let swiped = false;

function goBanner(idx: number) {
  if (!featured.value.length) return;
  bannerIndex.value = ((idx % featured.value.length) + featured.value.length) % featured.value.length;
  pauseBanner();
}

function nextBanner() {
  if (featured.value.length <= 1) return;
  bannerIndex.value = (bannerIndex.value + 1) % featured.value.length;
}

function startBannerAuto() {
  stopBannerAuto();
  if (featured.value.length <= 1) return;
  bannerTimer = setInterval(nextBanner, BANNER_MS);
}

function stopBannerAuto() {
  if (bannerTimer) {
    clearInterval(bannerTimer);
    bannerTimer = null;
  }
}

function pauseBanner() {
  stopBannerAuto();
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = setTimeout(startBannerAuto, BANNER_RESUME_MS);
}

function onBannerPointerDown(e: PointerEvent) {
  swipeX = e.clientX;
  swiped = false;
  pauseBanner();
}

function onBannerPointerUp(e: PointerEvent) {
  const dx = e.clientX - swipeX;
  if (Math.abs(dx) > 42) {
    swiped = true;
    if (dx < 0) nextBanner();
    else goBanner(bannerIndex.value - 1);
  }
}

function onBannerClick() {
  if (swiped) {
    swiped = false;
    return;
  }
  const m = currentFeatured.value;
  if (m) emit('open-merchant', m.id);
}

/** —— 附近好店 · 电影胶片画格 —— */
const filmEl = ref<HTMLElement | null>(null);
const filmIndex = ref(0);
const filmDist = ref<number[]>([]);
let filmRaf = 0;

/** 胶片上随机点缀骨头 / 猫爪（固定种子，避免每次渲染跳动） */
const filmDecor = [
  { id: 1, kind: 'bone', top: '8%', left: '10%', rot: -18 },
  { id: 2, kind: 'paw', top: '18%', left: '78%', rot: 22 },
  { id: 3, kind: 'bone', top: '42%', left: '72%', rot: 12 },
  { id: 4, kind: 'paw', top: '55%', left: '8%', rot: -28 },
  { id: 5, kind: 'bone', top: '72%', left: '14%', rot: 35 },
  { id: 6, kind: 'paw', top: '86%', left: '70%', rot: -10 },
  { id: 7, kind: 'paw', top: '32%', left: '6%', rot: 40 },
  { id: 8, kind: 'bone', top: '92%', left: '40%', rot: -8 },
];

function filmFrameStyle(idx: number): CSSProperties {
  const d = filmDist.value[idx] ?? Math.abs(idx - filmIndex.value);
  const t = Math.min(1.2, d);
  const opacity = 1 - t * 0.68;
  const scale = 1 - Math.min(1, t) * 0.06;
  return {
    opacity: String(Math.max(0.2, opacity)),
    transform: `scale(${scale})`,
    filter: t > 0.65 ? `blur(${Math.min(1.4, (t - 0.65) * 2.2)}px)` : 'none',
  };
}

function updateFilmMetrics() {
  const el = filmEl.value;
  if (!el) return;
  const frames = el.querySelectorAll<HTMLElement>('[data-film-idx]');
  if (!frames.length) return;
  const mid = el.scrollTop + el.clientHeight / 2;
  let best = 0;
  let bestDist = Infinity;
  const dists: number[] = [];
  frames.forEach((frame, i) => {
    const center = frame.offsetTop + frame.offsetHeight / 2;
    const px = Math.abs(center - mid);
    dists[i] = px / Math.max(frame.offsetHeight * 0.8, 1);
    if (px < bestDist) {
      bestDist = px;
      best = i;
    }
  });
  filmDist.value = dists;
  filmIndex.value = best;
}

function onFilmScroll() {
  if (filmRaf) cancelAnimationFrame(filmRaf);
  filmRaf = requestAnimationFrame(updateFilmMetrics);
}

function coverOf(m: Merchant) {
  return merchantCoverUrl(m);
}

function onCategory(name: string) {
  if (name === '商品') emit('open-mall');
  else if (name === '医疗') emit('open-medical');
  else if (name === '上门/寄养') emit('open-care');
  else if (name === '领养/宠物售卖') emit('open-adopt');
  else emit('go-tab', 1);
}

function normalize(list: Merchant[]): Merchant[] {
  return list.map((m) => ({
    ...m,
    tags: Array.isArray(m.tags) ? m.tags : [],
    services: Array.isArray(m.services) ? m.services : [],
    reviews: Array.isArray(m.reviews) ? m.reviews : [],
    rating: Number(m.rating || 0),
    reviewCount: Number(m.reviewCount || 0),
    creditScore: Number(m.creditScore || 0),
    distanceKm: Number(m.distanceKm || 0),
    coverTone: m.coverTone || 'linear-gradient(145deg,#1a9e8e,#0f6f66)',
    inspectedAt: m.inspectedAt || '待更新',
    highlight: m.highlight || '严选门店',
    priceLevel: m.priceLevel || '¥¥',
    selectedBadge: !!m.selectedBadge,
    source: m.source || (String(m.id).startsWith('amap:') ? 'amap' : 'certified'),
    bookable: m.bookable !== false && !String(m.id).startsWith('amap:'),
  }));
}

async function loadNear() {
  nearLoading.value = true;
  try {
    const data = await api.merchantsNearby({
      city: location.value.city || undefined,
      lat: String(location.value.lat),
      lng: String(location.value.lng),
      module: '全部',
      limit: 10,
      radiusM: 12000,
    });
    const list = normalize(data.items || []);
    // 首页只展示已认证（严选）门店；无认证则空态提示
    certifiedMerchants.value = list
      .filter(
        (m) =>
          !!m.selectedBadge &&
          m.source !== 'amap' &&
          !String(m.id).startsWith('amap:'),
      )
      .slice(0, 10);
  } catch {
    certifiedMerchants.value = [];
  } finally {
    nearLoading.value = false;
  }
}

let unsubLoc: (() => void) | null = null;

watch(featured, () => {
  bannerIndex.value = 0;
  startBannerAuto();
});

watch(
  () => certifiedMerchants.value.length,
  async () => {
    filmIndex.value = 0;
    await nextTick();
    updateFilmMetrics();
  },
);

async function loadPets() {
  try {
    if (!getToken()) {
      pets.value = [];
      return;
    }
    const me = await api.me();
    pets.value = me.pets || [];
  } catch {
    pets.value = [];
  }
}

let nearPoll: ReturnType<typeof setInterval> | null = null;

function onNearVisibility() {
  if (document.visibilityState === 'visible') void loadNear();
}

onMounted(() => {
  startLocationWatch();
  unsubLoc = onLocationSignificantChange(() => {
    void loadNear();
  });
  void loadNear();
  void loadPets();
  startBannerAuto();
  void nextTick(() => updateFilmMetrics());
  // 运营后台改认证后，回前台/定时轻量刷新，保证附近好店近实时
  document.addEventListener('visibilitychange', onNearVisibility);
  nearPoll = setInterval(() => {
    if (document.visibilityState === 'visible') void loadNear();
  }, 45000);
});

onUnmounted(() => {
  unsubLoc?.();
  stopBannerAuto();
  if (resumeTimer) clearTimeout(resumeTimer);
  if (filmRaf) cancelAnimationFrame(filmRaf);
  document.removeEventListener('visibilitychange', onNearVisibility);
  if (nearPoll) clearInterval(nearPoll);
});

/** 快捷入口：象征性线性图标（非 emoji / 非单字） */
const categories = [
  { name: '洗护', icon: 'groom', tone: 'mint' },
  { name: '医疗', icon: 'medical', tone: 'rose' },
  { name: '上门/寄养', icon: 'care', tone: 'sand', lines: ['上门', '寄养'] },
  { name: '领养/宠物售卖', icon: 'adopt', tone: 'lilac', lines: ['领养', '宠物售卖'] },
  { name: '训练', icon: 'train', tone: 'sky' },
  { name: '商品', icon: 'mall', tone: 'peach' },
] as const;
</script>

<style scoped>
.home {
  padding-top: 0;
}
.brand-head {
  background: var(--gradient-brand-head);
  padding-bottom: 4px;
  padding-top: env(safe-area-inset-top);
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 10px;
}
.city {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 10px;
  align-items: center;
  border: 0;
  text-align: left;
  padding: 8px 10px 8px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 6px 18px rgba(26, 158, 142, 0.08);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition:
    transform 160ms var(--ease-out, ease),
    box-shadow 160ms ease;
}
.city:active {
  transform: scale(0.985);
}
.pin {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #6b7280;
  background: linear-gradient(160deg, #f3f6f5, #e8eef0);
}
.pin.on {
  color: #14756b;
  background: linear-gradient(160deg, #e8f6f4, #d4efe9);
  box-shadow: inset 0 0 0 1px rgba(26, 158, 142, 0.12);
}
.pin .pulse {
  position: absolute;
  right: 5px;
  top: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9ca3af;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
}
.pin.on .pulse {
  background: #3da655;
  animation: pin-pulse 1.8s ease-out infinite;
}
.city-copy {
  min-width: 0;
  flex: 1;
}
.city strong {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--color-ink);
  line-height: 1.25;
}
.city .chev {
  color: var(--color-brand);
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  transform: translateY(-0.5px);
}
.city small {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  color: var(--color-faint);
  font-size: 11px;
  line-height: 1.3;
  min-width: 0;
}
.city small em {
  flex-shrink: 0;
  font-style: normal;
  font-weight: 700;
  font-size: 10px;
  color: var(--color-brand-dark);
  background: rgba(26, 158, 142, 0.1);
  padding: 2px 6px;
  border-radius: 999px;
}
.city small em.warn {
  color: #8a6a28;
  background: var(--color-gold-bg);
}
.city small .sep {
  flex-shrink: 0;
  opacity: 0.45;
}
.city small .addr {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tools {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.tool {
  position: relative;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 6px 16px rgba(26, 158, 142, 0.08);
  color: var(--color-ink-soft);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 140ms var(--ease-out, ease);
}
.tool:active {
  transform: scale(0.94);
}
.badge {
  position: absolute;
  top: 2px;
  right: 0;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-danger);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  box-shadow: 0 0 0 2px #fff;
}
@keyframes pin-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(61, 166, 85, 0.45);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(61, 166, 85, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(61, 166, 85, 0);
  }
}
.promo {
  position: relative;
  margin: 0 16px 14px;
  min-height: 200px;
  aspect-ratio: 1.65 / 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-brand-light);
  box-shadow: var(--shadow-elevated);
  cursor: pointer;
}
.promo-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 60% 40%;
  opacity: 0;
  transition: opacity 400ms ease;
  transform: scale(1.02);
}
.promo-bg.on {
  opacity: 1;
}
.promo-veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      115deg,
      rgba(20, 58, 54, 0.82) 0%,
      rgba(26, 158, 142, 0.55) 42%,
      rgba(26, 26, 46, 0.18) 100%
    ),
    linear-gradient(180deg, transparent 45%, rgba(26, 26, 46, 0.28) 100%);
  pointer-events: none;
}
.promo-copy {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 18px 16px 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  color: #fff;
}
.brand {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.92;
}
.promo-copy h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 750;
  letter-spacing: -0.02em;
  max-width: 10em;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}
.desc {
  margin: 8px 0 14px;
  font-size: 12px;
  line-height: 1.45;
  opacity: 0.92;
  max-width: 22em;
}
.promo-copy .btn-accent {
  align-self: flex-start;
  min-height: 40px;
  padding: 0 16px;
  font-size: 14px;
}
.search-bar {
  margin: 0 16px 16px;
  box-shadow:
    var(--shadow-card),
    0 0 0 1px rgba(26, 158, 142, 0.12),
    0 8px 20px rgba(26, 158, 142, 0.06);
}
.lens {
  display: grid;
  place-items: center;
  color: var(--color-brand);
  opacity: 0.7;
}
.cats {
  --cats-ink: rgba(26, 158, 142, 0.55);
  position: relative;
  margin: 0 16px 16px;
  padding: 12px 10px 14px;
  background:
    radial-gradient(circle at 12% 18%, rgba(26, 158, 142, 0.07), transparent 42%),
    radial-gradient(circle at 88% 82%, rgba(255, 140, 90, 0.06), transparent 40%),
    var(--color-card);
  border-radius: 22px;
  box-shadow:
    var(--shadow-card),
    inset 0 0 0 1px rgba(26, 158, 142, 0.1);
  overflow: hidden;
}
.cats::before {
  content: '';
  position: absolute;
  inset: 7px;
  border-radius: 16px;
  border: 1.5px dashed rgba(26, 158, 142, 0.28);
  pointer-events: none;
  z-index: 1;
}
.cats-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.cats-deco .corner {
  position: absolute;
  width: 18px;
  height: 18px;
  opacity: 0.55;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.cats-deco .corner.tl { top: 8px; left: 10px; transform: rotate(-18deg); }
.cats-deco .corner.tr { top: 8px; right: 10px; transform: rotate(18deg); }
.cats-deco .corner.bl { bottom: 8px; left: 10px; transform: rotate(12deg); }
.cats-deco .corner.br { bottom: 8px; right: 10px; transform: rotate(-12deg); }
.cats-deco .edge-bone {
  position: absolute;
  left: 50%;
  width: 28px;
  height: 12px;
  margin-left: -14px;
  opacity: 0.4;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Crect fill='%231a9e8e' x='22' y='14' width='36' height='8' rx='4'/%3E%3Ccircle fill='%231a9e8e' cx='14' cy='12' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='14' cy='24' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='66' cy='12' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='66' cy='24' r='7'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.cats-deco .edge-bone.top { top: 4px; }
.cats-deco .edge-bone.bottom { bottom: 4px; transform: rotate(180deg); }
.cats-head {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 2px 8px 10px;
}
.cats-head p {
  margin: 0;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.12em;
  color: var(--color-brand-dark);
}
.head-mark {
  width: 22px;
  height: 10px;
  opacity: 0.45;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Crect fill='%231a9e8e' x='22' y='14' width='36' height='8' rx='4'/%3E%3Ccircle fill='%231a9e8e' cx='14' cy='12' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='14' cy='24' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='66' cy='12' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='66' cy='24' r='7'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.head-mark.flip { transform: scaleX(-1); }
.cats-grid {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  row-gap: 14px;
  column-gap: 2px;
  padding: 2px 4px 4px;
}
.cat {
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  color: var(--color-ink);
  cursor: pointer;
  animation: cat-pop 480ms var(--ease-out) both;
  animation-delay: calc(var(--i, 0) * 45ms);
}
@keyframes cat-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.92); }
  to { opacity: 1; transform: none; }
}
.ci {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--color-brand-light);
  color: var(--color-brand-dark);
  transition:
    transform 180ms var(--ease-out),
    box-shadow 180ms ease;
  box-shadow:
    inset 0 0 0 1px rgba(26, 158, 142, 0.08),
    0 6px 14px rgba(26, 158, 142, 0.1);
}
.ci > svg { position: relative; z-index: 1; }
.ci-ring {
  position: absolute;
  inset: -3px;
  border-radius: 18px;
  border: 1.5px solid transparent;
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(135deg, rgba(26, 158, 142, 0.35), rgba(255, 140, 90, 0.28), rgba(212, 160, 58, 0.35)) border-box;
  opacity: 0;
  transform: scale(0.92);
  transition: opacity 200ms ease, transform 200ms var(--ease-out);
  pointer-events: none;
}
.cat:active .ci {
  transform: scale(0.92);
}
.cat:active .ci-ring,
.cat:focus-visible .ci-ring {
  opacity: 1;
  transform: scale(1);
}
@media (hover: hover) {
  .cat:hover .ci {
    transform: translateY(-2px);
    box-shadow:
      inset 0 0 0 1px rgba(26, 158, 142, 0.1),
      0 10px 18px rgba(26, 158, 142, 0.16);
  }
  .cat:hover .ci-ring {
    opacity: 0.85;
    transform: scale(1);
  }
}
.ci.mint { background: #e8f6f4; color: #14756b; }
.ci.rose { background: #fdecef; color: #c45b6a; }
.ci.sand { background: #f6efe4; color: #9a6b3a; }
.ci.sky { background: #eaf3fb; color: #3a7eb8; }
.ci.peach { background: #fff0e8; color: #d96a3a; }
.ci.lilac { background: #f3eef8; color: #7a5aa8; }
.cat-name {
  font-size: 11px;
  font-weight: 650;
  line-height: 1.25;
  text-align: center;
  max-width: 5.6em;
}
.cat-name.dual {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 10px;
  letter-spacing: 0.01em;
}
.cat-name i {
  font-style: normal;
  font-weight: 650;
}
.pet-cta {
  width: calc(100% - 32px);
  margin: 0 16px 18px;
  padding: 14px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  text-align: left;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(120deg, rgba(26, 158, 142, 0.06), transparent 55%),
    var(--color-card);
  border: 1px solid rgba(26, 158, 142, 0.12);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: transform 160ms var(--ease-out), box-shadow 160ms ease;
}
.pet-cta::after {
  content: '';
  position: absolute;
  right: -8px;
  bottom: -10px;
  width: 56px;
  height: 56px;
  opacity: 0.08;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
  pointer-events: none;
}
.pet-cta:active {
  transform: scale(0.985);
}
.paw {
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: linear-gradient(160deg, #e8f6f4, #dff3ef);
  color: var(--color-brand);
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px rgba(26, 158, 142, 0.12);
}
.pet-cta strong {
  display: block;
  font-size: 14px;
  color: var(--color-ink);
}
.pet-cta p {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--color-sub);
}
.go {
  color: var(--color-brand);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.more {
  border: 0;
  background: transparent;
  color: var(--color-sub);
  font-size: 13px;
  cursor: pointer;
}
.banner {
  margin: 10px 16px 16px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  aspect-ratio: 2.4 / 1;
  min-height: 148px;
  position: relative;
  background: var(--color-brand-light);
  box-shadow: var(--shadow-card);
  touch-action: pan-y;
}
.banner-slide {
  position: absolute;
  inset: 0;
}
.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: var(--color-skeleton);
}
.banner-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    rgba(26, 26, 46, 0.72) 0%,
    rgba(26, 26, 46, 0.35) 48%,
    rgba(26, 26, 46, 0.08) 100%
  );
  pointer-events: none;
}
.banner-body {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 28px;
  z-index: 1;
  color: #fff;
}
.banner-body h3 {
  margin: 8px 0 4px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
}
.banner-body p {
  margin: 0;
  font-size: 12px;
  opacity: 0.92;
  font-variant-numeric: tabular-nums;
}
/* 经典广告白点：未选半透明，当前实心拉长 */
.banner-dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 10px;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}
.banner-dots .bdot {
  width: 6px;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.38);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition:
    width 280ms var(--ease-out),
    background 280ms var(--ease-out),
    opacity 280ms var(--ease-out);
}
.banner-dots .bdot.on {
  width: 16px;
  background: rgba(255, 255, 255, 0.95);
}
.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: opacity 720ms cubic-bezier(0.4, 0, 0.2, 1);
}
.banner-fade-leave-active {
  position: absolute;
  inset: 0;
}
.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
}
/* 附近好店 · 电影胶片（狗狗棕黄色 + 骨头/猫爪） */
.film {
  --film: #d4a574;
  --film-deep: #b8894f;
  --film-ink: #8a6232;
  position: relative;
  margin: 8px 12px 0;
  border-radius: 18px;
  background:
    radial-gradient(circle at 20% 30%, rgba(255, 248, 230, 0.35), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(139, 98, 50, 0.18), transparent 45%),
    linear-gradient(180deg, #e0b887 0%, var(--film) 40%, #c9955c 100%);
  box-shadow:
    inset 0 0 0 2px rgba(138, 98, 50, 0.35),
    0 10px 28px rgba(138, 98, 50, 0.22);
  display: grid;
  grid-template-columns: 22px 1fr 22px;
  overflow: hidden;
  min-height: 400px;
}
.film-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.deco {
  position: absolute;
  width: 22px;
  height: 22px;
  opacity: 0.28;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}
.deco.bone {
  width: 28px;
  height: 14px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Cpath fill='%238a6232' d='M10 8c-5 0-9 4-9 9s4 9 9 9c2 0 4-.7 5.5-1.8L28 18l12.5 6.2C42 25.3 44 26 46 26c5 0 9-4 9-9s-4-9-9-9c-2 0-4 .7-5.5 1.8L28 16 15.5 9.8C14 8.7 12 8 10 8zm54 0c-2 0-4 .7-5.5 1.8L46 16l-2-.6c.3-1 .5-2 .5-3.1C44.5 7.6 48.8 4 54 4s9.5 3.6 9.5 8.3c0 1.1-.2 2.1-.5 3.1L70 18c1.5 1.1 3.5 1.8 5.5 1.8 5 0 9-4 9-9s-4-9-9-9c-2 0-4 .7-5.5 1.8z'/%3E%3Cpath fill='%238a6232' d='M20 14h40v8H20z'/%3E%3Ccircle fill='%238a6232' cx='14' cy='12' r='7'/%3E%3Ccircle fill='%238a6232' cx='14' cy='24' r='7'/%3E%3Ccircle fill='%238a6232' cx='66' cy='12' r='7'/%3E%3Ccircle fill='%238a6232' cx='66' cy='24' r='7'/%3E%3C/svg%3E");
}
.deco.paw {
  width: 18px;
  height: 18px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%238a6232' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%238a6232' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%238a6232' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%238a6232' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%238a6232' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E");
}
.film-rail {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  padding: 10px 0;
  background: linear-gradient(180deg, var(--film-deep), var(--film));
  box-shadow: inset 0 0 0 1px rgba(138, 98, 50, 0.25);
}
.film-rail i {
  width: 11px;
  height: 14px;
  border-radius: 3px;
  background: var(--color-page);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(138, 98, 50, 0.2);
}
.film-strip {
  position: relative;
  z-index: 1;
  height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-width: none;
  padding: 0 8px;
  background: rgba(90, 58, 28, 0.12);
}
.film-strip::-webkit-scrollbar {
  display: none;
}
.film-pad {
  height: 56px;
  pointer-events: none;
}
.film-frame {
  scroll-snap-align: center;
  scroll-snap-stop: always;
  margin: 0 0 6px;
  transform-origin: center center;
  transition:
    opacity 160ms linear,
    transform 160ms var(--ease-out),
    filter 160ms linear;
  will-change: opacity, transform;
}
.frame-bar {
  height: 7px;
  margin: 0 4px;
  border-radius: 2px;
  background: repeating-linear-gradient(
    90deg,
    var(--film-ink) 0 6px,
    transparent 6px 10px
  );
  opacity: 0.45;
}
.film-frame :deep(.mcard) {
  margin: 4px 0;
  border: 2px solid rgba(138, 98, 50, 0.28);
  box-shadow: 0 4px 14px rgba(90, 58, 28, 0.18);
}
.film-cap {
  margin: 8px 16px 0;
  text-align: center;
  font-size: 11px;
  color: var(--film-ink, #8a6232);
  font-variant-numeric: tabular-nums;
}

.near-status {
  margin: 0 16px 10px;
  font-size: 12px;
  color: #7a8b88;
  font-weight: 550;
}
.near-empty {
  margin: 0 16px 8px;
  padding: 28px 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.near-empty.film-empty {
  margin-top: 0;
  min-height: 160px;
  justify-content: center;
}
.near-empty-ico {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
      center / 26px no-repeat,
    #e8f7f3;
  opacity: 0.9;
}
.near-empty p {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1a2a28;
}
.near-empty small {
  font-size: 12px;
  color: #8a9794;
  line-height: 1.45;
}
.near-empty-btn {
  margin-top: 6px;
  border: 0;
  border-radius: 999px;
  padding: 8px 18px;
  background: linear-gradient(135deg, #1a9e8e, #159687);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
</style>
