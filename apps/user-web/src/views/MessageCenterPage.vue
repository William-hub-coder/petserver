<template>
  <div class="page msg-page">
    <PetMotifs tone="soft" />
    <header class="nav">
      <button type="button" class="back" aria-label="返回" @click="$emit('close')">‹</button>
      <h1 class="title-paw">消息</h1>
      <button type="button" @click="markAll">全部已读</button>
    </header>
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t"
        type="button"
        :class="{ on: tab === t }"
        @click="tab = t"
      >
        {{ t }}
      </button>
    </div>
    <Transition name="panel-fade" mode="out-in">
      <div v-if="tab === '会话'" key="chats" class="list">
        <div v-if="!getToken()" class="empty-pet">
          <p>登录后查看与门店的会话</p>
        </div>
        <div v-else-if="!conversations.length" class="empty-pet">
          <p>暂无会话，可在门店详情点「联系商家」</p>
        </div>
        <article
          v-for="c in conversations"
          :key="c.id"
          class="item card pressable"
          :class="{ unread: c.unread > 0 }"
          @click="$emit('open-chat', { id: c.id, name: c.peerName || c.merchantName || '会话' })"
        >
          <div
            class="ico"
            :class="{ paw: !c.coverTone }"
            :style="c.coverTone ? { background: c.coverTone } : undefined"
          >
            <span v-if="c.coverTone">{{ (c.peerName || c.merchantName || '店').slice(0, 1) }}</span>
          </div>
          <div class="body">
            <div class="top">
              <strong>{{ c.peerName || c.merchantName || '会话' }}</strong>
              <span>{{ formatTime(c.lastMsgAt || '') }}</span>
            </div>
            <p>
              <em class="kind">{{ c.kindLabel }}</em>
              {{ c.lastPreview || '暂无消息' }}
            </p>
          </div>
          <i v-if="c.unread > 0">{{ c.unread > 99 ? '99+' : c.unread }}</i>
        </article>
      </div>
      <div v-else key="inbox" class="list">
        <div v-if="!visibleInbox.length" class="empty-pet">
          <p>暂无消息，登录后可同步站内信</p>
        </div>
        <article
          v-for="m in visibleInbox"
          :key="m.id"
          class="item card pressable"
          :class="{ unread: m.unread }"
          @click="onInboxClick(m)"
        >
          <div class="ico" :class="inboxIcoClass(m.type)">
            {{ m.type === '订单' ? '单' : m.type === '会话' ? '' : '讯' }}
          </div>
          <div class="body">
            <div class="top">
              <strong>{{ m.title }}</strong>
              <span>{{ formatTime(m.time) }}</span>
            </div>
            <p>{{ m.body }}</p>
          </div>
          <i v-if="m.unread" class="dot" />
        </article>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { messages as seed } from '../data/mock';
import { api, getToken } from '../api';
import PetMotifs from '../components/PetMotifs.vue';

function inboxIcoClass(type: string) {
  if (type === '会话') return 'paw';
  if (type === '订单') return 'bone';
  return '';
}

const emit = defineEmits<{
  close: [];
  'open-chat': [{ id: string; name: string }];
  'unread-changed': [];
}>();

const tabs = ['会话', '系统', '订单', '全部'];
const tab = ref('会话');
const list = reactive(
  seed.map((m) => ({ ...m, conversationId: undefined as string | undefined })),
);
const conversations = ref<
  Array<{
    id: string;
    kind: string;
    kindLabel: string;
    lastMsgAt: string | null;
    lastPreview: string | null;
    unread: number;
    peerName?: string;
    merchantName?: string;
    coverTone?: string | null;
  }>
>([]);

const visibleInbox = computed(() => {
  if (tab.value === '全部') return list;
  if (tab.value === '系统') return list.filter((m) => m.type === '系统' || m.type === '活动' || m.type === '会话');
  if (tab.value === '订单') return list.filter((m) => m.type === '订单');
  return list;
});

let timer: ReturnType<typeof setInterval> | null = null;

async function refresh() {
  if (!getToken()) return;
  try {
    const [rows, convs] = await Promise.all([api.inbox(), api.conversations()]);
    list.splice(0, list.length, ...rows);
    conversations.value = convs;
    emit('unread-changed');
  } catch {
    /* keep */
  }
}

async function onInboxClick(m: {
  id: string;
  unread: boolean;
  conversationId?: string;
  title: string;
}) {
  if (m.unread) {
    m.unread = false;
    try {
      await api.markInboxRead(m.id);
      emit('unread-changed');
    } catch {
      /* ignore */
    }
  }
  if (m.conversationId) {
    emit('open-chat', { id: m.conversationId, name: m.title });
  }
}

async function markAll() {
  for (const m of list) {
    if (m.unread) {
      m.unread = false;
      try {
        await api.markInboxRead(m.id);
      } catch {
        /* ignore */
      }
    }
  }
  for (const c of conversations.value) {
    if (c.unread > 0) {
      try {
        await api.markConversationRead(c.id);
        c.unread = 0;
      } catch {
        /* ignore */
      }
    }
  }
  emit('unread-changed');
}

function formatTime(t: string) {
  if (!t) return '';
  if (!t.includes('T')) return t;
  return t.replace('T', ' ').slice(5, 16);
}

onMounted(() => {
  refresh();
  timer = setInterval(refresh, 3000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.msg-page {
  position: absolute;
  inset: 0;
  z-index: 55;
  background: var(--color-page, #f7f8fa);
  overflow: auto;
}
.msg-page > :not(.motifs) {
  position: relative;
  z-index: 1;
}
.nav {
  padding: calc(12px + env(safe-area-inset-top)) 12px 12px;
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 4px;
}
.nav h1 { margin: 0; font-size: 20px; text-align: center; }
.nav button { border: 0; background: transparent; color: var(--color-primary); }
.nav .back { font-size: 28px; line-height: 1; color: var(--color-ink); padding: 0; }
.tabs { display: flex; gap: 8px; padding: 0 16px 12px; overflow-x: auto; }
.tabs button {
  border: 0; border-radius: 999px; padding: 6px 12px; background: #eef3f1; font-size: 13px; white-space: nowrap;
}
.tabs button.on { background: var(--color-primary); color: #fff; }
.list { padding: 0 16px 100px; display: flex; flex-direction: column; gap: 10px; }
.item { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; padding: 12px; align-items: start; }
.item.unread { box-shadow: inset 3px 0 0 var(--color-accent); }
.ico {
  width: 40px; height: 40px; border-radius: 12px; background: #eef6f4;
  display: grid; place-items: center; font-weight: 700; color: var(--color-brand-dark);
}
.ico.paw {
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%2314756b' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%2314756b' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%2314756b' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
      center / 20px no-repeat,
    var(--color-brand-light);
  color: transparent;
}
.ico.bone {
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 36'%3E%3Crect fill='%23d96a3a' x='22' y='14' width='36' height='8' rx='4'/%3E%3Ccircle fill='%23d96a3a' cx='14' cy='12' r='7'/%3E%3Ccircle fill='%23d96a3a' cx='14' cy='24' r='7'/%3E%3Ccircle fill='%23d96a3a' cx='66' cy='12' r='7'/%3E%3Ccircle fill='%23d96a3a' cx='66' cy='24' r='7'/%3E%3C/svg%3E")
      center / 22px 11px no-repeat,
    var(--color-accent-light);
  color: transparent;
  font-size: 0;
}
.body .top { display: flex; justify-content: space-between; gap: 8px; }
.body p { margin: 4px 0 0; color: #566; font-size: 13px; }
.kind {
  display: inline-block; font-style: normal; font-size: 11px; margin-right: 4px;
  padding: 1px 6px; border-radius: 999px; background: var(--color-brand-light); color: var(--color-brand-dark);
}
.item i {
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
  background: var(--color-accent); color: #fff; font-size: 11px; font-style: normal;
  display: grid; place-items: center; margin-top: 4px;
}
.item i.dot { width: 8px; height: 8px; min-width: 8px; padding: 0; }
</style>
