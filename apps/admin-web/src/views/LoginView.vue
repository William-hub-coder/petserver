<template>
  <div class="login">
    <section class="card">
      <p class="brand">宠伴 · 运营后台</p>
      <h1>管理员登录</h1>
      <p class="sub">审核认证商家 · 与 App 附近实景实时联动</p>
      <label>
        手机号
        <input v-model="phone" maxlength="11" placeholder="13700000001" />
      </label>
      <label>
        验证码
        <div class="row">
          <input v-model="code" placeholder="开发环境 123456" />
          <button type="button" class="ghost" :disabled="sending" @click="send">
            {{ sending ? '发送中' : '获取验证码' }}
          </button>
        </div>
      </label>
      <p v-if="tip" class="tip">{{ tip }}</p>
      <button type="button" class="primary" :disabled="loading" @click="login">
        {{ loading ? '登录中…' : '进入后台' }}
      </button>
      <p class="hint">演示账号 13700000001 / 验证码 123456（role=admin）</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, saveAuth } from '../api';

const router = useRouter();
const phone = ref('13700000001');
const code = ref('123456');
const tip = ref('');
const loading = ref(false);
const sending = ref(false);

async function send() {
  tip.value = '';
  sending.value = true;
  try {
    await api.sendSms(phone.value.trim());
    tip.value = '验证码已发送（开发环境固定 123456）';
  } catch (e) {
    tip.value = e instanceof Error ? e.message : '发送失败';
  } finally {
    sending.value = false;
  }
}

async function login() {
  tip.value = '';
  loading.value = true;
  try {
    const data = await api.login(phone.value.trim(), code.value.trim());
    if (data.user.role !== 'admin') {
      tip.value = '该账号不是运营管理员，请使用 admin 角色账号';
      return;
    }
    saveAuth(data);
    await router.replace('/merchants');
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
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(80% 60% at 20% 0%, rgba(26, 158, 142, 0.16), transparent 50%),
    #f4f7f6;
}
.card {
  width: min(420px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow: 0 16px 40px rgba(24, 40, 36, 0.08);
  display: grid;
  gap: 12px;
}
.brand {
  margin: 0;
  font-size: 12px;
  font-weight: 750;
  color: #14756b;
  letter-spacing: 0.04em;
}
h1 {
  margin: 0;
  font-size: 24px;
}
.sub {
  margin: 0 0 8px;
  color: #7a8b88;
  font-size: 13px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 650;
  color: #5a6b68;
}
input {
  height: 44px;
  border: 1px solid #e5ebe9;
  border-radius: 12px;
  padding: 0 12px;
  font-size: 15px;
  background: #f7f8fa;
}
.row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.primary,
.ghost {
  border: 0;
  border-radius: 999px;
  min-height: 44px;
  padding: 0 16px;
  font-weight: 700;
  cursor: pointer;
}
.primary {
  background: linear-gradient(135deg, #1a9e8e, #159687);
  color: #fff;
  margin-top: 4px;
}
.ghost {
  background: #e8f7f3;
  color: #14756b;
}
.tip {
  margin: 0;
  color: #e85d4c;
  font-size: 13px;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: #9aa8a5;
}
</style>
