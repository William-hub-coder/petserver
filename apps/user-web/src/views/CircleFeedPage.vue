<template>
  <div class="page circle">
    <div class="bg-paws" aria-hidden="true" />

    <header class="head">
      <div class="titles">
        <p class="brand">
          <span class="brand-paw" aria-hidden="true" />
          宠伴 · 圈子
        </p>
        <h1>
          <span class="bone" aria-hidden="true" />
          毛孩子圈子
          <span class="bone flip" aria-hidden="true" />
        </h1>
        <p class="sub">晒日常 · 问经验 · 互相搭把手</p>
      </div>
      <button type="button" class="compose-chip pressable" @click="$emit('compose')">
        <svg width="16" height="16" viewBox="0 0 64 64" aria-hidden="true">
          <ellipse fill="currentColor" cx="32" cy="40" rx="14" ry="12" />
          <circle fill="currentColor" cx="16" cy="22" r="7" />
          <circle fill="currentColor" cx="28" cy="16" r="7" />
          <circle fill="currentColor" cx="40" cy="16" r="7" />
          <circle fill="currentColor" cx="50" cy="24" r="6.5" />
        </svg>
        晒一晒
      </button>
    </header>

    <div class="cats">
      <button
        v-for="c in cats"
        :key="c.key"
        type="button"
        :class="{ on: category === c.key }"
        @click="setCat(c.key)"
      >
        <span class="cat-ico" aria-hidden="true">{{ c.icon }}</span>
        {{ c.label }}
      </button>
    </div>

    <p v-if="err" class="err">{{ err }}</p>
    <p v-else-if="loading && !items.length" class="hint">爪爪加载中…</p>

    <div class="waterfall">
      <button
        v-for="p in items"
        :key="p.id"
        type="button"
        class="card pressable"
        @click="$emit('open-post', p.id)"
      >
        <div class="cover-wrap">
          <img v-if="p.coverUrl" class="cover" :src="p.coverUrl" alt="" loading="lazy" />
          <div v-else class="cover empty">
            <span class="empty-paw" aria-hidden="true" />
            <em>{{ p.title.slice(0, 1) }}</em>
          </div>
          <span class="cat-badge" :data-cat="p.category">{{ catLabel(p.category) }}</span>
          <span v-if="p.mediaType === 'video'" class="vtag">▶ 视频</span>
        </div>
        <div class="body">
          <strong>{{ p.title }}</strong>
          <div class="meta">
            <span class="author">
              <i class="avatar" aria-hidden="true">{{ p.author.nickname.slice(0, 1) }}</i>
              {{ p.author.nickname }}
            </span>
            <span class="likes" :class="{ on: p.liked }">
              <svg width="12" height="12" viewBox="0 0 64 64" aria-hidden="true">
                <ellipse fill="currentColor" cx="32" cy="40" rx="14" ry="12" />
                <circle fill="currentColor" cx="16" cy="22" r="7" />
                <circle fill="currentColor" cx="28" cy="16" r="7" />
                <circle fill="currentColor" cx="40" cy="16" r="7" />
                <circle fill="currentColor" cx="50" cy="24" r="6.5" />
              </svg>
              {{ p.likeCount }}
            </span>
          </div>
        </div>
      </button>
    </div>

    <div v-if="!loading && !items.length && !err" class="empty-pet">
      <p>还没有动态，来晒出你家毛孩子吧</p>
      <button type="button" class="empty-cta" @click="$emit('compose')">去发布</button>
    </div>
    <button v-if="nextCursor" type="button" class="more" :disabled="loading" @click="loadMore">
      {{ loading ? '加载中…' : '再看一批 ›' }}
    </button>

    <!-- 爪印发布 FAB：圆角方块 + 爪印 + 角标加号 -->
    <button type="button" class="fab pressable" aria-label="发布动态" @click="$emit('compose')">
      <span class="fab-ring" aria-hidden="true" />
      <svg class="fab-paw" width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
        <ellipse fill="currentColor" cx="32" cy="40" rx="14" ry="12" />
        <circle fill="currentColor" cx="16" cy="22" r="7" />
        <circle fill="currentColor" cx="28" cy="16" r="7" />
        <circle fill="currentColor" cx="40" cy="16" r="7" />
        <circle fill="currentColor" cx="50" cy="24" r="6.5" />
      </svg>
      <span class="fab-plus" aria-hidden="true">+</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, type CommunityPost } from '../api';

defineEmits<{ compose: []; 'open-post': [string] }>();

const cats = [
  { key: 'all', label: '推荐', icon: '✦' },
  { key: 'experience', label: '经验', icon: '◇' },
  { key: 'daily', label: '日常', icon: '🐾' },
  { key: 'help', label: '求助', icon: '?' },
];

const catMap: Record<string, string> = {
  experience: '经验',
  daily: '日常',
  help: '求助',
  all: '推荐',
};

function catLabel(key: string) {
  return catMap[key] || '动态';
}

const category = ref('all');
const items = ref<CommunityPost[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const err = ref('');

async function load(reset = false) {
  if (loading.value) return;
  loading.value = true;
  err.value = '';
  try {
    const data = await api.communityPosts({
      category: category.value === 'all' ? undefined : category.value,
      cursor: reset ? undefined : nextCursor.value || undefined,
      limit: 20,
    });
    items.value = reset ? data.items : [...items.value, ...data.items];
    nextCursor.value = data.nextCursor;
  } catch (e) {
    err.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function setCat(key: string) {
  if (category.value === key) return;
  category.value = key;
  nextCursor.value = null;
  void load(true);
}

function loadMore() {
  void load(false);
}

onMounted(() => load(true));

defineExpose({ reload: () => load(true) });
</script>

<style scoped>
.circle {
  position: relative;
  padding: calc(10px + env(safe-area-inset-top)) 12px 0;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(255, 186, 140, 0.22), transparent 50%),
    radial-gradient(90% 50% at 0% 10%, rgba(26, 158, 142, 0.1), transparent 45%),
    #f4f7f6;
}

.bg-paws {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='%231a9e8e'%3E%3Cellipse cx='40' cy='48' rx='10' ry='8'/%3E%3Ccircle cx='30' cy='36' r='4.2'/%3E%3Ccircle cx='38' cy='32' r='4.2'/%3E%3Ccircle cx='47' cy='33' r='4'/%3E%3Ccircle cx='53' cy='39' r='3.6'/%3E%3Cellipse cx='100' cy='98' rx='10' ry='8' transform='rotate(22 100 98)'/%3E%3Ccircle cx='90' cy='86' r='4.2'/%3E%3Ccircle cx='98' cy='82' r='4.2'/%3E%3Ccircle cx='107' cy='83' r='4'/%3E%3Ccircle cx='113' cy='89' r='3.6'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 140px 140px;
  z-index: 0;
}

.head,
.cats,
.waterfall,
.hint,
.err,
.more,
.empty-pet {
  position: relative;
  z-index: 1;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 4px 2px 0;
}

.brand {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 750;
  color: var(--color-brand-dark, #14756b);
  letter-spacing: 0.04em;
}

.brand-paw {
  width: 12px;
  height: 12px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%2314756b' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%2314756b' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%2314756b' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}

.head h1 {
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 780;
  letter-spacing: -0.03em;
  color: #1a2a28;
}

.bone {
  width: 22px;
  height: 10px;
  opacity: 0.4;
  flex: 0 0 auto;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Ccircle fill='%231a9e8e' cx='12' cy='12' r='8'/%3E%3Ccircle fill='%231a9e8e' cx='12' cy='24' r='8'/%3E%3Ccircle fill='%231a9e8e' cx='68' cy='12' r='8'/%3E%3Ccircle fill='%231a9e8e' cx='68' cy='24' r='8'/%3E%3Crect fill='%231a9e8e' x='12' y='14' width='56' height='8' rx='4'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.bone.flip {
  transform: scaleX(-1);
}

.sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: #7a8b88;
  font-weight: 550;
}

.compose-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  min-height: 36px;
  padding: 0 14px 0 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #1a9e8e 0%, #159687 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(26, 158, 142, 0.28);
}
.compose-chip svg {
  opacity: 0.95;
}

.cats {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  margin-bottom: 14px;
  padding: 0 2px 2px;
}
.cats::-webkit-scrollbar {
  display: none;
}
.cats button {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 7px 13px;
  background: rgba(255, 255, 255, 0.88);
  color: #5a6b68;
  font-size: 13px;
  font-weight: 650;
  box-shadow: 0 2px 8px rgba(20, 40, 36, 0.04);
}
.cats button.on {
  background: #e6f6f2;
  border-color: rgba(26, 158, 142, 0.22);
  color: #14756b;
  box-shadow: 0 4px 12px rgba(26, 158, 142, 0.12);
}
.cat-ico {
  font-size: 11px;
  line-height: 1;
  opacity: 0.85;
}

.waterfall {
  column-count: 2;
  column-gap: 10px;
}

.card {
  break-inside: avoid;
  width: 100%;
  margin: 0 0 10px;
  border: 0;
  padding: 0;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  text-align: left;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.8) inset,
    0 6px 18px rgba(24, 48, 42, 0.06);
}

.cover-wrap {
  position: relative;
  background: #eef4f2;
}
.cover {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}
.cover.empty {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  position: relative;
  background: linear-gradient(160deg, #e8f7f3, #fff5ee);
}
.cover.empty em {
  font-style: normal;
  font-size: 28px;
  font-weight: 750;
  color: #14756b;
  position: relative;
  z-index: 1;
}
.empty-paw {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / 48px no-repeat;
}

.cat-badge {
  position: absolute;
  left: 8px;
  top: 8px;
  font-size: 10px;
  font-weight: 700;
  color: #14756b;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  padding: 2px 8px;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.cat-badge[data-cat='help'] {
  color: #c45c3e;
}
.cat-badge[data-cat='daily'] {
  color: #c4783a;
}
.cat-badge[data-cat='experience'] {
  color: #14756b;
}

.vtag {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: rgba(20, 30, 28, 0.5);
  border-radius: 999px;
  padding: 3px 8px;
  backdrop-filter: blur(4px);
}

.body {
  padding: 10px 11px 12px;
}
.body strong {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: #1a2a28;
}
.meta {
  margin-top: 9px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #8a9794;
}
.author {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-style: normal;
  font-size: 9px;
  font-weight: 750;
  color: #14756b;
  background: #e6f6f2;
  flex: 0 0 auto;
}
.likes {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-variant-numeric: tabular-nums;
  color: #9aa8a5;
  flex: 0 0 auto;
}
.likes.on {
  color: #e8845c;
  font-weight: 700;
}

.hint,
.err {
  text-align: center;
  font-size: 13px;
  color: #999;
  padding: 24px 0;
}
.err {
  color: #e85d4c;
}

.empty-pet .empty-cta {
  margin-top: 4px;
  border: 0;
  border-radius: 999px;
  padding: 8px 18px;
  background: var(--color-brand, #1a9e8e);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.more {
  display: block;
  width: 100%;
  margin: 8px 0 20px;
  border: 0;
  background: transparent;
  color: #14756b;
  font-weight: 700;
  min-height: 40px;
}

/* —— 爪印发布 FAB —— */
.fab {
  position: fixed;
  right: max(18px, calc(50% - 180px));
  bottom: calc(var(--tabbar-height, 64px) + env(safe-area-inset-bottom, 16px) + 18px);
  width: 58px;
  height: 58px;
  border: 0;
  border-radius: 20px;
  padding: 0;
  display: grid;
  place-items: center;
  color: #fff;
  background:
    radial-gradient(120% 120% at 30% 20%, rgba(255, 255, 255, 0.28), transparent 45%),
    linear-gradient(145deg, #ff9a6a 0%, #ff7a45 55%, #f06a3a 100%);
  box-shadow:
    0 12px 28px rgba(240, 106, 58, 0.38),
    0 2px 0 rgba(255, 255, 255, 0.25) inset;
  z-index: 40;
  overflow: visible;
}
.fab-ring {
  position: absolute;
  inset: -4px;
  border-radius: 24px;
  border: 1.5px dashed rgba(255, 154, 106, 0.55);
  pointer-events: none;
  animation: fab-spin 12s linear infinite;
}
.fab-paw {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1px 1px rgba(120, 40, 10, 0.2));
}
.fab-plus {
  position: absolute;
  right: -2px;
  top: -2px;
  z-index: 2;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  color: #14756b;
  background: #fff;
  box-shadow: 0 3px 10px rgba(20, 40, 36, 0.18);
  border: 1.5px solid #e6f6f2;
}

@keyframes fab-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fab-ring {
    animation: none;
  }
}
</style>
