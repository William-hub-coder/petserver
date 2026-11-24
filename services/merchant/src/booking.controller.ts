import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { BookingService } from './booking.service';
import { HomeVisitLiveService } from './home-visit-live.service';

/**
 * 预约 HTTP 接口（挂在 merchant 服务，经 gateway 暴露为 /bookings）。
 *
 * 身份来自网关转发头 `x-user-id` / `x-user-role`（本服务不验 JWT）。
 *
 * | 方法 | 路径 | 说明 |
 * |------|------|------|
 * | POST | /bookings | 创建；body 可含 address、note |
 * | GET  | /bookings | 用户自己的单；商家角色看名下店单 |
 * | POST | /bookings/verify | 商家核销（body.code） |
 * | GET  | /bookings/:id/qrcode | 用户取核销/凭证码 |
 * | POST | /bookings/:id/complete | 用户确认线上/上门完成 |
 * | GET  | /bookings/:id/live | 上门实时位置（服务者+爱宠点） |
 * | POST | /bookings/:id/tracks | 服务者上报坐标 |
 * | POST | /bookings/:id/cancel | 用户取消 |
 */
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookings: BookingService,
    private readonly homeLive: HomeVisitLiveService,
  ) {}

  private uid(h?: string) {
    if (!h) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    return h;
  }

  @Post()
  async create(
    @Headers('x-user-id') userId: string | undefined,
    @Body()
    body: {
      merchantId?: string;
      serviceId?: string;
      petId?: string;
      bookingAt?: string;
      /** 上门地址 → Booking.addressSnapshot */
      address?: string;
      /** 问诊症状 / 上门备注 → Booking.note */
      note?: string;
    },
  ) {
    const data = await this.bookings.create(this.uid(userId), body);
    return { code: ErrorCode.OK, data };
  }

  @Get()
  async list(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-user-role') role?: string,
  ) {
    const data = await this.bookings.list(this.uid(userId), role);
    return { code: ErrorCode.OK, data };
  }

  @Post('verify')
  async verify(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { code?: string },
  ) {
    const data = await this.bookings.verify(this.uid(userId), body.code);
    return { code: ErrorCode.OK, data };
  }

  @Get(':id')
  async get(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Param('id') id: string,
  ) {
    const data = await this.bookings.get(this.uid(userId), id, role);
    return { code: ErrorCode.OK, data };
  }

  @Get(':id/qrcode')
  async qrcode(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.bookings.qrcode(this.uid(userId), id);
    return { code: ErrorCode.OK, data };
  }

  @Post(':id/cancel')
  async cancel(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.bookings.cancel(this.uid(userId), id);
    return { code: ErrorCode.OK, data };
  }

  /**
   * 用户确认线上问诊/上门完成。
   * 到店请用 POST /bookings/verify；对本接口传 onsite 单会 400。
   */
  @Post(':id/complete')
  async complete(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.bookings.completeByUser(this.uid(userId), id);
    return { code: ErrorCode.OK, data };
  }

  /** 上门服务实时位置：服务者轨迹 + 爱宠上门锚点 */
  @Get(':id/live')
  async live(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.homeLive.live(this.uid(userId), id);
    return { code: ErrorCode.OK, data };
  }

  @Post(':id/tracks')
  async tracks(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body() body: { lat?: number; lng?: number; role?: string },
  ) {
    const data = await this.homeLive.reportTrack(this.uid(userId), id, body);
    return { code: ErrorCode.OK, data };
  }
}
