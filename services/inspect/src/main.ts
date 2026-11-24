import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = Number(process.env.INSPECT_PORT ?? 3004);
  await app.listen(port);
  console.log(`[inspect] listening on ${port}`);
}

bootstrap();
