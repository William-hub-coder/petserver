<template>
  <div class="page chat">
    <PetMotifs
      tone="mint"
      :marks="[
        { id: 1, kind: 'paw', top: '18%', left: '86%', rot: 16, opacity: 0.1, scale: 1.1 },
        { id: 2, kind: 'bone', top: '42%', left: '4%', rot: -18, opacity: 0.09 },
        { id: 3, kind: 'paw', top: '68%', left: '90%', rot: -10, opacity: 0.09 },
        { id: 4, kind: 'bone', top: '22%', left: '6%', rot: 12, opacity: 0.08, scale: 0.9 },
      ]"
    />

    <header class="nav">
      <div class="nav-deco" aria-hidden="true">
        <span class="stitch" />
      </div>
      <div class="nav-left">
        <div class="brand-av" aria-hidden="true">
          <span class="spark" />
        </div>
        <div>
          <h1>宠伴助手</h1>
          <p>{{ subtitle }}</p>
        </div>
      </div>
      <span class="live" :class="{ off: agentOffline }">
        <i class="live-dot" />
        {{ agentOffline ? '降级' : '在线' }}
      </span>
    </header>

    <p class="notice">
      <span class="notice-ico" aria-hidden="true" />
      AI 内容仅供参考，急症请立即线下就医
    </p>

    <div ref="listEl" class="msgs">
      <section v-if="showWelcome" class="welcome">
        <div class="welcome-art" aria-hidden="true">
          <span class="ring" />
          <span class="big-paw" />
        </div>
        <h2>你好，{{ profileHint || '毛孩家长' }}</h2>
        <p>
          {{
            pets.length
              ? `已同步档案：${pets.map((p) => p.name).join('、')}。说说需求，我帮你匹配严选店。`
              : '说说宠物类型和需求，我帮你匹配严选店、解答养宠小问题。登录后可同步宠物档案与对话记忆。'
          }}
        </p>
        <div class="caps">
          <span>找医院</span>
          <span>洗护建议</span>
          <span>寄养推荐</span>
        </div>
      </section>

      <div v-for="(m, i) in messages" :key="i" class="row" :class="{ me: m.isUser }">
        <div v-if="!m.isUser" class="av" aria-hidden="true" />
        <div class="col">
          <span v-if="!m.isUser" class="who">宠伴助手</span>
          <div class="bubble">{{ m.text }}</div>
        </div>
      </div>
      <div v-if="sending" class="row">
        <div class="av" aria-hidden="true" />
        <div class="typing"><i /><i /><i /></div>
      </div>
    </div>

    <div class="dock">
      <div class="dock-deco" aria-hidden="true">
        <span class="paw tl" />
        <span class="paw tr" />
        <span class="bone" />
      </div>
      <div v-if="showSuggest" class="suggest">
        <button v-for="s in suggestions" :key="s" type="button" @click="ask(s)">
          <i class="chip-paw" aria-hidden="true" />
          {{ s }}
        </button>
      </div>
      <footer class="composer">
        <span class="input-paw" aria-hidden="true" />
        <input
          v-model="draft"
          placeholder="描述宠物类型和需求…"
          :disabled="sending"
          @keyup.enter="send"
        />
        <button type="button" class="send" :disabled="sending || !draft.trim()" @click="send">
          发送
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  api,
  getAiGuestKey,
  getAiSessionId,
  getStoredUser,
  getToken,
  mergeAiSessionAfterLogin,
  setAiSessionId,
} from '../api';
import PetMotifs from '../components/PetMotifs.vue';
import { useUserLocation } from '../lib/user-location';

const props = defineProps<{ active?: boolean }>();

const draft = ref('');
const sending = ref(false);
const agentOffline = ref(false);
const listEl = ref<HTMLElement | null>(null);
const guestKey = ref(getAiGuestKey());
const sessionId = ref(getAiSessionId() || '');
const pets = ref<Array<{ id: string; name: string; type: string }>>([]);
const profileHint = ref('');
const suggestions = ['附近靠谱医院', '爬宠温湿度怎么调', '周末寄养推荐'];
const welcomeText = '你好，我是宠伴助手。告诉我宠物类型和需求，我帮你匹配严选店。';
const messages = ref([{ text: welcomeText, isUser: false }]);
const historyLoaded = ref(false);
let abortCtrl: AbortController | null = null;

const { location } = useUserLocation();

const showSuggest = computed(
  () => messages.value.filter((m) => m.isUser).length === 0 && !sending.value,
);
const showWelcome = computed(
  () => messages.value.length <= 1 && !messages.value.some((m) => m.isUser),
);
const subtitle = computed(() => {
  if (pets.value.length) return `已同步 ${pets.value.length} 只毛孩 · 对话记忆已开启`;
  if (getToken()) return '已登录 · 对话记忆已开启';
  return '严选导览 · 找店 · 养宠问答';
});

async function bottom() {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
}

async function probeAgent() {
  try {
    const res = await fetch('/api/health/deps', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      agentOffline.value = true;
      return;
    }
    const json = await res.json();
    const agent = (json?.deps ?? []).find((d: { name?: string }) => d.name === 'agent');
    agentOffline.value = !agent?.ok;
  } catch {
    agentOffline.value = true;
  }
}

async function loadProfile() {
  const u = getStoredUser();
  profileHint.value = u?.nickname || '';
  if (!getToken()) {
    pets.value = [];
    return;
  }
  try {
    const me = await api.me();
    pets.value = me.pets || [];
    profileHint.value = me.nickname || profileHint.value;
  } catch {
    pets.value = [];
  }
}

async function loadHistory() {
  try {
    const hist = await api.aiHistory(sessionId.value || undefined, guestKey.value);
    if (hist?.sessionId) {
      sessionId.value = hist.sessionId;
      setAiSessionId(hist.sessionId);
    }
    const rows = (hist?.messages ?? []).filter(
      (m) => m.role === 'user' || m.role === 'assistant',
    );
    if (rows.length) {
      messages.value = rows.map((m) => ({
        text: m.content,
        isUser: m.role === 'user',
      }));
      await bottom();
    }
    historyLoaded.value = true;
  } catch {
    historyLoaded.value = true;
  }
}

async function syncOnActivate() {
  guestKey.value = getAiGuestKey();
  if (!sessionId.value) sessionId.value = getAiSessionId();
  if (getToken()) {
    await mergeAiSessionAfterLogin();
    const sid = getAiSessionId();
    if (sid) sessionId.value = sid;
  }
  await loadProfile();
  // 本地已有用户消息则保留（切 Tab 不丢）；仅在空对话时从服务端拉历史
  const hasLocalChat = messages.value.some((m) => m.isUser);
  if (!hasLocalChat || !historyLoaded.value) {
    await loadHistory();
  }
}

async function send() {
  const text = draft.value.trim();
  if (!text || sending.value) return;
  if (text.length > 2000) {
    messages.value.push({ text: '消息过长，请控制在 2000 字以内。', isUser: false });
    return;
  }
  messages.value.push({ text, isUser: true });
  draft.value = '';
  sending.value = true;
  await bottom();
  abortCtrl?.abort();
  abortCtrl = new AbortController();
  const timer = setTimeout(() => abortCtrl?.abort(), 60_000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: text,
        sessionId: sessionId.value || undefined,
        guestKey: guestKey.value,
        context: {
          city: location.value.city || '上海',
        },
      }),
      signal: abortCtrl.signal,
    });
    if (res.status === 429) {
      messages.value.push({ text: '发送太频繁，请稍后再试。', isUser: false });
      return;
    }
    const json = res.ok ? await res.json() : null;
    const reply = json?.data?.reply;
    const sid = json?.data?.sessionId as string | undefined;
    if (sid) {
      sessionId.value = sid;
      setAiSessionId(sid);
    }
    const fallback = Boolean(json?.data?.fallback);
    agentOffline.value = !res.ok || fallback;
    messages.value.push({
      text:
        reply ??
        (res.status === 502
          ? '智能客服网关未就绪（agent-gateway:3006）。请在仓库根目录执行 pnpm agent:ensure。'
          : '暂时连不上服务，可先去「找店」浏览。'),
      isUser: false,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    messages.value.push({
      text: aborted ? '请求超时，请稍后再试。' : '网络异常，请稍后再试。',
      isUser: false,
    });
    agentOffline.value = true;
  } finally {
    clearTimeout(timer);
    sending.value = false;
    await bottom();
  }
}

function ask(s: string) {
  draft.value = s;
  void send();
}

watch(
  () => props.active,
  (on) => {
    if (on) void syncOnActivate();
  },
);

onMounted(() => {
  void probeAgent();
  void syncOnActivate();
});
onUnmounted(() => {
  abortCtrl?.abort();
});
</script>

<style scoped>
.chat {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100dvh;
  padding-bottom: 0;
  overflow: hidden;
}
.nav {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(12px + env(safe-area-inset-top)) 16px 12px;
  background: linear-gradient(180deg, #e1f4f1 0%, rgba(247, 248, 250, 0.96) 100%);
  border-bottom: 1px solid rgba(26, 158, 142, 0.1);
}
.nav-deco .stitch {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
  height: 0;
  border-bottom: 1px dashed rgba(26, 158, 142, 0.18);
}
.nav-left {
  display: flex;
  gap: 10px;
  align-items: center;
}
.brand-av {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(145deg, #1a9e8e, #14756b);
  box-shadow: 0 6px 14px rgba(26, 158, 142, 0.25);
  position: relative;
}
.brand-av::after {
  content: '';
  position: absolute;
  inset: 10px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%23fff' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%23fff' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%23fff' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%23fff' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%23fff' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.nav h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 750;
}
.nav p {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--color-sub);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-brand-dark);
  background: var(--color-brand-light);
  padding: 5px 10px;
  border-radius: 999px;
}
.live.off {
  color: #8a6a28;
  background: var(--color-gold-bg);
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.notice {
  margin: 8px 16px 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--color-warn-light, #fff6e8);
  color: #8a6a28;
  font-size: 11px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  line-height: 1.4;
}
.notice-ico {
  width: 14px;
  height: 14px;
  margin-top: 1px;
  border-radius: 50%;
  background: #ffb84d;
  flex-shrink: 0;
}
.msgs {
  flex: 1;
  overflow: auto;
  padding: 12px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.welcome {
  text-align: center;
  padding: 18px 12px 8px;
  animation: welcome-in 420ms var(--ease-out, ease) both;
}
.welcome-art {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto 10px;
}
.welcome-art .ring {
  position: absolute;
  inset: 0;
  border-radius: 24px;
  border: 1px dashed rgba(26, 158, 142, 0.35);
}
.welcome-art .big-paw {
  position: absolute;
  inset: 14px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.welcome h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 750;
}
.welcome p {
  margin: 8px auto 0;
  max-width: 280px;
  font-size: 13px;
  color: var(--color-sub);
  line-height: 1.45;
}
.caps {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.caps span {
  font-size: 11px;
  font-weight: 650;
  color: var(--color-brand-dark);
  background: var(--color-brand-light);
  padding: 5px 10px;
  border-radius: 999px;
}
.row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.row.me {
  flex-direction: row-reverse;
}
.av {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: var(--color-brand-light);
  flex-shrink: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E");
  background-size: 16px;
  background-repeat: no-repeat;
  background-position: center;
}
.col {
  max-width: 78%;
}
.who {
  display: block;
  font-size: 11px;
  color: var(--color-faint);
  margin-bottom: 3px;
}
.bubble {
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: 14px 14px 14px 4px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: var(--shadow-card);
  white-space: pre-wrap;
  word-break: break-word;
}
.row.me .bubble {
  background: var(--color-brand);
  color: #fff;
  border-color: transparent;
  border-radius: 14px 14px 4px 14px;
}
.typing {
  display: flex;
  gap: 4px;
  padding: 12px 14px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--color-line);
}
.typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ab;
  animation: blink 1s infinite;
}
.typing i:nth-child(2) {
  animation-delay: 0.15s;
}
.typing i:nth-child(3) {
  animation-delay: 0.3s;
}
.dock {
  position: relative;
  padding: 8px 12px calc(10px + var(--tabbar-height) + env(safe-area-inset-bottom, 0px) + 28px);
  background: linear-gradient(180deg, rgba(247, 248, 250, 0), #f7f8fa 28%);
}
.dock-deco .paw,
.dock-deco .bone {
  position: absolute;
  width: 18px;
  height: 18px;
  opacity: 0.12;
  pointer-events: none;
}
.dock-deco .paw {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.dock-deco .tl {
  left: 18px;
  top: 4px;
}
.dock-deco .tr {
  right: 22px;
  top: 8px;
  transform: rotate(20deg);
}
.dock-deco .bone {
  left: 50%;
  top: 2px;
  transform: translateX(-50%);
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 24'%3E%3Cpath fill='%231a9e8e' d='M8 4a4 4 0 014 4v1h24V8a4 4 0 118 0v8a4 4 0 11-8 0v-1H12v1a4 4 0 11-8 0V8a4 4 0 014-4z'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.suggest {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 10px;
  scrollbar-width: none;
}
.suggest::-webkit-scrollbar {
  display: none;
}
.suggest button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 7px 12px;
  background: #fff;
  border: 1px solid rgba(26, 158, 142, 0.18);
  color: var(--color-brand-dark);
  font-size: 12px;
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.chip-paw {
  width: 12px;
  height: 12px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.composer {
  display: flex;
  gap: 8px;
  align-items: center;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: 18px;
  padding: 6px 6px 6px 12px;
  box-shadow: var(--shadow-card);
}
.input-paw {
  width: 16px;
  height: 16px;
  opacity: 0.35;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cellipse fill='%231a9e8e' cx='32' cy='40' rx='14' ry='12'/%3E%3Ccircle fill='%231a9e8e' cx='16' cy='22' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='28' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='40' cy='16' r='7'/%3E%3Ccircle fill='%231a9e8e' cx='50' cy='24' r='6.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
  flex-shrink: 0;
}
.composer input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 14px;
  min-width: 0;
}
.send {
  border: 0;
  border-radius: 14px;
  padding: 0 14px;
  height: 36px;
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
}
.send:disabled {
  opacity: 0.45;
}
@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.35;
  }
  40% {
    opacity: 1;
  }
}
@keyframes welcome-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
