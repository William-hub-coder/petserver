import { Controller, Get, Query } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { ServiceCatalogService } from './service-catalog.service';

/**
 * HTTP：`GET /service-catalog?kind=online_consult|home_visit|onsite`
 *
 * - 经 gateway 代理到本服务（见 ProxyController.serviceCatalog）
 * - 公开可读：gateway AuthMiddleware 对 GET /service-catalog 放行，无需登录即可浏览
 * - 真正下单仍走 `POST /bookings`（需 JWT）
 *
 * kind 缺省为 `onsite`，避免误把全库服务打出去时可显式传参。
 */
@Controller('service-catalog')
export class ServiceCatalogController {
  constructor(private readonly catalog: ServiceCatalogService) {}

  @Get()
  async list(@Query('kind') kind?: string) {
    const k = kind || 'onsite';
    const data = await this.catalog.listByKind(k);
    return { code: ErrorCode.OK, data };
  }
}
