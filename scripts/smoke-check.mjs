/**
 * PetPal MVP 冒烟脚本（需网关及核心服务已启动）。
 *
 * ```bash
 * node scripts/smoke-check.mjs
 * # 或仓库根目录：pnpm smoke
 * ```
 *
 * ## 覆盖路径
 * 1. gateway /health
 * 2. 商户列表（DB 有种子数据）
 * 3. 用户 / 店长登录（验证码 123456）
 * 4. users/me 鉴权（无 token 401，有 token 成功）
 * 5. 到店预约 → 商家核销 → 评价（channel=onsite 主路径）
 * 6. /agent/chat（需 agent-gateway:3006；orchestrator 可选，失败时也可能 fallback 通过）
 * 7. orchestrator /health（可选，连不上不记失败）
 *
 * ## 未覆盖（可后续加）
 * - service-catalog / 线上问诊 complete
 * - home_visit 带 address 下单
 * - 商城下单
 *
 * 环境变量：GATEWAY_URL、ORCHESTRATOR_URL
 */
const gateway = process.env.GATEWAY_URL || 'http://localhost:3000';
const orch = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';

async function get(url, token) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

async function post(url, data, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

const checks = [];

async function check(name, fn) {
  try {
    const result = await fn();
    checks.push({ name, pass: !!result.pass, detail: result.detail });
  } catch (e) {
    checks.push({ name, pass: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

await check('gateway /health', async () => {
  const r = await get(`${gateway}/health`);
  return { pass: r.ok && r.body?.status === 'ok', detail: r.body };
});

await check('merchants list from DB', async () => {
  const r = await get(`${gateway}/merchants`);
  return {
    pass: r.ok && Array.isArray(r.body?.data) && r.body.data.length >= 1,
    detail: r.body?.data?.length,
  };
});

await check('pet-listings adopt+sale', async () => {
  const adopt = await get(`${gateway}/pet-listings?channel=adopt`);
  const sale = await get(`${gateway}/pet-listings?channel=sale`);
  const aOk = adopt.ok && Array.isArray(adopt.body?.data);
  const sOk = sale.ok && Array.isArray(sale.body?.data);
  return {
    pass: aOk && sOk && (adopt.body.data.length > 0 || sale.body.data.length > 0),
    detail: { adopt: adopt.body?.data?.length, sale: sale.body?.data?.length },
  };
});

await check('service-catalog online_consult', async () => {
  const r = await get(`${gateway}/service-catalog?kind=online_consult`);
  return {
    pass: r.ok && Array.isArray(r.body?.data) && r.body.data.length >= 1,
    detail: r.body?.data?.length,
  };
});

let userToken = '';
let merchantToken = '';
let bookingId = '';
let verifyCode = '';

// 用 13800000002 避免与手动演示账号订单互相干扰
await check('auth login user', async () => {
  await post(`${gateway}/auth/sms/send`, { phone: '13800000002' });
  const r = await post(`${gateway}/auth/login`, { phone: '13800000002', code: '123456' });
  userToken = r.body?.data?.accessToken || '';
  return { pass: !!userToken, detail: r.body?.data?.user };
});

await check('auth login merchant', async () => {
  const r = await post(`${gateway}/auth/login`, { phone: '13900000001', code: '123456' });
  merchantToken = r.body?.data?.accessToken || '';
  return { pass: !!merchantToken, detail: r.body?.data?.user?.role };
});

await check('users/me protected', async () => {
  const denied = await get(`${gateway}/users/me`);
  const ok = await get(`${gateway}/users/me`, userToken);
  return {
    pass: denied.status === 401 && ok.ok && !!ok.body?.data?.id,
    detail: { denied: denied.status, me: ok.body?.data?.phone },
  };
});

// 取 m1 第一个服务（一般为到店 onsite）；若种子顺序变化导致取到问诊项，核销仍可能成功但语义不同
await check('booking create → verify → review', async () => {
  const detail = await get(`${gateway}/merchants/m1`);
  const serviceId = detail.body?.data?.services?.[0]?.id;
  if (!serviceId) return { pass: false, detail: 'no service on m1' };

  const day = new Date();
  day.setDate(day.getDate() + 1);
  const date = day.toISOString().slice(0, 10);
  const created = await post(
    `${gateway}/bookings`,
    {
      merchantId: 'm1',
      serviceId,
      bookingAt: `${date}T10:00:00+08:00`,
    },
    userToken,
  );
  bookingId = created.body?.data?.id || '';
  verifyCode = created.body?.data?.verifyCode || '';
  if (!bookingId) return { pass: false, detail: created.body };

  const qr = await get(`${gateway}/bookings/${bookingId}/qrcode`, userToken);
  verifyCode = qr.body?.data?.verifyCode || verifyCode;

  const verified = await post(`${gateway}/bookings/verify`, { code: verifyCode }, merchantToken);
  if (!verified.ok) return { pass: false, detail: verified.body };

  const reviewed = await post(
    `${gateway}/reviews`,
    { bookingId, rating: 5, content: 'smoke test review' },
    userToken,
  );
  return {
    pass: reviewed.ok && reviewed.body?.data?.rating === 5,
    detail: { bookingId, verifyCode, reviewId: reviewed.body?.data?.id },
  };
});

// 若仅起了 gateway 而未起 agent-gateway:3006，本项会 FAIL（502）
await check('agent chat (LLM or fallback)', async () => {
  const r = await post(`${gateway}/agent/chat`, { message: '附近有宠物医院吗' });
  const data = r.body?.data;
  return {
    pass: r.ok && data?.aiGenerated === true && typeof data?.reply === 'string' && data.reply.length > 0,
    detail: { routedTo: data?.routedTo, fallback: data?.fallback, reply: data?.reply?.slice(0, 80) },
  };
});

await check('orchestrator /health (optional)', async () => {
  try {
    const r = await get(`${orch}/health`);
    return { pass: r.ok && r.body?.status === 'ok', detail: r.body };
  } catch (e) {
    // orchestrator 可选：连不上不阻断整体（agent-gateway 有降级）
    return { pass: true, detail: `skipped: ${e instanceof Error ? e.message : e}` };
  }
});

let failed = 0;
for (const c of checks) {
  const mark = c.pass ? 'PASS' : 'FAIL';
  if (!c.pass) failed += 1;
  console.log(`[${mark}] ${c.name}`);
  if (!c.pass) console.log('   ', c.detail);
}
console.log(failed === 0 ? '\nAll smoke checks passed.' : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
