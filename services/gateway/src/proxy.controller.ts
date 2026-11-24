import { All, Controller, Req, Res, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService, type DownstreamName } from './proxy.service';

/**
 * 路径 → 下游服务路由表（HTTP 方法透传）。
 *
 * 常见业务都挂在 merchant：bookings / products / service-catalog 等。
 * agent → agent-gateway:3006（再转 orchestrator），不是直连 :8000。
 *
 * 新增对外路径时：
 * 1. 这里加 @All 代理
 * 2. 若需未登录访问，改 auth.middleware isPublic
 */
@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @All(['auth', 'auth/*'])
  auth(@Req() req: Request, @Res() res: Response) {
    return this.handle('auth', req, res);
  }

  @All(['users', 'users/*'])
  users(@Req() req: Request, @Res() res: Response) {
    return this.handle('user', req, res);
  }

  @All(['merchants', 'merchants/*'])
  merchants(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  @All(['bookings', 'bookings/*'])
  bookings(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  @All(['reviews', 'reviews/*'])
  reviews(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  @All(['products', 'products/*'])
  products(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  @All(['cart', 'cart/*'])
  cart(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  @All(['shop-orders', 'shop-orders/*'])
  shopOrders(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  @All(['product-reviews', 'product-reviews/*'])
  productReviews(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  /** 频道服务目录 → merchant（线上问诊 / 上门等，见 ServiceCatalogController） */
  @All(['service-catalog', 'service-catalog/*'])
  serviceCatalog(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  /** 高德地理代理：逆地理/编码/路径 */
  @All(['geo', 'geo/*'])
  geo(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  /** 商城配送追踪 */
  @All(['deliveries', 'deliveries/*'])
  deliveries(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  @All(['inspect', 'inspect/*'])
  inspect(@Req() req: Request, @Res() res: Response) {
    return this.handle('inspect', req, res);
  }

  @All(['messages', 'messages/*'])
  messages(@Req() req: Request, @Res() res: Response) {
    return this.handle('message', req, res);
  }

  /** 领养 / 宠物售卖 → merchant */
  @All(['pet-listings', 'pet-listings/*'])
  petListings(@Req() req: Request, @Res() res: Response) {
    return this.handle('merchant', req, res);
  }

  /** AI 聊天 → agent-gateway:3006（再转 orchestrator:8000）；3006 未起会 502 */
  @All(['agent', 'agent/*'])
  agent(@Req() req: Request, @Res() res: Response) {
    return this.handle('agent', req, res);
  }

  private async handle(
    name: DownstreamName,
    req: Request,
    res: Response,
  ): Promise<void> {
    const path = req.originalUrl;
    const headers: Record<string, string> = {};
    if (req.headers.authorization) headers.Authorization = String(req.headers.authorization);
    if (req.headers['x-user-id']) headers['x-user-id'] = String(req.headers['x-user-id']);
    if (req.headers['x-user-role']) headers['x-user-role'] = String(req.headers['x-user-role']);
    if (req.headers['x-request-id']) headers['x-request-id'] = String(req.headers['x-request-id']);

    try {
      const { status, body } = await this.proxy.forward(name, path, {
        method: req.method,
        body: ['GET', 'HEAD'].includes(req.method)
          ? undefined
          : JSON.stringify(req.body ?? {}),
        headers,
      });
      res.status(status).json(body);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      res.status(HttpStatus.BAD_GATEWAY).json({
        code: 'BAD_GATEWAY',
        message: `Downstream ${name} unavailable`,
        // 生产不回传内部错误细节，避免信息泄露
        ...(process.env.NODE_ENV === 'production' ? {} : { error: detail }),
      });
    }
  }
}
