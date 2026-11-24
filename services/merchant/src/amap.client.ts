import { Injectable } from '@nestjs/common';

/**
 * 高德 Web 服务客户端（仅服务端使用 AMAP_WEB_KEY）。
 * 无 Key 时走本地 mock，保证开发环境不阻塞找店/导航/轨迹演示。
 */
export type GeoPoint = { lat: number; lng: number };

const SH_CENTER: GeoPoint = { lat: 31.2304, lng: 121.4737 };

@Injectable()
export class AmapClient {
  private readonly key = process.env.AMAP_WEB_KEY || '';

  get configured() {
    return !!this.key;
  }

  /** 逆地理：坐标 → 精细地址（街道/门牌优先） */
  async regeo(lat: number, lng: number): Promise<{
    city: string;
    district: string;
    township: string;
    street: string;
    address: string;
    mock: boolean;
  }> {
    if (!this.key) {
      return {
        city: '上海',
        district: '静安区',
        township: '',
        street: '',
        address: `演示位置（${lat.toFixed(5)}, ${lng.toFixed(5)}）`,
        mock: true,
      };
    }
    // extensions=all 可拿到更细的道路/门牌信息，便于服务上门/配送
    const url =
      `https://restapi.amap.com/v3/geocode/regeo?key=${this.key}` +
      `&location=${lng},${lat}&extensions=all&radius=100&roadlevel=0`;
    const json = (await fetch(url).then((r) => r.json())) as {
      status?: string;
      regeocode?: {
        formatted_address?: string;
        addressComponent?: {
          city?: string | string[];
          district?: string;
          township?: string | string[];
          streetNumber?: { street?: string; number?: string };
        };
      };
    };
    if (json.status !== '1' || !json.regeocode) {
      return {
        city: '上海',
        district: '',
        township: '',
        street: '',
        address: `${lat},${lng}`,
        mock: true,
      };
    }
    const ac = json.regeocode.addressComponent || {};
    const cityRaw = Array.isArray(ac.city) ? ac.city[0] || '上海' : ac.city || '上海';
    const township = Array.isArray(ac.township)
      ? ac.township[0] || ''
      : ac.township || '';
    const street = [ac.streetNumber?.street, ac.streetNumber?.number].filter(Boolean).join('');
    return {
      city: cityRaw.replace(/市$/, '') || '上海',
      district: ac.district || '',
      township,
      street,
      address: json.regeocode.formatted_address || '',
      mock: false,
    };
  }

  /** 地理编码：地址 → 坐标（取第一条） */
  async geocode(address: string): Promise<GeoPoint & { mock: boolean; name?: string }> {
    const list = await this.search(address);
    if (!list.length) return { ...SH_CENTER, mock: true };
    return { lat: list[0].lat, lng: list[0].lng, mock: list[0].mock, name: list[0].name };
  }

  /**
   * 地点搜索：供用户手动更换定位。
   * 有 Key 时走高德关键字搜索；否则返回少量演示候选。
   */
  async search(keyword: string): Promise<
    Array<{
      name: string;
      address: string;
      city: string;
      district: string;
      lat: number;
      lng: number;
      mock: boolean;
    }>
  > {
    const q = keyword.trim();
    if (!q) return [];

    if (!this.key) {
      const h = hash(q);
      return [0, 1, 2].map((i) => ({
        name: `${q}${i === 0 ? '' : ` · 候选${i + 1}`}`,
        address: `上海市演示区${q}附近`,
        city: '上海',
        district: '静安区',
        lat: SH_CENTER.lat + ((h % 50) - 25 + i * 3) * 0.0003,
        lng: SH_CENTER.lng + (((h >> 7) % 50) - 25 + i * 2) * 0.0003,
        mock: true,
      }));
    }

    const url =
      `https://restapi.amap.com/v3/place/text?key=${this.key}` +
      `&keywords=${encodeURIComponent(q)}&offset=12&page=1&extensions=base`;
    const json = (await fetch(url).then((r) => r.json())) as {
      status?: string;
      pois?: Array<{
        name?: string;
        address?: string | string[];
        cityname?: string;
        adname?: string;
        location?: string;
      }>;
    };
    if (json.status !== '1' || !json.pois?.length) {
      // 回退地理编码多结果
      const geoUrl =
        `https://restapi.amap.com/v3/geocode/geo?key=${this.key}` +
        `&address=${encodeURIComponent(q)}`;
      const geo = (await fetch(geoUrl).then((r) => r.json())) as {
        status?: string;
        geocodes?: Array<{
          formatted_address?: string;
          city?: string | string[];
          district?: string;
          location?: string;
        }>;
      };
      return (geo.geocodes || [])
        .filter((g) => g.location)
        .slice(0, 10)
        .map((g) => {
          const [lng, lat] = g.location!.split(',').map(Number);
          const city = Array.isArray(g.city) ? g.city[0] || '' : g.city || '';
          return {
            name: g.formatted_address || q,
            address: g.formatted_address || q,
            city: city.replace(/市$/, ''),
            district: g.district || '',
            lat,
            lng,
            mock: false,
          };
        });
    }

    return json.pois
      .filter((p) => p.location)
      .map((p) => {
        const [lng, lat] = p.location!.split(',').map(Number);
        const addr = Array.isArray(p.address) ? p.address.join('') : p.address || '';
        return {
          name: p.name || q,
          address: addr || p.name || q,
          city: (p.cityname || '').replace(/市$/, ''),
          district: p.adname || '',
          lat,
          lng,
          mock: false,
        };
      });
  }

  /**
   * 周边 POI 搜索（找店实时列表）。
   * @see https://lbs.amap.com/api/webservice/guide/api/search#around
   */
  async searchAround(opts: {
    lat: number;
    lng: number;
    keywords: string;
    radiusM?: number;
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      name: string;
      address: string;
      city: string;
      district: string;
      lat: number;
      lng: number;
      type: string;
      tel: string;
      mock: boolean;
    }>
  > {
    const keywords = opts.keywords.trim() || '宠物店';
    const radius = Math.min(Math.max(opts.radiusM ?? 5000, 500), 50000);
    const limit = Math.min(Math.max(opts.limit ?? 10, 1), 25);

    if (!this.key) {
      const h = hash(keywords + opts.lat.toFixed(3));
      return Array.from({ length: Math.min(limit, 6) }, (_, i) => ({
        id: `mock_${h}_${i}`,
        name: `${keywords.replace(/\|/g, '·')} · 演示店${i + 1}`,
        address: `演示路 ${100 + i} 号（无 AMAP_WEB_KEY 时模拟周边）`,
        city: '上海',
        district: '静安区',
        lat: opts.lat + ((h % 40) - 20 + i * 4) * 0.00035,
        lng: opts.lng + (((h >> 5) % 40) - 20 + i * 3) * 0.00035,
        type: '宠物服务',
        tel: '',
        mock: true,
      }));
    }

    const url =
      `https://restapi.amap.com/v3/place/around?key=${this.key}` +
      `&location=${opts.lng},${opts.lat}` +
      `&keywords=${encodeURIComponent(keywords)}` +
      `&radius=${radius}&offset=${limit}&page=1&extensions=base&sortrule=distance`;

    const json = (await fetch(url).then((r) => r.json())) as {
      status?: string;
      info?: string;
      pois?: Array<{
        id?: string;
        name?: string;
        address?: string | string[];
        cityname?: string;
        adname?: string;
        location?: string;
        type?: string;
        tel?: string | string[];
      }>;
    };

    if (json.status !== '1' || !json.pois?.length) {
      return [];
    }

    return json.pois
      .filter((p) => p.location)
      .slice(0, limit)
      .map((p) => {
        const [lng, lat] = p.location!.split(',').map(Number);
        const addr = Array.isArray(p.address) ? p.address.join('') : p.address || '';
        const tel = Array.isArray(p.tel) ? p.tel.filter(Boolean).join(',') : p.tel || '';
        return {
          id: p.id || `${lng}_${lat}`,
          name: p.name || keywords,
          address: addr || p.name || '',
          city: (p.cityname || '').replace(/市$/, ''),
          district: p.adname || '',
          lat,
          lng,
          type: p.type || '',
          tel,
          mock: false,
        };
      });
  }

  /** 驾车路径距离/时长（米、秒）；失败则直线估算 */
  async direction(
    from: GeoPoint,
    to: GeoPoint,
  ): Promise<{ distanceM: number; durationSec: number; mock: boolean }> {
    if (!this.key) {
      const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
      return {
        distanceM: Math.round(km * 1000),
        durationSec: Math.round((km / 25) * 3600),
        mock: true,
      };
    }
    const url =
      `https://restapi.amap.com/v3/direction/driving?key=${this.key}` +
      `&origin=${from.lng},${from.lat}&destination=${to.lng},${to.lat}`;
    const json = (await fetch(url).then((r) => r.json())) as {
      status?: string;
      route?: { paths?: Array<{ distance?: string; duration?: string }> };
    };
    const path = json.route?.paths?.[0];
    if (json.status !== '1' || !path) {
      const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
      return {
        distanceM: Math.round(km * 1000),
        durationSec: Math.round((km / 25) * 3600),
        mock: true,
      };
    }
    return {
      distanceM: Number(path.distance || 0),
      durationSec: Number(path.duration || 0),
      mock: false,
    };
  }
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
