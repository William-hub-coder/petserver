/**
 * 确保 Agent 链路可用：orchestrator:8000 + agent-gateway:3006
 *
 * 用法：
 *   pnpm agent:ensure           # 探测；缺谁就尝试拉起
 *   pnpm agent:check            # 仅探测，不启动
 *
 * 退出码：0 = 链路 OK；1 = 仍不可用
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ORCH = process.env.ORCHESTRATOR_URL ?? 'http://localhost:8000';
const AGW = process.env.AGENT_GATEWAY_URL ?? 'http://localhost:3006';
const checkOnly = process.argv.includes('--check');
const rootDir = process.cwd();

async function probe(url, label) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const ok = res.ok;
    console.log(`  ${ok ? 'OK' : 'FAIL'} ${label} ${url} → ${res.status}`);
    return ok;
  } catch (e) {
    console.log(`  FAIL ${label} ${url} → ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

function startDetached(cmd, args) {
  const child = spawn(cmd, args, {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
    shell: true,
    env: process.env,
  });
  child.unref();
  return child.pid;
}

async function waitUntil(fn, { tries = 25, delayMs = 1000, label = '' } = {}) {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return true;
    console.log(`  ...waiting ${label} (${i + 1}/${tries})`);
    await sleep(delayMs);
  }
  return false;
}

async function main() {
  console.log('[ensure-agent-stack] probing Agent chain');
  let orchOk = await probe(`${ORCH}/health`, 'orchestrator');
  let agwOk = await probe(`${AGW}/health`, 'agent-gateway');

  if (checkOnly) {
    if (agwOk) await probe(`${AGW}/health/deep`, 'agent-gateway deep');
    process.exit(orchOk && agwOk ? 0 : 1);
  }

  if (!orchOk) {
    console.log('[ensure-agent-stack] starting orchestrator...');
    startDetached('pnpm', ['--dir', 'agents/orchestrator', 'run', 'dev']);
    orchOk = await waitUntil(() => probe(`${ORCH}/health`, 'orchestrator'), {
      label: 'orchestrator:8000',
    });
  }

  if (!agwOk) {
    console.log('[ensure-agent-stack] starting agent-gateway (stable build)...');
    // Windows 上 nest build 偶发空 dist，改用 tsc + node 更稳
    startDetached('pnpm', ['--filter', '@petpal/agent-gateway', 'run', 'start:stable']);
    agwOk = await waitUntil(() => probe(`${AGW}/health`, 'agent-gateway'), {
      label: 'agent-gateway:3006',
      tries: 30,
    });
  }

  let deepOk = false;
  if (agwOk) {
    try {
      const res = await fetch(`${AGW}/health/deep`, { signal: AbortSignal.timeout(5000) });
      const body = res.ok ? await res.json() : null;
      deepOk = Boolean(body?.orchestrator?.ok);
      console.log(
        `  ${deepOk ? 'OK' : 'FAIL'} agent-gateway → orchestrator (deep) status=${body?.status}`,
      );
    } catch (e) {
      console.log(`  FAIL deep health → ${e instanceof Error ? e.message : e}`);
    }
  }

  if (agwOk) {
    try {
      const res = await fetch(`${AGW}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'ping' }),
        signal: AbortSignal.timeout(60_000),
      });
      console.log(`  ${res.ok ? 'OK' : 'FAIL'} POST /agent/chat → ${res.status}`);
    } catch (e) {
      console.log(`  FAIL POST /agent/chat → ${e instanceof Error ? e.message : e}`);
    }
  }

  if (orchOk && agwOk && deepOk) {
    console.log('[ensure-agent-stack] OK — chain ready');
    process.exit(0);
  }
  console.error('[ensure-agent-stack] FAIL — check DEEPSEEK_API_KEY and ports 8000/3006');
  process.exit(1);
}

main();
