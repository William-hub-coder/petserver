import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@petpal/db';
import { SmsProvider } from './sms.provider';

/** 短信发送限流：同号每分钟最多 N 次（防刷） */
const smsHits = new Map<string, number[]>();

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly sms: SmsProvider,
  ) {}

  async sendSms(phone?: string) {
    if (!phone || !/^1\d{10}$/.test(phone)) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '手机号格式不正确' });
    }
    const limit = Math.max(1, Number(process.env.AUTH_SMS_RATE_LIMIT ?? 5));
    const now = Date.now();
    const prev = (smsHits.get(phone) || []).filter((t) => now - t < 60_000);
    if (prev.length >= limit) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: '该手机号发送过于频繁，请稍后再试' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    prev.push(now);
    smsHits.set(phone, prev);
    const result = await this.sms.send(phone);
    return { phone, ...result };
  }

  async login(phone?: string, code?: string) {
    if (!phone || !code) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少 phone 或 code' });
    }
    if (!/^1\d{10}$/.test(phone)) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '手机号格式不正确' });
    }
    if (!this.sms.verify(phone, code)) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '验证码错误或已过期' });
    }

    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, nickname: `用户${phone.slice(-4)}` },
    });

    return this.issueTokens(user);
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少 refreshToken' });
    }
    const tokenHash = this.hash(refreshToken);
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'refreshToken 无效' });
    }
    await prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(row.user);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return { ok: true };
    const tokenHash = this.hash(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async issueTokens(user: { id: string; phone: string; nickname: string; role: string }) {
    const expiresIn = process.env.JWT_EXPIRES_IN || '2h';
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, phone: user.phone, role: user.role },
      { expiresIn: expiresIn as `${number}h` | `${number}d` },
    );
    const refreshToken = randomBytes(32).toString('hex');
    const refreshDays = Number(String(process.env.REFRESH_EXPIRES_IN || '30d').replace('d', '')) || 30;
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
      },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        role: user.role,
      },
    };
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
