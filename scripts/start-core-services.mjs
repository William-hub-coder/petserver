/**
 * 编译并启动核心 Nest 服务（Windows 友好）。
 *
 * 用法（仓库根目录）：
 *   node scripts/start-core-services.mjs
 *   node scripts/start-core-services.mjs --build-only
 *   pnpm services:start
 *
 * 说明：
 * - 使用 `tsc -p tsconfig.build.json --incremental false`，避免 nest incremental 空 dist
 * - 子进程继承根目录 `.env`（通过 dotenv 由各服务自行加载）
 * - 不启动 orchestrator（用 pnpm agent:ensure）
 */
import { spawn, execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const buildOnly = process.argv.includes('--build-only');

const services = [
  { name: 'auth', dir: 'services/auth', port: 3001 },
  { name: 'user', dir: 'services/user', port: 3002 },
  { name: 'merchant', dir: 'services/merchant', port: 3003 },
  { name: 'inspect', dir: 'services/inspect', port: 3004 },
  { name: 'message', dir: 'services/message', port: 3005 },
  { name: 'gateway', dir: 'services/gateway', port: 3000 },
  { name: 'agent-gateway', dir: 'services/agent-gateway', port: 3006 },
];

function run(cmd, cwd) {
  console.log(`> ${cmd}  (${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env, shell: true });
}

// 先共享包
run('pnpm --filter @petpal/shared build', root);
run('pnpm --filter @petpal/db generate', root);
run('pnpm --filter @petpal/db build', root);

for (const svc of services) {
  const cwd = join(root, svc.dir);
  const tsbuild = join(cwd, 'tsconfig.tsbuildinfo');
  if (existsSync(tsbuild)) rmSync(tsbuild, { force: true });
  run('pnpm exec tsc -p tsconfig.build.json --incremental false', cwd);
  if (!existsSync(join(cwd, 'dist/main.js'))) {
    console.error(`[fail] ${svc.name}: dist/main.js missing`);
    process.exit(1);
  }
  console.log(`[ok] built ${svc.name}`);
}

if (buildOnly) {
  console.log('Build-only done.');
  process.exit(0);
}

const children = [];
for (const svc of services) {
  const cwd = join(root, svc.dir);
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'inherit',
    detached: false,
  });
  children.push(child);
  console.log(`[start] ${svc.name} pid=${child.pid} :${svc.port}`);
}

function shutdown() {
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('\nCore services starting. Ctrl+C to stop. Then: pnpm agent:ensure && pnpm --filter @petpal/user-web dev\n');
