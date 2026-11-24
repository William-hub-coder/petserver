import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { AuthMiddleware } from './auth.middleware';
import { SecurityMiddleware } from './security.middleware';

@Module({
  controllers: [HealthController, ProxyController],
  providers: [ProxyService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 先安全剥离伪造头 + 限流，再鉴权注入身份
    consumer.apply(SecurityMiddleware, AuthMiddleware).forRoutes('*');
  }
}
