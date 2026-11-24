<template>
  <div class="page chat">
    <PetMotifs
      tone="mint"
      :marks="[
        { id: 1, kind: 'paw', top: '10%', left: '86%', rot: 14, opacity: 0.1 },
        { id: 2, kind: 'bone', top: '28%', left: '6%', rot: -18, opacity: 0.09 },
        { id: 3, kind: 'paw', top: '62%', left: '90%', rot: -12, opacity: 0.1 },
        { id: 4, kind: 'paw', top: '84%', left: '10%', rot: 22, opacity: 0.08 },
      ]"
    />
    <header class="nav">
      <button type="button" class="back" @click="$emit('close')">‹</button>
      <div>
        <h1 class="title-paw">{{ title }}</h1>
        <p>{{ kindHint }}</p>
      </div>
      <button type="button" class="link" @click="reportConv">举报</button>
    </header>
    <p v-if="isConsult" class="notice">仅健康咨询与分诊，不开具处方；急症请线下就医</p>
    <div ref="scroller" class="msgs">
      <div
        v-for="m in messages"
        :key="m.id"
        class="row"
        :class="{ me: m.mine, sys: m.type === 'system' }"
      >
        <template v-if="m.type === 'system'">
          <p class="sys-bubble">{{ m.body }}</p>
        </template>
        <template v-else>
          <div v-if="!m.mine" class="av shop" aria-hidden="true" />
          <div class="col">
            <div class="bubble" :class="{ blocked: m.blocked }">
              {{ m.body }}
              <small v-if="m.blocked">（已拦截，仅自己可见）</small>
            </div>
            <button v-if="!m.mine && !m.blocked" type="button" class="flag" @click="reportMsg(m.id)">
              举报
            </button>
          </div>
          <div v-if="m.mine" class="av me">我</div>
        </template>
      </div>
    </div>
    <footer class="composer">
      <p v-if="tip" class="tip">{{ tip }}</p>
      <div class="row-input">
        <input v-model="draft" type="text" placeholder="输入消息…" maxlength="2000" @keydown.enter.prevent="send" />
        <button type="button" class="btn-accent" :disabled="busy || !draft.trim()" @click="send">发送</button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { api, getToken } from '../api';
import PetMotifs from '../components/PetMotifs.vue';

const props = defineProps<{ conversationId: string; peerName?: string }>();
defineEmits<{ close: [] }>();

const messages = ref<
  Array<{
    id: string;
    body: string;
    type: string;
    senderRole: string;
    mine: boolean;
    blocked?: boolean;
    moderationStatus: string;
    time: string;
  }>
>([]);
const kind = ref('');
const title = ref(props.peerName || '会话');
const draft = ref('');
const busy = ref(false);
const tip = ref('');
const scroller = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;

const isConsult = computed(() => kind.value === 'doctor_consult');
const kindHint = computed(() => {
  if (kind.value === 'doctor_consult') return '线上问诊';
  if (kind.value === 'mall_support') return '商城客服';
  return '门店会话';
});

async function load() {
  if (!getToken()) {
    tip.value = '请先登录';
    return;
  }
  try {
    const data = await api.conversationMessages(props.conversationId);
    kind.value = data.conversation.kind;
    messages.value = data.messages;
    await api.markConversationRead(props.conversationId);
    await nextTick();
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '加载失败';
  }
}

async function send() {
  const text = draft.value.trim();
  if (!text || busy.value) return;
  busy.value = true;
  tip.value = '';
  try {
    const res = await api.sendChatMessage(props.conversationId, text);
    draft.value = '';
    if (res.blocked) {
      tip.value = res.message || '内容含不当信息，已拦截';
    }
    await load();
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '发送失败';
  } finally {
    busy.value = false;
  }
}

async function reportMsg(chatMessageId: string) {
  try {
    await api.reportChatFlag({ chatMessageId, reason: '不当内容' });
    tip.value = '已提交举报，平台将审核';
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '举报失败';
  }
}

async function reportConv() {
  try {
    await api.reportChatFlag({ conversationId: props.conversationId, reason: '会话举报' });
    tip.value = '已提交举报，平台将审核';
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '举报失败';
  }
}

onMounted(() => {
  load();
  timer = setInterval(load, 3000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 0;
}
.chat > :not(.motifs) {
  position: relative;
  z-index: 1;
}
.nav {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: calc(12px + env(safe-area-inset-top)) 12px 10px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
}
.nav h1 { margin: 0; font-size: 17px; }
.nav p { margin: 2px 0 0; font-size: 12px; color: var(--color-text-tertiary); }
.back, .link {
  border: 0; background: transparent; font-size: 22px; color: var(--color-brand); cursor: pointer;
}
.link { font-size: 13px; }
.notice {
  margin: 0; text-align: center; font-size: 12px; padding: 8px 12px;
  background: var(--color-accent-light); color: #c65d30;
}
.msgs {
  flex: 1; overflow: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
  padding-bottom: 100px;
}
.row { display: flex; gap: 8px; align-items: flex-end; }
.row.me { justify-content: flex-end; }
.row.sys { justify-content: center; }
.sys-bubble {
  margin: 0; font-size: 12px; color: var(--color-text-tertiary);
  background: rgba(26, 158, 142, 0.08); padding: 6px 12px 6px 28px; border-radius: 999px; max-width: 90%;
  position: relative;
}
.sys-bubble::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  width: 12px;
  height: 12px;
  transform: translateY(-50%);
  opacity: 0.55;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.av {
  width: 34px; height: 34px; border-radius: 12px; background: var(--color-brand-light);
  color: var(--color-brand-dark); font-size: 11px; font-weight: 800;
  display: grid; place-items: center; flex-shrink: 0;
}
.av.shop {
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%2314756b' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%2314756b' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%2314756b' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%2314756b' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
      center / 18px no-repeat,
    var(--color-brand-light);
}
.av.me { background: var(--color-brand); color: #fff; }
.col { max-width: 78%; display: flex; flex-direction: column; gap: 4px; }
.bubble {
  background: #fff; border-radius: 14px 14px 14px 4px; padding: 10px 12px;
  box-shadow: 0 1px 0 rgba(20,40,30,0.06); font-size: 14px; line-height: 1.45;
}
.row.me .bubble {
  background: var(--color-brand); color: #fff; border-radius: 14px 14px 4px 14px;
}
.bubble.blocked { opacity: 0.75; }
.bubble small { display: block; margin-top: 4px; font-size: 11px; opacity: 0.85; }
.flag {
  align-self: flex-start; border: 0; background: transparent;
  color: var(--color-text-tertiary); font-size: 11px; padding: 0; cursor: pointer;
}
.composer {
  position: sticky; bottom: 0; padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.96); border-top: 0.5px solid var(--color-divider);
}
.row-input { display: flex; gap: 8px; }
.row-input input {
  flex: 1; border: 1px solid var(--color-divider); border-radius: 12px;
  padding: 10px 12px; font-size: 14px; background: #fff;
}
.tip { margin: 0 0 6px; font-size: 12px; color: #b26a00; }
</style>
