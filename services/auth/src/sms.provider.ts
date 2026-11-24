import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsProvider {
  private readonly codes = new Map<string, { code: string; expiresAt: number }>();

  async send(phone: string): Promise<{ sent: boolean; code?: string }> {
    const code = process.env.DEV_SMS_CODE || '123456';
    const ttlMs = 5 * 60 * 1000;
    this.codes.set(phone, { code, expiresAt: Date.now() + ttlMs });
    // Dev: print code for local login
    // eslint-disable-next-line no-console
    console.log(`[auth][sms] phone=${phone} code=${code}`);
    return { sent: true, code: process.env.NODE_ENV === 'production' ? undefined : code };
  }

  verify(phone: string, code: string): boolean {
    const expected = process.env.DEV_SMS_CODE || '123456';
    if (code === expected) return true;
    const entry = this.codes.get(phone);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.codes.delete(phone);
      return false;
    }
    return entry.code === code;
  }
}
