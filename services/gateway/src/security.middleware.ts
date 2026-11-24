import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * 网关入口安全中间件（在鉴权之前）：
 * - 剥离客户端伪造的内部身份头
 * - 注入 / 透传 x-request-id
 * - 基础安全响应头
 * - 简易滑动窗口限流（短信 / 登录 / 全站）
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();

function clientKey(req: Request) {
  const xf = req.headers['x-forwarded-for'];
  const ip = (typeof xf === 'string' ? xf.split(',')[0] : '') || req.socket.remoteAddress || 'unknown';
  return ip.trim();
}

function take(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

/** 偶发清理，防止 Map 无限涨 */
let lastSweep = 0;
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, arr] of buckets) {
    const next = arr.filter((t) => now - t < 120_000);
    if (next.length) buckets.set(k, next);
    else buckets.delete(k);
  }
}

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 禁止客户端伪造下游身份
    delete req.headers['x-user-id'];
    delete req.headers['x-user-role'];

    const rid =
      (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id']) ||
      randomUUID();
    req.headers['x-request-id'] = rid;
    res.setHeader('X-Request-Id', rid);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-store');

    sweep();
    const ip = clientKey(req);
    const path = (req.originalUrl || req.url).split('?')[0];

    const globalLimit = Number(process.env.GATEWAY_RATE_LIMIT ?? 300);
    if (!take(`g:${ip}`, globalLimit, 60_000)) {
      return res.status(429).json({ code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试' });
    }

    if (req.method === 'POST' && (path === '/auth/sms/send' || path === '/auth/login')) {
      const authLimit = Number(process.env.GATEWAY_AUTH_RATE_LIMIT ?? 20);
      if (!take(`a:${ip}:${path}`, authLimit, 60_000)) {
        return res.status(429).json({ code: 'RATE_LIMITED', message: '认证请求过于频繁，请稍后再试' });
      }
    }

    return next();
  }
}
