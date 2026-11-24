import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

/**
 * 网关鉴权中间件。
 *
 * ## 行为
 * 1. `isPublic` 命中 → 允许无 Token；**若带了合法 Bearer，仍注入 x-user-id**
 * 2. 非公开路径要求 `Authorization: Bearer <accessToken>`
 * 3. 运营写接口额外要求 `role === admin`
 * 4. 校验通过后写入 `x-user-id`、`x-user-role`
 */
const PUBLIC_EXACT = new Set(['/health', '/health/deps']);

function isPublic(method: string, path: string): boolean {
  const p = path.split('?')[0];
  if (PUBLIC_EXACT.has(p)) return true;
  if (p.startsWith('/auth/')) return true;

  // 商户公开读：列表/附近/详情/时段；不含 apply、manage、certification
  if (method === 'GET' && (p === '/merchants' || p.startsWith('/merchants/'))) {
    if (p.includes('/timeslots')) return true;
    if (p.includes('/apply') || p.includes('/manage') || p.includes('/certification')) {
      return false;
    }
    return true;
  }

  if (method === 'GET' && p === '/reviews/tags') return true;
  if (method === 'POST' && /^\/reviews\/[^/]+\/helpful$/.test(p)) return true;

  if (method === 'GET' && (p === '/products' || p.startsWith('/products/'))) return true;
  if (method === 'POST' && /^\/product-reviews\/[^/]+\/helpful$/.test(p)) return true;

  if (method === 'GET' && (p === '/service-catalog' || p.startsWith('/service-catalog/'))) {
    return true;
  }

  if (method === 'GET' && (p === '/geo' || p.startsWith('/geo/'))) {
    return true;
  }

  if (method === 'GET' && p.startsWith('/agent/')) return true;
  if (method === 'POST' && p === '/agent/chat') return true;

  // 消息模板可公开读；审核队列/处置必须登录且 admin
  if (method === 'GET' && p === '/messages/templates') return true;

  // 领养/售宠：公开读；moderation 必须 admin
  if (method === 'GET' && (p === '/pet-listings' || p.startsWith('/pet-listings/'))) {
    if (p.includes('/moderation/')) return false;
    if (p.endsWith('/apply') || p.endsWith('/contact')) return false;
    return true;
  }

  if (method === 'GET' && p.startsWith('/users/community/')) return true;

  return false;
}

/** 运营后台专属：必须 admin 角色 */
function needsAdmin(method: string, path: string): boolean {
  const p = path.split('?')[0];
  if (p.startsWith('/messages/moderation')) return true;
  if (p.includes('/pet-listings/moderation')) return true;
  if (p === '/merchants/manage' || p.startsWith('/merchants/manage')) return true;
  if (method === 'POST' && /^\/merchants\/[^/]+\/certification$/.test(p)) return true;
  if (method === 'PATCH' && /^\/merchants\/[^/]+\/certification$/.test(p)) return true;
  // 考察/盲审接口仅运营可访问（当前多为 stub，仍需门禁）
  if (p.startsWith('/inspect/')) return true;
  return false;
}

function tryAttachUser(req: Request): boolean {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return false;
  try {
    const secret = process.env.JWT_SECRET || 'petpal-dev-jwt-secret-change-me';
    const payload = jwt.verify(header.slice(7), secret) as { sub?: string; role?: string };
    if (!payload.sub) return false;
    req.headers['x-user-id'] = payload.sub;
    if (payload.role) req.headers['x-user-role'] = payload.role;
    return true;
  } catch {
    return false;
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl || req.url;

    if (isPublic(req.method, path)) {
      tryAttachUser(req);
      return next();
    }

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: '缺少登录凭证' });
    }

    if (!tryAttachUser(req)) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: '登录已失效，请重新登录' });
    }

    if (needsAdmin(req.method, path)) {
      const role = String(req.headers['x-user-role'] || '');
      if (role !== 'admin') {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: '需要运营管理员权限',
        });
      }
    }

    return next();
  }
}
