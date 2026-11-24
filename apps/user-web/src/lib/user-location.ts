/**
 * 用户服务定位：
 * - 默认 gps：高精度采样 + 精度门控 + 加权融合，目标约 5–10m
 * - 可切 manual：搜索选点后固定该位置（暂停 GPS 覆盖），可一键恢复精确定位
 */
import { ref, readonly } from 'vue';
import type { LatLng } from './amap';
import { loadAmap } from './amap';
import { api } from '../api';

export type LocationMode = 'gps' | 'manual';

export type UserLocationState = {
  lat: number;
  lng: number;
  city: string;
  district: string;
  township: string;
  street: string;
  /** 完整精细地址（街道/门牌） */
  address: string;
  /** 是否已拿到真实坐标（含手动选点） */
  live: boolean;
  /** gps=跟随设备；manual=用户自选 */
  mode: LocationMode;
  /** 水平精度（米），越小越准 */
  accuracyM: number | null;
  updatedAt: number;
};

const STORAGE_KEY = 'petpal_service_location';

const DEFAULT: UserLocationState = {
  lat: 31.2304,
  lng: 121.4737,
  city: '上海',
  district: '静安区',
  township: '',
  street: '',
  address: '',
  live: false,
  mode: 'gps',
  accuracyM: null,
  updatedAt: 0,
};

/** 目标精度：约 5m；达到后优先稳住坐标 */
const TARGET_ACCURACY_M = 5;
/** 可接受上限：超过则不当作有效精定位（首点除外） */
const MAX_ACCEPT_ACCURACY_M = 80;
/** 监听方（附近店）刷新：约 15m 才重拉，避免抖动刷接口 */
const NOTIFY_MOVE_M = 15;
/** 逆地理刷新距离 */
const REGEO_MOVE_M = 25;
const REGEO_MIN_MS = 15_000;
/** 加权融合：保留最近若干高质量样本 */
const SAMPLE_MAX = 8;
const SAMPLE_TTL_MS = 25_000;

const GPS_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000,
};

type GpsSample = {
  lat: number;
  lng: number;
  accuracy: number;
  at: number;
  /** 已是 GCJ-02（高德），无需再转 */
  gcj: boolean;
};

const state = ref<UserLocationState>({ ...DEFAULT });
const watching = ref(false);
const error = ref<string | null>(null);

let watchId: number | null = null;
let amapWatch: { clearWatch?: () => void } | null = null;
let lastFetchLat = 0;
let lastFetchLng = 0;
let lastRegeoAt = 0;
let listeners = new Set<(s: UserLocationState) => void>();
let samples: GpsSample[] = [];
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let burstTimer: ReturnType<typeof setInterval> | null = null;
let firstNotifyDone = false;

function haversineM(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: state.value.mode,
        lat: state.value.lat,
        lng: state.value.lng,
        city: state.value.city,
        district: state.value.district,
        township: state.value.township,
        street: state.value.street,
        address: state.value.address,
      }),
    );
  } catch {
    /* ignore */
  }
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<UserLocationState>;
    if (saved.mode === 'manual' && saved.lat != null && saved.lng != null) {
      state.value = {
        ...state.value,
        ...saved,
        mode: 'manual',
        live: true,
        updatedAt: Date.now(),
      };
      lastFetchLat = saved.lat;
      lastFetchLng = saved.lng;
    }
  } catch {
    /* ignore */
  }
}

restore();

async function fillRegeo(lat: number, lng: number) {
  try {
    const geo = await api.regeo(lat, lng);
    state.value = {
      ...state.value,
      city: geo.city || state.value.city,
      district: geo.district || state.value.district,
      township: (geo as { township?: string }).township || '',
      street: (geo as { street?: string }).street || '',
      address: geo.address || state.value.address,
    };
    persist();
  } catch {
    /* keep */
  }
}

/** 浏览器 GPS 为 WGS84，高德/国内地图为 GCJ-02；不做转换会出现百米级偏移 */
function wgs84ToGcj02(lat: number, lng: number): LatLng {
  const inChina =
    lng > 72.004 && lng < 137.8347 && lat > 0.8293 && lat < 55.8271;
  if (!inChina) return { lat, lng };
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  const transformLat = (x: number, y: number) => {
    let r =
      -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
    r += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
    r += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
    return r;
  };
  const transformLng = (x: number, y: number) => {
    let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
    r += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
    r += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
    return r;
  };
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { lat: lat + dLat, lng: lng + dLng };
}

function pruneSamples(now: number) {
  samples = samples
    .filter((s) => now - s.at <= SAMPLE_TTL_MS && s.accuracy <= MAX_ACCEPT_ACCURACY_M * 1.5)
    .slice(-SAMPLE_MAX);
}

/** 按精度² 反比加权，精度越好权重越大 */
function fuseSamples(list: GpsSample[]): { lat: number; lng: number; accuracy: number } | null {
  if (!list.length) return null;
  let wSum = 0;
  let lat = 0;
  let lng = 0;
  let bestAcc = Infinity;
  for (const s of list) {
    const acc = Math.max(s.accuracy, 1);
    const w = 1 / (acc * acc);
    wSum += w;
    lat += s.lat * w;
    lng += s.lng * w;
    if (s.accuracy < bestAcc) bestAcc = s.accuracy;
  }
  if (wSum <= 0) return null;
  // 融合后精度估计：不低于最佳样本，略优于均值
  const est = Math.max(TARGET_ACCURACY_M * 0.8, bestAcc * 0.85);
  return { lat: lat / wSum, lng: lng / wSum, accuracy: est };
}

function shouldKeepSample(accuracy: number): boolean {
  if (!state.value.live || state.value.accuracyM == null) return true;
  const cur = state.value.accuracyM;
  // 已达目标精度时，拒绝明显更差的粗定位回退（常见：GPS→基站）
  if (cur <= TARGET_ACCURACY_M * 2 && accuracy > cur * 2.5) return false;
  if (accuracy > MAX_ACCEPT_ACCURACY_M && cur <= MAX_ACCEPT_ACCURACY_M) return false;
  return true;
}

async function applyGpsPosition(
  rawLat: number,
  rawLng: number,
  accuracyM: number | null,
  opts: { force?: boolean; alreadyGcj?: boolean } = {},
) {
  if (state.value.mode === 'manual') return;

  const accuracy = accuracyM != null && accuracyM > 0 ? accuracyM : 100;
  // 首点允许粗定位；之后拒绝过差样本
  if (state.value.live && accuracy > MAX_ACCEPT_ACCURACY_M && !opts.force) {
    if (state.value.accuracyM != null && state.value.accuracyM <= MAX_ACCEPT_ACCURACY_M) {
      return;
    }
  }
  if (!shouldKeepSample(accuracy) && !opts.force) return;

  const gcj = opts.alreadyGcj
    ? { lat: rawLat, lng: rawLng }
    : wgs84ToGcj02(rawLat, rawLng);

  const now = Date.now();
  samples.push({
    lat: gcj.lat,
    lng: gcj.lng,
    accuracy,
    at: now,
    gcj: !!opts.alreadyGcj,
  });
  pruneSamples(now);

  // 精度较好的样本优先参与融合
  const good = samples.filter((s) => s.accuracy <= MAX_ACCEPT_ACCURACY_M);
  const fused = fuseSamples(good.length ? good : samples);
  if (!fused) return;

  const lat = fused.lat;
  const lng = fused.lng;
  const fusedAcc = fused.accuracy;

  const prev = { lat: state.value.lat, lng: state.value.lng };
  const moved = state.value.live ? haversineM(prev, { lat, lng }) : Infinity;
  const movedFromFetch = haversineM(
    { lat: lastFetchLat || lat, lng: lastFetchLng || lng },
    { lat, lng },
  );
  const accuracyImproved =
    state.value.accuracyM == null || fusedAcc < state.value.accuracyM * 0.75;

  // 展示坐标：小幅移动也更新，避免「粘」在粗点上
  const shouldUpdateCoord =
    opts.force ||
    !state.value.live ||
    moved >= TARGET_ACCURACY_M ||
    accuracyImproved;

  if (!shouldUpdateCoord) return;

  const significant =
    opts.force ||
    !firstNotifyDone ||
    movedFromFetch >= NOTIFY_MOVE_M ||
    accuracyImproved;

  const hadAddress = !!state.value.address;
  state.value = {
    ...state.value,
    lat,
    lng,
    live: true,
    mode: 'gps',
    accuracyM: fusedAcc,
    updatedAt: now,
  };

  const needRegeo =
    opts.force ||
    !hadAddress ||
    (movedFromFetch >= REGEO_MOVE_M && now - lastRegeoAt > REGEO_MIN_MS) ||
    (accuracyImproved && fusedAcc <= TARGET_ACCURACY_M * 3 && now - lastRegeoAt > 8_000);

  if (needRegeo) {
    lastRegeoAt = now;
    await fillRegeo(lat, lng);
  }

  if (significant) {
    firstNotifyDone = true;
    lastFetchLat = lat;
    lastFetchLng = lng;
    persist();
    listeners.forEach((fn) => fn({ ...state.value }));
  }
}

function ingestBrowserPosition(pos: GeolocationPosition, force = false) {
  void applyGpsPosition(
    pos.coords.latitude,
    pos.coords.longitude,
    pos.coords.accuracy ?? null,
    { force },
  );
}

/** 有高德 Key 时用官方定位（自动 GCJ-02，国内 Wi‑Fi 库更准） */
async function tryStartAmapGeolocation(): Promise<boolean> {
  try {
    const AMap = await loadAmap();
    if (!AMap) return false;
    await new Promise<void>((resolve) => {
      AMap.plugin('AMap.Geolocation', () => resolve());
    });
    const geo = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
      convert: true,
      showButton: false,
      GeoLocationFirst: true,
      useNative: true,
    });
    amapWatch = geo;

    const onComplete = (result: any) => {
      if (!result?.position) return;
      const acc = typeof result.accuracy === 'number' ? result.accuracy : 15;
      void applyGpsPosition(result.position.lat, result.position.lng, acc, {
        alreadyGcj: true,
      });
    };

    geo.getCurrentPosition((status: string, result: any) => {
      if (status === 'complete') onComplete({ ...result, accuracy: result.accuracy });
    });
    if (typeof geo.on === 'function') geo.on('complete', onComplete);
    if (typeof geo.watchPosition === 'function') geo.watchPosition();
    return true;
  } catch {
    return false;
  }
}

/** 用户搜索选点：固定为服务定位，暂停 GPS 覆盖 */
export async function setManualLocation(input: {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  city?: string;
  district?: string;
}) {
  stopLocationWatch();
  samples = [];
  firstNotifyDone = false;
  state.value = {
    ...state.value,
    lat: input.lat,
    lng: input.lng,
    city: input.city || state.value.city,
    district: input.district || state.value.district,
    address: input.address || input.name || state.value.address,
    township: '',
    street: '',
    live: true,
    mode: 'manual',
    accuracyM: null,
    updatedAt: Date.now(),
  };
  lastFetchLat = input.lat;
  lastFetchLng = input.lng;
  await fillRegeo(input.lat, input.lng);
  if (input.name && !state.value.address.includes(input.name)) {
    state.value = {
      ...state.value,
      address: state.value.address || input.name,
    };
  }
  persist();
  listeners.forEach((fn) => fn({ ...state.value }));
}

/** 恢复设备精确定位 */
export function usePreciseGps() {
  state.value = { ...state.value, mode: 'gps' };
  persist();
  startLocationWatch(true);
}

export function startLocationWatch(forceRestart = false) {
  if (!navigator.geolocation) {
    error.value = '设备不支持定位';
    return;
  }
  if (state.value.mode === 'manual' && !forceRestart) {
    return;
  }
  if (forceRestart) {
    stopLocationWatch();
    state.value = { ...state.value, mode: 'gps' };
    samples = [];
    firstNotifyDone = false;
  }
  if (watchId != null) return;

  watching.value = true;
  error.value = null;

  // 先快速拿一点，再在短窗内融合多帧逼近 ~5m
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      ingestBrowserPosition(pos, true);
      if (burstTimer) clearInterval(burstTimer);
      if (settleTimer) clearTimeout(settleTimer);
      const started = Date.now();
      burstTimer = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (p) => ingestBrowserPosition(p, false),
          () => {},
          GPS_OPTS,
        );
        if (Date.now() - started > 3000 && burstTimer) {
          clearInterval(burstTimer);
          burstTimer = null;
        }
      }, 350);
      settleTimer = setTimeout(() => {
        if (burstTimer) clearInterval(burstTimer);
        burstTimer = null;
        settleTimer = null;
      }, 3200);
    },
    (err) => {
      error.value = err.message || '定位失败';
      watching.value = false;
    },
    GPS_OPTS,
  );

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      watching.value = true;
      error.value = null;
      ingestBrowserPosition(pos, false);
    },
    (err) => {
      error.value = err.message || '定位中断';
    },
    GPS_OPTS,
  );

  // 并行尝试高德（有 Key 时）；与浏览器样本一起融合
  void tryStartAmapGeolocation();
}

export function stopLocationWatch() {
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
  if (amapWatch?.clearWatch) {
    try {
      amapWatch.clearWatch();
    } catch {
      /* ignore */
    }
  }
  amapWatch = null;
  if (settleTimer) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
  if (burstTimer) {
    clearInterval(burstTimer);
    burstTimer = null;
  }
  watching.value = false;
}

export function onLocationSignificantChange(fn: (s: UserLocationState) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useUserLocation() {
  return {
    location: readonly(state),
    watching: readonly(watching),
    error: readonly(error),
    startLocationWatch,
    stopLocationWatch,
    setManualLocation,
    usePreciseGps,
    onLocationSignificantChange,
  };
}

/** 短标题：城市 · 街道/商圈 */
export function locationLabel(s: UserLocationState = state.value) {
  if (s.street) return `${s.city} · ${s.street}`;
  if (s.township) return `${s.city} · ${s.township}`;
  const dist = s.district ? ` · ${s.district.replace(/区$/, '')}` : '';
  return `${s.city}${dist}`;
}

/** 副标题：完整地址 + 精度/模式 */
export function locationDetail(s: UserLocationState = state.value) {
  const bits: string[] = [];
  if (s.address) bits.push(s.address);
  if (s.mode === 'manual') bits.push('已手动选择');
  else if (s.accuracyM != null && s.accuracyM > 0) {
    const m = Math.round(s.accuracyM);
    bits.push(m <= 8 ? `精度约 ${m}m` : `精度约 ${m}m · 校准中`);
  }
  return bits.join(' · ') || '点击设置服务定位';
}

