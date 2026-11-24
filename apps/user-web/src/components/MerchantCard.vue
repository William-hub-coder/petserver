<template>
  <!-- 信息层级：实拍封面 → 店名+严选 → 评分销量 → 标签 → 地址/距离+信用分 -->
  <article class="mcard card pressable" @click="$emit('click')">
    <span class="corner-paw" aria-hidden="true" />
    <div class="cover">
      <img
        class="photo"
        :class="{ on: imgOk }"
        :src="coverUrl"
        alt=""
        loading="lazy"
        @load="imgOk = true"
        @error="imgOk = false"
      />
      <div class="veil" />
      <TrustBadge v-if="isCertified" class="badge" size="small" />
      <span v-else class="badge unverified">未认证</span>
      <div class="bottom-line">
        <span class="pill">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 21s6.5-5.2 6.5-11a6.5 6.5 0 10-13 0c0 5.8 6.5 11 6.5 11z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <circle cx="12" cy="10" r="2" fill="currentColor" />
          </svg>
          {{ merchant.distanceKm ?? 0 }} km
        </span>
        <span class="pill soft">{{ merchant.priceLevel || '¥¥' }}</span>
      </div>
    </div>
    <div class="body">
      <div class="title-row">
        <h3>{{ merchant.name }}</h3>
        <CreditScoreRing
          v-if="isCertified"
          :score="merchant.creditScore || 0"
          :size="48"
          :show-label="false"
        />
        <span v-else class="amap-tag">地图</span>
      </div>
      <div class="meta">
        <span v-if="isCertified" class="score tabular"><em>★</em> {{ ratingText }}</span>
        <span v-else class="sales">高德实景</span>
        <span v-if="isCertified" class="sales">销量{{ merchant.reviewCount ?? 0 }}</span>
        <span v-else class="sales">不可在线预约</span>
      </div>
      <div class="tags">
        <span v-for="t in tags" :key="t" class="tag-chip">{{ t }}</span>
        <span v-if="isCertified" class="tag-chip gold">考察 {{ inspectedText }}</span>
        <span v-else class="tag-chip muted">尚未实地认证</span>
      </div>
      <p class="addr">
        <span class="addr-paw" aria-hidden="true" />
        {{ merchant.address || merchant.highlight || '严选门店' }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrustBadge from './TrustBadge.vue';
import CreditScoreRing from './CreditScoreRing.vue';
import type { Merchant } from '../data/mock';
import { merchantCoverUrl } from '../lib/merchant-cover';

const props = defineProps<{ merchant: Merchant }>();
defineEmits<{ click: [] }>();

const imgOk = ref(false);
const coverUrl = computed(() => merchantCoverUrl(props.merchant));
watch(coverUrl, () => {
  imgOk.value = false;
});

const tags = computed(() =>
  (Array.isArray(props.merchant.tags) ? props.merchant.tags : []).slice(0, 3),
);
const ratingText = computed(() => Number(props.merchant.rating || 0).toFixed(1));
const inspectedText = computed(() => {
  const v = props.merchant.inspectedAt;
  if (!v) return '待更新';
  return String(v).slice(0, 7);
});
/** 严选认证角标：高德实景为未认证；显式 selectedBadge 为准；旧数据默认认证 */
const isCertified = computed(() => {
  if (props.merchant.source === 'amap') return false;
  if (String(props.merchant.id || '').startsWith('amap:')) return false;
  if (props.merchant.selectedBadge === false) return false;
  if (props.merchant.selectedBadge === true) return true;
  return true;
});
</script>

<style scoped>
.mcard {
  position: relative;
  overflow: hidden;
  margin-bottom: 14px;
  border-radius: 18px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.8) inset,
    0 8px 22px rgba(24, 48, 42, 0.07);
}
.corner-paw {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 28px;
  height: 28px;
  opacity: 0.06;
  pointer-events: none;
  z-index: 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--color-brand-light);
}
.photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 220ms ease;
}
.photo.on {
  opacity: 1;
}
.veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(26, 26, 46, 0.05), rgba(26, 26, 46, 0.35));
  pointer-events: none;
}
.badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
}
.badge.unverified {
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 650;
  color: #fff;
  background: rgba(40, 50, 48, 0.55);
  backdrop-filter: blur(4px);
}
.amap-tag {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 700;
  color: #5a6b68;
  background: #eef2f1;
  border-radius: 999px;
  padding: 4px 8px;
}
.tag-chip.muted {
  background: #f0f2f1;
  color: #8a9794;
}
.bottom-line {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 1;
  display: flex;
  gap: 6px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--color-sub);
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 600;
  backdrop-filter: blur(4px);
}
.pill svg {
  color: #1a9e8e;
}
.pill.soft {
  background: rgba(255, 255, 255, 0.78);
}
.body {
  position: relative;
  z-index: 1;
  padding: 12px 14px 14px;
}
.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.body h3 {
  margin: 0;
  flex: 1;
  font-size: 16px;
  font-weight: 680;
  letter-spacing: -0.01em;
  color: #1a2a28;
  line-height: 1.35;
}
.meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.score {
  font-weight: 700;
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}
.score em {
  color: var(--color-gold);
  font-style: normal;
  margin-right: 2px;
}
.sales {
  color: var(--color-faint);
  font-size: 12px;
}
.tags {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.addr {
  margin: 8px 0 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--color-sub);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.addr-paw {
  width: 11px;
  height: 11px;
  flex: 0 0 auto;
  opacity: 0.45;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
</style>
