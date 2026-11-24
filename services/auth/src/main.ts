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
  app.enableCors();
  const port = Number(process.env.AUTH_PORT ?? 3001);
  await app.listen(port);
  console.log(`[auth] listening on ${port}`);
}

bootstrap();
