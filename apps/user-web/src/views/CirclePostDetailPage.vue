<template>
  <div class="page detail">
    <header class="nav">
      <button type="button" @click="$emit('close')">‹</button>
      <h1>动态详情</h1>
      <span />
    </header>

    <p v-if="loading" class="hint">加载中…</p>
    <p v-else-if="err" class="err">{{ err }}</p>
    <template v-else-if="post">
      <div class="media">
        <template v-if="post.mediaType === 'video' && post.mediaUrls[0]">
          <video class="vid" :src="post.mediaUrls[0]" controls playsinline />
        </template>
        <template v-else>
          <img
            v-for="(u, i) in post.mediaUrls.length ? post.mediaUrls : [post.coverUrl]"
            :key="i"
            class="img"
            :src="u || ''"
            alt=""
          />
        </template>
      </div>

      <section class="main">
        <h2>{{ post.title }}</h2>
        <p class="text">{{ post.content || '（无正文）' }}</p>
        <div class="author-row">
          <span class="avatar">{{ post.author.nickname.slice(0, 1) }}</span>
          <div>
            <strong>{{ post.author.nickname }}</strong>
            <small>{{ formatTime(post.createdAt) }} · {{ catLabel(post.category) }}</small>
          </div>
          <button type="button" class="like" :class="{ on: post.liked }" @click="toggleLike">
            {{ post.liked ? '已赞' : '点赞' }} {{ post.likeCount }}
          </button>
        </div>
      </section>

      <section class="comments">
        <h3>评论 {{ comments.length }}</h3>
        <p v-if="!comments.length" class="hint sm">还没有评论，来抢沙发</p>
        <article v-for="c in comments" :key="c.id" class="citem">
          <strong>{{ c.author.nickname }}</strong>
          <p>{{ c.content }}</p>
          <small>{{ formatTime(c.createdAt) }}</small>
        </article>
      </section>

      <footer class="bar">
        <input v-model="draft" class="input" maxlength="500" placeholder="说点什么…" @keydown.enter.prevent="send" />
        <button type="button" class="send" :disabled="sending" @click="send">发送</button>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, getToken, type CommunityComment, type CommunityPost } from '../api';

const props = defineProps<{ postId: string }>();
const emit = defineEmits<{ close: []; 'need-login': [] }>();

const post = ref<CommunityPost | null>(null);
const comments = ref<CommunityComment[]>([]);
const loading = ref(true);
const err = ref('');
const draft = ref('');
const sending = ref(false);

function catLabel(c: string) {
  const map: Record<string, string> = {
    experience: '经验',
    daily: '日常',
    help: '求助',
    other: '其他',
  };
  return map[c] || c;
}

function formatTime(iso: string) {
  return iso.replace('T', ' ').slice(0, 16);
}

async function load() {
  loading.value = true;
  err.value = '';
  try {
    post.value = await api.communityPost(props.postId);
    const c = await api.communityComments(props.postId);
    comments.value = c.items;
  } catch (e) {
    err.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

async function toggleLike() {
  if (!getToken()) {
    emit('need-login');
    return;
  }
  if (!post.value) return;
  try {
    const r = await api.likeCommunityPost(post.value.id);
    post.value = { ...post.value, liked: r.liked, likeCount: r.likeCount };
  } catch (e) {
    err.value = e instanceof Error ? e.message : '操作失败';
  }
}

async function send() {
  if (!getToken()) {
    emit('need-login');
    return;
  }
  const text = draft.value.trim();
  if (!text || !post.value) return;
  sending.value = true;
  try {
    const c = await api.addCommunityComment(post.value.id, text);
    comments.value = [...comments.value, c];
    post.value = { ...post.value, commentCount: post.value.commentCount + 1 };
    draft.value = '';
  } catch (e) {
    err.value = e instanceof Error ? e.message : '发送失败';
  } finally {
    sending.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.detail {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding-bottom: 72px;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: calc(10px + env(safe-area-inset-top)) 8px 10px;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid #eee;
}
.nav h1 {
  margin: 0;
  text-align: center;
  font-size: 16px;
  font-weight: 750;
}
.nav button {
  border: 0;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  color: #222;
}
.media {
  background: #111;
}
.img,
.vid {
  display: block;
  width: 100%;
  max-height: 52vh;
  object-fit: contain;
  background: #111;
}
.main {
  padding: 16px;
}
.main h2 {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 750;
  line-height: 1.3;
}
.text {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}
.author-row {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e8f7f3;
  color: #14756b;
  font-weight: 750;
  flex-shrink: 0;
}
.author-row strong {
  display: block;
  font-size: 14px;
}
.author-row small {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #999;
}
.like {
  margin-left: auto;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: #f3f4f6;
  font-size: 12px;
  font-weight: 700;
  color: #555;
}
.like.on {
  background: #ffe8d6;
  color: #c25a20;
}
.comments {
  padding: 0 16px 24px;
  border-top: 8px solid #f5f6f8;
}
.comments h3 {
  margin: 14px 0 10px;
  font-size: 15px;
  font-weight: 750;
}
.citem {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.citem strong {
  font-size: 13px;
  color: #14756b;
}
.citem p {
  margin: 4px 0;
  font-size: 14px;
  color: #333;
  line-height: 1.45;
}
.citem small {
  font-size: 11px;
  color: #aaa;
}
.hint,
.err {
  text-align: center;
  padding: 24px;
  color: #999;
}
.hint.sm {
  padding: 8px 0 16px;
  font-size: 13px;
}
.err {
  color: #e85d4c;
}
.bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: min(100%, var(--page-max-width, 430px));
  display: flex;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #eee;
  z-index: 3;
}
.input {
  flex: 1;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 0 14px;
  background: #f7f8fa;
  font-size: 14px;
}
.send {
  border: 0;
  border-radius: 999px;
  padding: 0 16px;
  background: var(--color-brand, #1a9e8e);
  color: #fff;
  font-weight: 700;
}
</style>
