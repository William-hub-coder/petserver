import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { AmapClient } from './amap.client';

/**
 * 地理服务：逆地理 / 地理编码 / 驾车路径。
 * 经 gateway 暴露为 /geo/*；公开可读（定位城市），Key 仅服务端。
 */
@Controller('geo')
export class GeoController {
  constructor(private readonly amap: AmapClient) {}

  @Get('regeo')
  async regeo(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少 lat/lng' });
    }
    const data = await this.amap.regeo(la, ln);
    return { code: ErrorCode.OK, data: { ...data, amapConfigured: this.amap.configured } };
  }

  @Get('geocode')
  async geocode(@Query('address') address?: string) {
    if (!address?.trim()) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少 address' });
    }
    const data = await this.amap.geocode(address.trim());
    return { code: ErrorCode.OK, data: { ...data, amapConfigured: this.amap.configured } };
  }

  /** 地点搜索：用户手动更换服务定位 */
  @Get('search')
  async search(@Query('q') q?: string) {
    if (!q?.trim()) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少搜索词 q' });
    }
    const items = await this.amap.search(q.trim());
    return {
      code: ErrorCode.OK,
      data: { items, amapConfigured: this.amap.configured },
    };
  }

  @Get('direction')
  async direction(
    @Query('fromLat') fromLat?: string,
    @Query('fromLng') fromLng?: string,
    @Query('toLat') toLat?: string,
    @Query('toLng') toLng?: string,
  ) {
    const from = { lat: Number(fromLat), lng: Number(fromLng) };
    const to = { lat: Number(toLat), lng: Number(toLng) };
    if (![from.lat, from.lng, to.lat, to.lng].every(Number.isFinite)) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少起终点坐标' });
    }
    const data = await this.amap.direction(from, to);
    return { code: ErrorCode.OK, data: { ...data, amapConfigured: this.amap.configured } };
  }
}
