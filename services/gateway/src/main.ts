import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

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

  const corsRaw = process.env.GATEWAY_CORS_ORIGIN?.trim();
  if (corsRaw) {
    app.enableCors({
      origin: corsRaw.split(',').map((s) => s.trim()).filter(Boolean),
      credentials: true,
    });
  } else {
    // 本地开发：放行常见前端端口；生产务必配置 GATEWAY_CORS_ORIGIN
    const isProd = process.env.NODE_ENV === 'production';
    app.enableCors({
      origin: isProd
        ? false
        : [
            'http://localhost:5175',
            'http://127.0.0.1:5175',
            // 商家后台 / 运营后台（固定端口，避免与 Vite 自动跳端口冲突）
            'http://localhost:5180',
            'http://127.0.0.1:5180',
            'http://localhost:5181',
            'http://127.0.0.1:5181',
            // 兼容旧端口
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
          ],
      credentials: true,
    });
  }

  const port = Number(process.env.GATEWAY_PORT ?? 3000);
  await app.listen(port);
  console.log(`[gateway] listening on ${port}`);
}

bootstrap();
