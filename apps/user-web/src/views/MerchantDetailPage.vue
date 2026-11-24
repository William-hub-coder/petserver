<template>
  <div class="sheet" v-if="merchant">
    <div class="backdrop" @click="$emit('close')">
      <!-- 顶部空隙：用本店封面模糊填充，避免纯灰块 -->
      <img v-if="coverUrl" class="backdrop-img" :src="coverUrl" alt="" aria-hidden="true" />
    </div>
    <div class="panel">
      <div class="hero">
        <img class="hero-img" :class="{ on: imgOk }" :src="coverUrl" alt="" @load="imgOk = true" />
        <div class="hero-veil" />
        <button type="button" class="back" @click="$emit('close')">‹</button>
        <div class="hero-bottom">
          <TrustBadge />
          <h1>{{ merchant.name }}</h1>
          <p>{{ merchant.address }} · 营业至 {{ merchant.openUntil }}</p>
        </div>
      </div>

      <div class="content">
        <section class="info card">
          <div class="info-top">
            <div>
              <div class="rating tabular"><em>★</em> {{ ratingText }}
                <small>（{{ merchant.reviewCount ?? 0 }} 条）</small>
              </div>
              <div class="tags">
                <span v-for="t in (merchant.tags || []).slice(0, 4)" :key="t" class="tag-chip">{{ t }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="trust-row card">
          <CreditScoreRing :score="merchant.creditScore" :size="84" />
          <div>
            <h2>信用分<span class="tabular">{{ merchant.creditScore }}</span></h2>
            <p class="font-caption">{{ merchant.highlight }}</p>
            <span class="tag-chip gold">实地考察 {{ merchant.inspectedAt || '待更新' }}</span>
          </div>
        </section>

        <div class="tabs">
          <button type="button" :class="{ on: tab === 'services' }" @click="tab = 'services'">服务</button>
          <button type="button" :class="{ on: tab === 'reviews' }" @click="tab = 'reviews'">评价</button>
          <button type="button" :class="{ on: tab === 'inspect' }" @click="tab = 'inspect'">考察报告</button>
        </div>

        <Transition name="panel-fade" mode="out-in">
          <section v-if="tab === 'services'" key="services" class="block">
            <div v-for="s in merchant.services" :key="s.id || s.name" class="service card">
              <div>
                <strong>{{ s.name }}</strong>
                <p class="font-caption">{{ s.duration }}</p>
              </div>
              <div class="price tabular">{{ s.price === 0 ? '咨询' : `¥${s.price}` }}</div>
            </div>
            <p v-if="!merchant.services?.length" class="empty">暂无服务项</p>
          </section>

          <section v-else-if="tab === 'reviews'" key="reviews" class="block">
            <p class="note">{{ summary?.note || '到店核销后的评价，可供选店参考' }}</p>
            <div v-if="summary" class="summary card">
              <div class="avg">
                <b class="tabular">{{ summary.avgRating.toFixed(1) }}</b>
                <span>{{ summary.count }} 条评价 · 好评率 {{ summary.goodRate }}%</span>
              </div>
              <div class="top-tags">
                <span v-for="t in summary.topTags" :key="t.name" class="tag-chip">
                  {{ t.name }} {{ t.count }}
                </span>
              </div>
            </div>
            <div class="filters">
              <button
                v-for="f in filters"
                :key="f.key"
                type="button"
                :class="{ on: filter === f.key }"
                @click="setFilter(f.key)"
              >
                {{ f.label }}
              </button>
            </div>
            <p v-if="loadingReviews" class="empty">加载评价中…</p>
            <p v-else-if="!reviewItems.length" class="empty">暂无此类评价</p>
            <div v-for="r in reviewItems" :key="r.id" class="review card">
              <div class="rh">
                <strong>{{ r.user }}</strong>
                <span class="tabular">★ {{ Number(r.score).toFixed(1) }}</span>
              </div>
              <p v-if="r.serviceName" class="svc">服务：{{ r.serviceName }}</p>
              <div v-if="r.tags?.length" class="rtags">
                <span v-for="t in r.tags" :key="t" class="tag-chip">{{ t }}</span>
              </div>
              <p>{{ r.text || '（用户未填写文字）' }}</p>
              <div class="rf">
                <span class="font-small">{{ r.date }}</span>
                <button type="button" class="helpful" @click="markHelpful(r)">
                  有帮助 {{ r.helpfulCount || 0 }}
                </button>
              </div>
            </div>
          </section>

          <section v-else key="inspect" class="block">
            <article class="inspect card">
              <div class="ih">
                <span class="tag-chip gold">严选考察</span>
                <span class="font-small">考察于 {{ merchant.inspectedAt || '待更新' }}</span>
              </div>
              <h3>现场结论</h3>
              <p>{{ merchant.highlight || '已完成实地核查，详情持续更新。' }}</p>
              <h3>考察项目</h3>
              <ul>
                <li v-for="item in inspectItems" :key="item">{{ item }}</li>
              </ul>
              <div class="photos">
                <img v-for="(u, i) in inspectPhotos" :key="i" :src="u" alt="考察现场" loading="lazy" />
              </div>
            </article>
          </section>
        </Transition>
      </div>

      <footer class="bar">
        <NavigateButton
          variant="ghost"
          :lat="merchant.lat"
          :lng="merchant.lng"
          :name="merchant.name"
        />
        <button type="button" class="btn-ghost" @click="$emit('contact')">联系商家</button>
        <button type="button" class="btn-accent grow" @click="$emit('book')">立即预约</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import TrustBadge from '../components/TrustBadge.vue';
import CreditScoreRing from '../components/CreditScoreRing.vue';
import NavigateButton from '../components/NavigateButton.vue';
import type { Merchant } from '../data/mock';
import { api } from '../api';
import { merchantCoverUrl } from '../lib/merchant-cover';

const props = defineProps<{ merchant: Merchant | null }>();
defineEmits<{ close: []; book: []; contact: [] }>();

const tab = ref<'services' | 'reviews' | 'inspect'>('services');
const imgOk = ref(false);
const coverUrl = computed(() => (props.merchant ? merchantCoverUrl(props.merchant) : ''));
const ratingText = computed(() => Number(props.merchant?.rating || 0).toFixed(1));

const inspectItems = computed(() => {
  const cat = props.merchant?.category;
  if (cat === 'hospital') return ['诊疗区消毒记录', '药品分柜与冷链', '候诊与隔离区动线', '执业资质核验'];
  if (cat === 'grooming') return ['吹水间独立分区', '噪声与通风', '工具消毒流程', '皮肤敏感问诊'];
  if (cat === 'boarding') return ['笼舍消毒记录', '监控覆盖', '垫料与气味', '应急联系流程'];
  if (cat === 'training') return ['训练场地防滑', '教练资质', '课前评估记录', '安全防护'];
  return ['卫生与消毒', '服务流程', '安全设施', '人员资质'];
});

const inspectPhotos = computed(() => {
  if (!props.merchant) return [];
  const base = merchantCoverUrl(props.merchant);
  return [base, base];
});

type ReviewItem = {
  id: string;
  user: string;
  score: number;
  text: string;
  tags?: string[];
  serviceName?: string;
  helpfulCount?: number;
  date: string;
};

const filters = [
  { key: 'all', label: '全部' },
  { key: 'good', label: '好评' },
  { key: 'mid', label: '一般' },
  { key: 'bad', label: '差评' },
];
const filter = ref('all');
const loadingReviews = ref(false);
const reviewItems = ref<ReviewItem[]>([]);
const summary = ref<{
  avgRating: number;
  count: number;
  goodRate: number;
  topTags: Array<{ name: string; count: number }>;
  note: string;
} | null>(null);

async function loadReviews() {
  if (!props.merchant?.id) return;
  loadingReviews.value = true;
  try {
    const data = await api.merchantReviews(props.merchant.id, filter.value);
    summary.value = data.summary;
    reviewItems.value = data.items;
  } catch {
    reviewItems.value = (props.merchant.reviews || []).map((r, i) => ({
      id: `local-${i}`,
      user: r.user,
      score: r.score,
      text: r.text,
      date: r.date,
      tags: [],
    }));
  } finally {
    loadingReviews.value = false;
  }
}

function setFilter(key: string) {
  filter.value = key;
  loadReviews();
}

async function markHelpful(r: ReviewItem) {
  if (!r.id || r.id.startsWith('local-')) return;
  try {
    const data = await api.markReviewHelpful(r.id);
    r.helpfulCount = data.helpfulCount;
  } catch {
    /* ignore */
  }
}

onMounted(loadReviews);
watch(
  () => props.merchant?.id,
  () => {
    filter.value = 'all';
    tab.value = 'services';
    imgOk.value = false;
    loadReviews();
  },
);
</script>

<style scoped>
.sheet { position: absolute; inset: 0; z-index: 80; }
.backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #4a5560;
}
.backdrop-img {
  position: absolute;
  inset: -24px;
  width: calc(100% + 48px);
  height: calc(100% + 48px);
  object-fit: cover;
  filter: blur(26px) saturate(1.12);
  transform: scale(1.06);
  pointer-events: none;
}
.backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(20, 26, 32, 0.42);
  pointer-events: none;
}
.panel {
  position: absolute; left: 0; right: 0; bottom: 0; top: 6%;
  background: var(--color-page); border-radius: 20px 20px 0 0;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 -6px 28px rgba(20, 28, 32, 0.14);
}
.hero {
  position: relative; min-height: 200px; aspect-ratio: 16 / 9;
  color: #fff; display: flex; flex-direction: column; justify-content: flex-end;
  background: var(--color-brand-light);
}
.hero-img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  opacity: 0; transition: opacity 240ms ease;
}
.hero-img.on { opacity: 1; }
.hero-veil {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(26,26,46,.08), rgba(26,26,46,.55));
}
.back {
  position: absolute; top: 12px; left: 12px; width: 36px; height: 36px; z-index: 2;
  border: 0; border-radius: 50%; background: rgba(26,26,46,.35); color: #fff; font-size: 22px;
}
.hero-bottom { position: relative; z-index: 1; padding: 16px; }
.hero-bottom h1 { margin: 8px 0 4px; font-size: 22px; font-weight: 700; }
.hero-bottom p { margin: 0; opacity: .92; font-size: 13px; }
.content { flex: 1; overflow: auto; padding: 12px 16px 96px; }
.info { padding: 12px 14px; margin-bottom: 10px; }
.rating { font-weight: 700; font-size: 15px; color: var(--color-ink); }
.rating em { color: var(--color-gold); font-style: normal; }
.rating small { color: var(--color-faint); font-weight: 500; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.trust-row { display: flex; gap: 14px; align-items: center; margin-bottom: 12px; padding: 12px; }
.trust-row h2 { margin: 0 0 4px; font-size: 17px; color: var(--color-ink); }
.tabs {
  display: flex; gap: 6px; margin-bottom: 12px;
  background: var(--color-divider); border-radius: var(--radius-full); padding: 4px;
}
.tabs button {
  flex: 1; height: 34px; border: 0; border-radius: var(--radius-full);
  background: transparent; font-size: 13px; font-weight: 650; color: var(--color-sub); cursor: pointer;
}
.tabs button.on { background: #fff; color: var(--color-brand); box-shadow: var(--shadow-card); }
.block { margin-bottom: 12px; }
.service { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 12px; }
.price { color: var(--color-accent); font-weight: 700; }
.note { margin: 0 0 10px; font-size: 12px; color: var(--color-sub); }
.summary { padding: 12px; margin-bottom: 10px; }
.avg { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.avg b { font-size: 28px; font-weight: 700; color: var(--color-ink); }
.top-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.filters { display: flex; gap: 8px; margin-bottom: 10px; }
.filters button {
  border: 0; border-radius: 999px; padding: 6px 12px; background: var(--color-divider); font-size: 12px;
  color: var(--color-sub); cursor: pointer;
}
.filters button.on { background: var(--color-brand); color: #fff; }
.review { padding: 12px; margin-bottom: 8px; }
.rh { display: flex; justify-content: space-between; margin-bottom: 4px; }
.svc { margin: 0 0 6px; font-size: 12px; color: var(--color-sub); }
.rtags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.rf { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.helpful {
  border: 0; background: transparent; color: var(--color-brand); font-size: 12px; font-weight: 600;
}
.inspect { padding: 14px; }
.ih { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.inspect h3 { margin: 12px 0 6px; font-size: 15px; color: var(--color-ink); }
.inspect p, .inspect li { font-size: 13px; color: var(--color-sub); line-height: 1.5; }
.inspect ul { margin: 0; padding-left: 18px; }
.photos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
.photos img {
  width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 12px;
  background: var(--color-skeleton);
}
.empty { color: var(--color-faint); font-size: 13px; padding: 8px 0; }
.bar {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; gap: 10px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: rgba(255,255,255,.96); border-top: 1px solid var(--color-line);
  box-shadow: var(--shadow-fixed);
}
.grow { flex: 1; }
</style>
