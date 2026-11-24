<template>
  <div class="login">
    <div class="brand">
      <div class="logo">宠</div>
      <h1>宠伴商家端</h1>
      <p>严选入驻 · 透明信用 · 高效接单</p>
    </div>
    <section class="card form">
      <h2 class="font-h3">手机号登录</h2>
      <p class="font-caption" style="margin: 6px 0 14px">演示店长账号 13900000001，验证码 123456</p>
      <input v-model="phone" class="input" placeholder="请输入手机号" maxlength="11" />
      <div class="code-row">
        <input v-model="code" class="input" placeholder="验证码" />
        <button type="button" class="code-btn" @click="send">获取验证码</button>
      </div>
      <p v-if="tip" class="tip">{{ tip }}</p>
      <button class="btn-primary" style="width: 100%; margin-top: 8px" type="button" :disabled="loading" @click="go">
        进入工作台
      </button>
      <p class="font-small agree">登录即同意《商家服务协议》与《隐私政策》</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, saveAuth } from '../api';

const router = useRouter();
const phone = ref('13900000001');
const code = ref('123456');
const tip = ref('');
const loading = ref(false);

async function send() {
  tip.value = '';
  try {
    await api.sendSms(phone.value);
    tip.value = '验证码已发送（开发环境 123456）';
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '发送失败';
  }
}

async function go() {
  loading.value = true;
  tip.value = '';
  try {
    const data = await api.login(phone.value, code.value);
    saveAuth(data);
    router.push('/dashboard');
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  background: linear-gradient(160deg, #1bb39f 0%, #1a9e8e 45%, #14756b 100%);
  padding: 56px 16px 32px;
}
.brand { text-align: center; margin-bottom: 28px; color: #fff; }
.logo {
  width: 76px; height: 76px; margin: 0 auto; border-radius: 22px;
  background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.28);
  color: #fff; display: grid; place-items: center; font-size: 34px; font-weight: 700;
}
.brand h1 { margin: 16px 0 6px; font-size: 24px; }
.brand p { margin: 0; opacity: .88; font-size: 13px; }
.form { border-radius: 20px; }
.code-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin: 12px 0; }
.code-btn {
  border: 0; border-radius: 12px; padding: 0 12px; background: var(--color-primary-light);
  color: var(--color-primary-dark); font-size: 13px; font-weight: 600;
}
.tip { color: #b33; font-size: 13px; }
.agree { margin-top: 12px; text-align: center; color: #688; }
</style>
