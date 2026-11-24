import { Body, Controller, Post } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('sms/send')
  async sendSms(@Body() body: { phone?: string }) {
    const data = await this.auth.sendSms(body.phone);
    return { code: ErrorCode.OK, data };
  }

  @Post('login')
  async login(@Body() body: { phone?: string; code?: string }) {
    const data = await this.auth.login(body.phone, body.code);
    return { code: ErrorCode.OK, data };
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken?: string }) {
    const data = await this.auth.refresh(body.refreshToken);
    return { code: ErrorCode.OK, data };
  }

  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }) {
    const data = await this.auth.logout(body.refreshToken);
    return { code: ErrorCode.OK, data };
  }
}
