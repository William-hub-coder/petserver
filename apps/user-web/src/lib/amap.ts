/**
 * 高德 JS API 加载与轻量地图封装。
 * - 配置了 VITE_AMAP_JS_KEY 时加载官方 SDK
 * - 未配置时用 LiteMap（SVG 坐标系）保证演示可用
 */

export type LatLng = { lat: number; lng: number };

export type MapMarker = LatLng & {
  id: string;
  title?: string;
  color?: string;
};

declare global {
  interface Window {
    AMap?: any;
    _petpalAmapLoading?: Promise<any>;
    _AMapSecurityConfig?: { securityJsCode?: string };
  }
}

const jsKey = import.meta.env.VITE_AMAP_JS_KEY as string | undefined;
const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE as string | undefined;

export function hasAmapJsKey() {
  return !!jsKey;
}

export function loadAmap(): Promise<any | null> {
  if (!jsKey) return Promise.resolve(null);
  if (window.AMap) return Promise.resolve(window.AMap);
  if (window._petpalAmapLoading) return window._petpalAmapLoading;

  // 高德 JS API 2.0 若开启了「安全密钥」，必须先注入再加载脚本
  if (securityCode) {
    window._AMapSecurityConfig = { securityJsCode: securityCode };
  }

  window._petpalAmapLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${jsKey}`;
    s.async = true;
    s.onload = () => {
      if (window.AMap) resolve(window.AMap);
      else reject(new Error('高德 JS API 未就绪'));
    };
    s.onerror = () => reject(new Error('高德 JS API 加载失败'));
    document.head.appendChild(s);
  }).catch((err) => {
    window._petpalAmapLoading = undefined;
    throw err;
  });
  return window._petpalAmapLoading;
}

/** 调起高德 App / 网页导航到目标点 */
export function openAmapNavigation(to: LatLng & { name?: string }, mode: 'car' | 'walk' = 'car') {
  const name = encodeURIComponent(to.name || '目的地');
  const url =
    `https://uri.amap.com/navigation?to=${to.lng},${to.lat},${name}` +
    `&mode=${mode}&coordinate=gaode&callnative=1`;
  window.open(url, '_blank');
}

export async function getCurrentPosition(): Promise<LatLng | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export type MapHandle = {
  setMarkers: (markers: MapMarker[]) => void;
  setPolyline: (path: LatLng[]) => void;
  /** 平移地图中心（用户移动时跟随） */
  setCenter: (c: LatLng) => void;
  destroy: () => void;
};

/**
 * 在 container 中创建地图。有 Key 用 AMap，否则用 LiteMap。
 * @returns handle + engine（便于页面提示加载失败原因）
 */
export async function createMap(
  container: HTMLElement,
  center: LatLng,
  zoom = 14,
): Promise<MapHandle & { engine: 'amap' | 'lite' }> {
  let AMap: any = null;
  let loadErr: string | null = null;
  if (jsKey) {
    try {
      AMap = await loadAmap();
    } catch (e) {
      loadErr = e instanceof Error ? e.message : '加载失败';
      AMap = null;
    }
  }
  if (AMap) {
    const map = new AMap.Map(container, {
      zoom,
      center: [center.lng, center.lat],
      viewMode: '2D',
    });
    let amapMarkers: any[] = [];
    let polyline: any = null;
    return {
      engine: 'amap' as const,
      setMarkers(markers) {
        map.remove(amapMarkers);
        amapMarkers = markers.map((m) => {
          const marker = new AMap.Marker({
            position: [m.lng, m.lat],
            title: m.title || '',
          });
          map.add(marker);
          return marker;
        });
        if (markers.length > 1) {
          map.setFitView(amapMarkers);
        }
      },
      setPolyline(path) {
        if (polyline) map.remove(polyline);
        if (path.length < 2) return;
        polyline = new AMap.Polyline({
          path: path.map((p) => [p.lng, p.lat]),
          strokeColor: '#1a9e8e',
          strokeWeight: 5,
        });
        map.add(polyline);
      },
      setCenter(c) {
        map.setCenter([c.lng, c.lat]);
      },
      destroy() {
        map.destroy();
      },
    };
  }

  const lite = createLiteMap(container, center, zoom, loadErr);
  return { ...lite, engine: 'lite' as const };
}

/** 无 Key / 加载失败时的简易坐标平面图 */
function createLiteMap(
  container: HTMLElement,
  center: LatLng,
  _zoom: number,
  loadErr?: string | null,
): MapHandle {
  container.innerHTML = '';
  container.style.position = 'relative';
  container.style.background =
    'linear-gradient(160deg,#dfece8 0%,#c5ddd6 40%,#e8f0f5 100%)';
  const tip = document.createElement('div');
  tip.textContent = loadErr
    ? `演示图层（${loadErr}；检查 VITE_AMAP_SECURITY_CODE）`
    : '演示地图（未配置 VITE_AMAP_JS_KEY，使用轻量图层）';
  tip.style.cssText =
    'position:absolute;left:10px;top:10px;z-index:2;font-size:11px;color:#456;background:rgba(255,255,255,.85);padding:4px 8px;border-radius:8px';
  container.appendChild(tip);
  const canvas = document.createElement('div');
  canvas.style.cssText = 'position:absolute;inset:0';
  container.appendChild(canvas);

  let markers: MapMarker[] = [];
  let path: LatLng[] = [];

  const project = (p: LatLng) => {
    const all = [...markers, ...path, center];
    const lats = all.map((x) => x.lat);
    const lngs = all.map((x) => x.lng);
    const minLat = Math.min(...lats) - 0.005;
    const maxLat = Math.max(...lats) + 0.005;
    const minLng = Math.min(...lngs) - 0.005;
    const maxLng = Math.max(...lngs) + 0.005;
    const w = container.clientWidth || 320;
    const h = container.clientHeight || 240;
    const x = ((p.lng - minLng) / (maxLng - minLng || 1)) * (w - 40) + 20;
    const y = (1 - (p.lat - minLat) / (maxLat - minLat || 1)) * (h - 40) + 20;
    return { x, y };
  };

  const render = () => {
    canvas.innerHTML = '';
    if (path.length >= 2) {
      const pts = path.map(project);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.position = 'absolute';
      svg.style.inset = '0';
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      poly.setAttribute('points', pts.map((p) => `${p.x},${p.y}`).join(' '));
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', '#1a9e8e');
      poly.setAttribute('stroke-width', '4');
      svg.appendChild(poly);
      canvas.appendChild(svg);
    }
    for (const m of markers) {
      const { x, y } = project(m);
      const el = document.createElement('button');
      el.type = 'button';
      el.title = m.title || m.id;
      el.style.cssText = `position:absolute;left:${x - 10}px;top:${y - 10}px;width:20px;height:20px;border-radius:50%;border:2px solid #fff;background:${m.color || '#e07040'};box-shadow:0 2px 8px rgba(0,0,0,.25);padding:0;z-index:1`;
      canvas.appendChild(el);
      if (m.title) {
        const lab = document.createElement('span');
        lab.textContent = m.title;
        lab.style.cssText = `position:absolute;left:${x + 12}px;top:${y - 8}px;font-size:11px;font-weight:700;color:#234;white-space:nowrap;background:rgba(255,255,255,.9);padding:1px 5px;border-radius:6px`;
        canvas.appendChild(lab);
      }
    }
  };

  return {
    setMarkers(ms) {
      markers = ms;
      render();
    },
    setPolyline(p) {
      path = p;
      render();
    },
    setCenter(c) {
      center = c;
      render();
    },
    destroy() {
      container.innerHTML = '';
    },
  };
}
