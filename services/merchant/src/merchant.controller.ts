import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { MerchantService } from './merchant.service';

function assertAdmin(role?: string) {
  if (role !== 'admin') {
    throw new ForbiddenException({ code: 'FORBIDDEN', message: '需要运营管理员权限' });
  }
}

@Controller('merchants')
export class MerchantController {
  constructor(private readonly merchants: MerchantService) {}

  @Get()
  async list(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const data = await this.merchants.list({ city, category, keyword, lat, lng });
    return { code: ErrorCode.OK, data };
  }

  /** 附近实景：高德周边 + 严选认证合并，默认最多 10 条 */
  @Get('nearby')
  async nearby(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('city') city?: string,
    @Query('module') module?: string,
    @Query('keyword') keyword?: string,
    @Query('limit') limit?: string,
    @Query('radiusM') radiusM?: string,
  ) {
    const data = await this.merchants.listNearby({
      lat,
      lng,
      city,
      module,
      keyword,
      limit,
      radiusM,
    });
    return { code: ErrorCode.OK, data };
  }

  /** 运营：全部商户认证管理列表 */
  @Get('manage')
  async manage(@Headers('x-user-role') role?: string) {
    assertAdmin(role);
    const data = await this.merchants.listManage();
    return { code: ErrorCode.OK, data };
  }

  @Get('apply/status')
  async applyStatus(@Headers('x-user-id') userId?: string) {
    const data = await this.merchants.applyStatus(userId);
    return { code: ErrorCode.OK, data };
  }

  /** 运营：写入认证/上下线（影响 App 附近实景严选角标） */
  @Post(':id/certification')
  async certification(
    @Headers('x-user-role') role?: string,
    @Param('id') id?: string,
    @Body()
    body?: {
      selectedBadge?: boolean;
      status?: string;
      highlight?: string;
      creditScore?: number;
      note?: string;
    },
  ) {
    assertAdmin(role);
    const data = await this.merchants.updateCertification(id!, body || {});
    return { code: ErrorCode.OK, data };
  }

  @Get(':id/timeslots')
  async timeslots(@Param('id') id: string, @Query('date') date?: string) {
    const data = await this.merchants.timeslots(id, date);
    return { code: ErrorCode.OK, data };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const data = await this.merchants.detail(id);
    return { code: ErrorCode.OK, data };
  }
}
