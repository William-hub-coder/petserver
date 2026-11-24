import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

/** 与 gateway 一致：优先进程 cwd/.env，再回退仓库根 .env */
for (const p of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  if (existsSync(p)) {
    config({ path: p });
    break;
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigin = process.env.AGENT_CORS_ORIGIN?.trim();
  if (corsOrigin) {
    app.enableCors({
      origin: corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    });
  } else {
    // 本地开发：允许前端直连调试；生产请设 AGENT_CORS_ORIGIN
    app.enableCors({ origin: true, credentials: true });
  }

  const port = Number(process.env.AGENT_GATEWAY_PORT ?? 3006);
  await app.listen(port);
  const orch = process.env.ORCHESTRATOR_URL ?? 'http://localhost:8000';
  console.log(`[agent-gateway] listening on ${port} → orchestrator ${orch}`);
}

bootstrap();
