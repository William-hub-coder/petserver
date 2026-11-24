import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HealthController } from './health.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsProvider } from './sms.provider';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'petpal-dev-jwt-secret-change-me',
    }),
  ],
  controllers: [HealthController, AuthController],
  providers: [AuthService, SmsProvider],
})
export class AppModule {}
