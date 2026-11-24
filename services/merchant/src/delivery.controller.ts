import { Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { DeliveryService } from './delivery.service';

@Controller()
export class DeliveryController {
  constructor(private readonly deliveries: DeliveryService) {}

  private uid(h?: string) {
    if (!h) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '请先登录' });
    return h;
  }

  /** 用户/商家触发发货并创建配送任务 */
  @Post('shop-orders/:id/ship')
  async ship(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Param('id') id: string,
  ) {
    const data = await this.deliveries.ship(this.uid(userId), id, role);
    return { code: ErrorCode.OK, data };
  }

  @Get('shop-orders/:id/delivery')
  async byOrder(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.deliveries.byOrder(this.uid(userId), id);
    return { code: ErrorCode.OK, data };
  }

  @Get('deliveries/:id')
  async get(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.deliveries.get(this.uid(userId), id);
    return { code: ErrorCode.OK, data };
  }

  @Get('deliveries/:id/tracks')
  async tracks(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.deliveries.trackList(this.uid(userId), id);
    return { code: ErrorCode.OK, data };
  }
}
