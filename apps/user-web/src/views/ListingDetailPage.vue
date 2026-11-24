<template>
  <div class="page" v-if="item">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>{{ item.channelLabel }}</h1>
      <span />
    </header>

    <div class="gallery">
      <img :src="currentImg" :alt="item.title" />
      <div v-if="images.length > 1" class="dots">
        <button
          v-for="(u, i) in images"
          :key="u + i"
          type="button"
          :class="{ on: imgIndex === i }"
          @click="imgIndex = i"
        />
      </div>
      <span class="pill" :class="item.channel">{{ detailPill }}</span>
    </div>

    <div class="panel">
      <h2>{{ item.title }}</h2>
      <p class="sub">
        {{ item.species }} · {{ item.breed || '品种待询' }} · {{ item.gender || '性别待询' }} ·
        {{ item.ageLabel }}
      </p>
      <div class="price-row">
        <strong v-if="item.free">免费领养</strong>
        <strong v-else>¥{{ item.price }}</strong>
        <small v-if="!item.free && item.channel === 'adopt'">有偿领养 · 到店核销/保证金以发布方说明为准</small>
        <small v-else-if="!item.free">标价 · 线下核验证照后确认</small>
      </div>

      <div class="trust">
        <span :class="{ on: item.vaccinated }">疫苗 {{ item.vaccinated ? '已完成' : '待确认' }}</span>
        <span :class="{ on: item.sterilized }">绝育 {{ item.sterilized ? '已完成' : '待确认' }}</span>
        <span class="on">平台已审</span>
      </div>

      <article class="shop card">
        <div>
          <strong>{{ item.merchantName }}</strong>
          <p>信用分 {{ item.creditScore }} · {{ item.district || item.city }}</p>
        </div>
        <span v-if="item.selectedBadge" class="tag-chip gold">严选</span>
      </article>

      <section v-if="item.channel === 'sale'" class="block card license">
        <h3>证照与检疫</h3>
        <p><b>许可证号</b>{{ item.licenseNo || '—' }}</p>
        <p><b>检疫摘要</b>{{ item.quarantineNote || '—' }}</p>
      </section>

      <section class="block">
        <h3>详情说明</h3>
        <p class="desc">{{ item.description }}</p>
        <p class="warn">{{ item.complianceNote }}</p>
      </section>

      <button type="button" class="map-card card pressable" @click="$emit('open-map')">
        <div>
          <strong>在地图上看位置</strong>
          <p>{{ item.address || item.district || item.city }}</p>
        </div>
        <span>›</span>
      </button>
    </div>

    <footer class="bar">
      <button type="button" class="btn-ghost" @click="contact">联系发布方</button>
      <button
        v-if="item.channel === 'adopt'"
        type="button"
        class="btn-accent grow"
        :disabled="busy"
        @click="showApply = true"
      >
        申请领养
      </button>
      <button v-else type="button" class="btn-accent grow" :disabled="busy" @click="contact">
        意向沟通
      </button>
    </footer>
    <p v-if="tip" class="tip">{{ tip }}</p>

    <Transition name="modal-fade">
      <div v-if="showApply" class="sheet" @click.self="showApply = false">
        <div class="panel-sheet">
          <h3>领养申请</h3>
          <textarea v-model="motive" rows="3" placeholder="领养动机（为何适合、居住情况…）" />
          <textarea v-model="experience" rows="2" placeholder="养宠经验（可选）" />
          <label class="check">
            <input v-model="acceptHomeVisit" type="checkbox" />
            接受家访 / 回访
          </label>
          <button type="button" class="btn-accent full" :disabled="busy" @click="apply">提交并开启会话</button>
          <button type="button" class="link" @click="showApply = false">取消</button>
        </div>
      </div>
    </Transition>
  </div>
  <div v-else class="page"><p class="tip">{{ tip || '加载中…' }}</p></div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api, getToken } from '../api';
import { listingCoverUrl } from '../lib/listing-cover';

const props = defineProps<{ listingId: string }>();
const emit = defineEmits<{
  close: [];
  'open-chat': [{ id: string; name: string }];
  'open-map': [];
}>();

const item = ref<Awaited<ReturnType<typeof api.petListing>> | null>(null);
const tip = ref('');
const busy = ref(false);
const showApply = ref(false);
const motive = ref('');
const experience = ref('');
const acceptHomeVisit = ref(true);
const imgIndex = ref(0);

const images = computed(() => {
  if (!item.value) return [] as string[];
  const imgs = item.value.images?.length
    ? item.value.images
    : [listingCoverUrl(item.value)];
  return imgs;
});
const currentImg = computed(() => images.value[imgIndex.value] || listingCoverUrl(item.value || { id: '' }));

async function load() {
  tip.value = '';
  try {
    item.value = await api.petListing(props.listingId);
    imgIndex.value = 0;
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function contact() {
  if (!getToken()) {
    tip.value = '请先登录';
    return;
  }
  busy.value = true;
  tip.value = '';
  try {
    const res = await api.contactPetListing(props.listingId);
    emit('open-chat', { id: res.conversationId, name: item.value?.title || '领养/售宠沟通' });
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '无法发起会话';
  } finally {
    busy.value = false;
  }
}

const detailPill = computed(() => {
  if (!item.value) return '';
  if (item.value.priceLabel) return item.value.priceLabel;
  if (item.value.channel === 'sale') return '在售';
  return item.value.free ? '免费领养' : '有偿领养';
});

async function apply() {
  if (!getToken()) {
    tip.value = '请先登录';
    return;
  }
  busy.value = true;
  tip.value = '';
  try {
    const res = await api.applyPetListing(props.listingId, {
      motive: motive.value,
      experience: experience.value,
      acceptHomeVisit: acceptHomeVisit.value,
    });
    showApply.value = false;
    emit('open-chat', { id: res.conversationId, name: item.value?.title || '领养申请' });
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '申请失败';
  } finally {
    busy.value = false;
  }
}

watch(() => props.listingId, load);
onMounted(load);
</script>

<style scoped>
.page { position: absolute; inset: 0; z-index: 46; background: var(--color-page); overflow: auto; padding-bottom: 96px; }
.nav {
  display: grid; grid-template-columns: 40px 1fr 40px; align-items: center;
  padding: calc(10px + env(safe-area-inset-top)) 12px 8px; position: sticky; top: 0; z-index: 2;
  background: rgba(247,248,250,.94); backdrop-filter: blur(10px);
}
.nav h1 { margin: 0; text-align: center; font-size: 16px; }
.nav button { border: 0; background: transparent; font-size: 26px; }
.gallery { position: relative; height: 260px; background: #dde8e4; }
.gallery img { width: 100%; height: 100%; object-fit: cover; display: block; }
.dots {
  position: absolute; left: 0; right: 0; bottom: 12px; display: flex; justify-content: center; gap: 6px;
}
.dots button {
  width: 7px; height: 7px; border: 0; border-radius: 999px; background: rgba(255,255,255,.45); padding: 0;
}
.dots button.on { width: 16px; background: #fff; }
.pill {
  position: absolute; top: 14px; left: 14px; font-size: 11px; font-weight: 700;
  padding: 4px 10px; border-radius: 999px; color: #fff;
}
.pill.adopt { background: var(--color-trust); }
.pill.sale { background: linear-gradient(135deg, #e6b85c, #d4a03a); }
.panel { padding: 16px; }
h2 { margin: 0 0 6px; font-size: 20px; letter-spacing: -.02em; }
.sub { margin: 0 0 10px; color: var(--color-sub); font-size: 13px; }
.price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.price-row strong { color: var(--color-accent); font-size: 24px; }
.price-row small { color: var(--color-faint); font-size: 12px; }
.trust { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.trust span {
  font-size: 11px; font-weight: 650; padding: 5px 10px; border-radius: 999px;
  background: var(--color-divider); color: var(--color-faint);
}
.trust span.on { background: var(--color-trust-light); color: var(--color-trust); }
.shop { display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 12px; }
.shop p { margin: 4px 0 0; font-size: 12px; color: var(--color-sub); }
.license { padding: 12px; margin-bottom: 12px; }
.license h3, .block h3 { margin: 0 0 8px; font-size: 15px; }
.license p { margin: 0 0 6px; font-size: 13px; color: var(--color-ink); line-height: 1.45; }
.license b { display: inline-block; min-width: 72px; color: var(--color-sub); font-weight: 600; }
.desc { white-space: pre-wrap; line-height: 1.55; color: #445; font-size: 14px; margin: 0 0 10px; }
.warn {
  margin: 0; font-size: 12px; line-height: 1.45; color: #8a6a28;
  background: var(--color-gold-bg); padding: 10px 12px; border-radius: 12px;
}
.map-card {
  margin-top: 14px; padding: 14px; display: flex; justify-content: space-between; align-items: center;
}
.map-card p { margin: 4px 0 0; font-size: 12px; color: var(--color-sub); }
.map-card span { font-size: 22px; color: var(--color-brand); }
.bar {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; width: 100%; max-width: 390px;
  display: flex; gap: 10px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: rgba(255,255,255,.96); border-top: 1px solid var(--color-line); z-index: 5;
}
.grow { flex: 1; }
.tip { text-align: center; color: #b26a00; font-size: 12px; padding: 8px; }
.sheet {
  position: absolute; inset: 0; background: var(--color-overlay); display: grid; place-items: end center; z-index: 8;
}
.panel-sheet {
  width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
}
.panel-sheet h3 { margin: 0 0 10px; }
.panel-sheet textarea {
  width: 100%; box-sizing: border-box; border: 1px solid var(--color-line); border-radius: 12px;
  padding: 10px; margin-bottom: 8px; font-size: 14px; resize: vertical;
}
.check { display: flex; align-items: center; gap: 8px; font-size: 13px; margin: 4px 0 12px; }
.full { width: 100%; }
.link { border: 0; background: transparent; color: var(--color-sub); width: 100%; margin-top: 8px; }
</style>
