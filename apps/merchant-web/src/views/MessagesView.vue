<template>
  <div class="page">
    <header class="nav">
      <h1 class="with-paw">消息</h1>
      <button v-if="activeId" type="button" class="link" @click="activeId = null">‹ 返回列表</button>
    </header>

    <template v-if="!activeId">
      <p v-if="error" class="err">{{ error }}</p>
      <div v-else-if="!list.length" class="empty pet">
        <i aria-hidden="true" />
        <p>暂无用户会话</p>
      </div>
      <article
        v-for="c in list"
        :key="c.id"
        class="item card"
        @click="openThread(c)"
      >
        <div class="top">
          <strong>{{ c.peerName || '用户' }}</strong>
          <span class="kind">{{ c.kindLabel }}</span>
          <em v-if="c.unread">{{ c.unread }}</em>
        </div>
        <p>{{ c.lastPreview || '暂无消息' }}</p>
        <small>{{ formatTime(c.lastMsgAt) }}</small>
      </article>
    </template>

    <template v-else>
      <p v-if="threadHint" class="notice">{{ threadHint }}</p>
      <div ref="scroller" class="msgs">
        <div
          v-for="m in messages"
          :key="m.id"
          class="row"
          :class="{ me: m.mine, sys: m.type === 'system' }"
        >
          <p v-if="m.type === 'system'" class="sys">{{ m.body }}</p>
          <div v-else class="bubble" :class="{ blocked: m.blocked }">{{ m.body }}</div>
        </div>
      </div>
      <footer class="composer">
        <p v-if="tip" class="tip">{{ tip }}</p>
        <div class="row-input">
          <input v-model="draft" type="text" placeholder="回复用户…" @keydown.enter.prevent="send" />
          <button type="button" :disabled="busy || !draft.trim()" @click="send">发送</button>
        </div>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { api } from '../api';

const list = ref<
  Array<{
    id: string;
    kind: string;
    kindLabel: string;
    lastMsgAt: string | null;
    lastPreview: string | null;
    unread: number;
    peerName?: string;
  }>
>([]);
const activeId = ref<string | null>(null);
const activeKind = ref('');
const messages = ref<
  Array<{
    id: string;
    body: string;
    type: string;
    mine: boolean;
    blocked?: boolean;
  }>
>([]);
const draft = ref('');
const busy = ref(false);
const tip = ref('');
const error = ref('');
const scroller = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;

const threadHint = ref('');

function formatTime(t: string | null) {
  if (!t) return '';
  return t.replace('T', ' ').slice(5, 16);
}

async function loadList() {
  try {
    list.value = await api.conversations();
    error.value = '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function loadThread() {
  if (!activeId.value) return;
  try {
    const data = await api.conversationMessages(activeId.value);
    activeKind.value = data.conversation.kind;
    threadHint.value =
      data.conversation.kind === 'doctor_consult'
        ? '问诊回复：仅咨询分诊，不开处方'
        : '';
    messages.value = data.messages;
    await api.markConversationRead(activeId.value);
    await nextTick();
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '加载失败';
  }
}

function openThread(c: { id: string }) {
  activeId.value = c.id;
  tip.value = '';
  loadThread();
}

async function send() {
  if (!activeId.value || !draft.value.trim() || busy.value) return;
  busy.value = true;
  tip.value = '';
  try {
    const res = await api.sendChatMessage(activeId.value, draft.value.trim());
    draft.value = '';
    if (res.blocked) tip.value = res.message || '内容已拦截';
    await loadThread();
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '发送失败';
  } finally {
    busy.value = false;
  }
}

function tick() {
  if (activeId.value) loadThread();
  else loadList();
}

onMounted(() => {
  loadList();
  timer = setInterval(tick, 3000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.page {
  padding: 16px 16px 88px; min-height: 100vh;
  background-color: #f6f8f7;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='%231a9e8e' fill-opacity='0.04'%3E%3Cellipse cx='36' cy='40' rx='6' ry='5'/%3E%3Ccircle cx='30' cy='32' r='2.8'/%3E%3Ccircle cx='36' cy='29' r='2.8'/%3E%3Ccircle cx='42' cy='30' r='2.6'/%3E%3Ccircle cx='46' cy='35' r='2.4'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 160px 160px;
}
.nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.nav h1 { margin: 0; font-size: 20px; }
.with-paw { display: inline-flex; align-items: center; gap: 8px; }
.with-paw::after {
  content: ''; width: 14px; height: 14px; opacity: 0.45;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E") center / contain no-repeat;
}
.link { border: 0; background: transparent; color: #1a9e8e; font-size: 14px; }
.item {
  background: #fff; border-radius: 14px; padding: 12px; margin-bottom: 10px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.04); cursor: pointer;
}
.item .top { display: flex; align-items: center; gap: 8px; }
.kind {
  font-size: 11px; padding: 2px 6px; border-radius: 999px; background: #e8f5f2; color: #167a6e;
}
.item em {
  margin-left: auto; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
  background: #ff8c5a; color: #fff; font-size: 11px; font-style: normal;
  display: grid; place-items: center;
}
.item p { margin: 6px 0 0; color: #566; font-size: 13px; }
.item small { color: #99a; font-size: 11px; }
.empty, .err { text-align: center; color: #799; padding: 40px 0; }
.empty.pet { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.empty.pet i {
  width: 48px; height: 48px; border-radius: 16px;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E") center / 26px no-repeat,
    #e8f6f4;
}
.empty.pet p { margin: 0; }
.err { color: #a33; }
.notice {
  margin: 0 0 8px; text-align: center; font-size: 12px; padding: 8px;
  background: #fff4ec; color: #c65d30; border-radius: 10px;
}
.msgs { display: flex; flex-direction: column; gap: 10px; min-height: 50vh; padding-bottom: 80px; }
.row { display: flex; }
.row.me { justify-content: flex-end; }
.row.sys { justify-content: center; }
.sys { margin: 0; font-size: 12px; color: #899; background: rgba(0,0,0,0.04); padding: 6px 10px; border-radius: 999px; }
.bubble {
  max-width: 78%; background: #fff; padding: 10px 12px; border-radius: 14px 14px 14px 4px;
  font-size: 14px; box-shadow: 0 1px 0 rgba(0,0,0,0.05);
}
.row.me .bubble { background: #1a9e8e; color: #fff; border-radius: 14px 14px 4px 14px; }
.bubble.blocked { opacity: 0.7; }
.composer {
  position: fixed; left: 0; right: 0; bottom: 56px; padding: 10px 12px;
  background: rgba(255,255,255,0.96); border-top: 1px solid #e6ece9;
}
.row-input { display: flex; gap: 8px; }
.row-input input {
  flex: 1; border: 1px solid #dde5e1; border-radius: 10px; padding: 10px 12px;
}
.row-input button {
  border: 0; border-radius: 10px; padding: 0 14px; background: #1a9e8e; color: #fff;
}
.tip { margin: 0 0 6px; font-size: 12px; color: #b26a00; }
</style>
