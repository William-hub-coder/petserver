<template>
  <div class="page compose">
    <header class="nav">
      <button type="button" @click="$emit('close')">取消</button>
      <h1>发布动态</h1>
      <button type="button" class="pub" :disabled="busy" @click="submit">发布</button>
    </header>

    <div class="body">
      <input v-model="title" class="title" maxlength="60" placeholder="标题（必填）" />
      <textarea v-model="content" class="content" maxlength="2000" rows="5" placeholder="分享养宠经验、日常或求助…" />

      <div class="row">
        <label>分类</label>
        <div class="chips">
          <button
            v-for="c in cats"
            :key="c.key"
            type="button"
            :class="{ on: category === c.key }"
            @click="category = c.key"
          >
            {{ c.label }}
          </button>
        </div>
      </div>

      <div class="row">
        <label>媒体</label>
        <div class="chips">
          <button type="button" :class="{ on: mediaType === 'image' }" @click="setType('image')">图片</button>
          <button type="button" :class="{ on: mediaType === 'video' }" @click="setType('video')">视频</button>
          <button type="button" :class="{ on: mediaType === 'text' }" @click="setType('text')">纯文字</button>
        </div>
      </div>

      <div v-if="mediaType !== 'text'" class="media-box">
        <div v-for="(u, i) in mediaUrls" :key="i" class="thumb">
          <img v-if="mediaType === 'image'" :src="u" alt="" />
          <video v-else :src="u" muted />
          <button type="button" class="rm" @click="mediaUrls.splice(i, 1)">×</button>
        </div>
        <label v-if="canAdd" class="add">
          <input
            type="file"
            :accept="mediaType === 'video' ? 'video/*' : 'image/*'"
            :multiple="mediaType === 'image'"
            hidden
            @change="onPick"
          />
          ＋ 添加
        </label>
      </div>
      <p class="tip">本地图片/短视频将转为本地预览数据（演示用）；大文件请压缩后再选。</p>
      <p v-if="err" class="err">{{ err }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { api, getToken } from '../api';

const emit = defineEmits<{ close: []; published: [string]; 'need-login': [] }>();

const cats = [
  { key: 'daily', label: '日常' },
  { key: 'experience', label: '经验' },
  { key: 'help', label: '求助' },
  { key: 'other', label: '其他' },
];

const title = ref('');
const content = ref('');
const category = ref('daily');
const mediaType = ref<'image' | 'video' | 'text'>('image');
const mediaUrls = ref<string[]>([]);
const busy = ref(false);
const err = ref('');

const canAdd = computed(() => {
  if (mediaType.value === 'video') return mediaUrls.value.length < 1;
  return mediaUrls.value.length < 9;
});

function setType(t: 'image' | 'video' | 'text') {
  mediaType.value = t;
  mediaUrls.value = [];
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error(`${file.name} 超过 4MB，请压缩后重试`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

async function onPick(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  if (!files.length) return;
  err.value = '';
  try {
    const urls = await Promise.all(files.map(readFile));
    if (mediaType.value === 'video') {
      mediaUrls.value = urls.slice(0, 1);
    } else {
      mediaUrls.value = [...mediaUrls.value, ...urls].slice(0, 9);
    }
  } catch (e) {
    err.value = e instanceof Error ? e.message : '添加失败';
  }
}

async function submit() {
  if (!getToken()) {
    emit('need-login');
    return;
  }
  err.value = '';
  const t = title.value.trim();
  if (!t) {
    err.value = '请填写标题';
    return;
  }
  if (mediaType.value !== 'text' && !mediaUrls.value.length) {
    err.value = '请添加图片或视频';
    return;
  }
  busy.value = true;
  try {
    const post = await api.createCommunityPost({
      title: t,
      content: content.value.trim(),
      category: category.value,
      mediaType: mediaType.value,
      mediaUrls: mediaUrls.value,
      coverUrl: mediaUrls.value[0],
    });
    emit('published', post.id);
  } catch (e) {
    err.value = e instanceof Error ? e.message : '发布失败';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.compose {
  position: absolute;
  inset: 0;
  z-index: 62;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.nav {
  display: grid;
  grid-template-columns: 64px 1fr 64px;
  align-items: center;
  padding: calc(10px + env(safe-area-inset-top)) 8px 10px;
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
  font-size: 15px;
  color: #666;
  min-height: 36px;
}
.pub {
  color: var(--color-brand, #1a9e8e) !important;
  font-weight: 750;
}
.body {
  padding: 14px 16px;
  overflow: auto;
}
.title {
  width: 100%;
  border: 0;
  border-bottom: 1px solid #eee;
  font-size: 18px;
  font-weight: 750;
  padding: 8px 0 12px;
  margin-bottom: 10px;
  outline: none;
}
.content {
  width: 100%;
  border: 0;
  resize: vertical;
  font-size: 15px;
  line-height: 1.5;
  outline: none;
  min-height: 120px;
  margin-bottom: 16px;
}
.row {
  margin-bottom: 14px;
}
.row label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #999;
  margin-bottom: 8px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chips button {
  border: 0;
  border-radius: 999px;
  padding: 7px 12px;
  background: #f3f4f6;
  font-size: 13px;
  font-weight: 650;
  color: #555;
}
.chips button.on {
  background: #e8f7f3;
  color: #14756b;
}
.media-box {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.thumb {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 12px;
  overflow: hidden;
  background: #f0f0f0;
}
.thumb img,
.thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rm {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  line-height: 1;
}
.add {
  width: 88px;
  height: 88px;
  border-radius: 12px;
  border: 1.5px dashed #ccc;
  display: grid;
  place-items: center;
  color: #888;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}
.tip {
  font-size: 12px;
  color: #aaa;
  margin: 0 0 8px;
}
.err {
  color: #e85d4c;
  font-size: 13px;
}
</style>
