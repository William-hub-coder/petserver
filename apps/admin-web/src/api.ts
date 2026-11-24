const base = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'petpal_admin_access_token';
const USER_KEY = 'petpal_admin_user';

export type AdminUser = { id: string; phone: string; nickname: string; role: string };

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function saveAuth(data: { accessToken: string; user: AdminUser }) {
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers });
  } catch {
    throw new Error('无法连接网关，请确认 services:start 已启动（:3000）');
  }

  const json = (await res.json().catch(() => ({}))) as {
    code?: string;
    data?: T;
    message?: string;
  };

  if (res.status === 401) {
    clearAuth();
    throw new Error(json.message || '登录已失效，请重新登录');
  }
  if (res.status === 403) {
    throw new Error(json.message || '需要运营管理员权限');
  }
  if (!res.ok || (json.code && json.code !== 'OK')) {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return (json.data !== undefined ? json.data : (json as unknown as T)) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
}

export const api = {
  sendSms: (phone: string) =>
    request('/auth/sms/send', { method: 'POST', body: JSON.stringify({ phone }) }),
  login: (phone: string, code: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      user: AdminUser;
    }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  manageMerchants: () =>
    request<
      Array<{
        id: string;
        name: string;
        category: string;
        status: string;
        creditScore: number;
        creditGrade?: string;
        selectedBadge: boolean;
        city: string;
        district?: string | null;
        address: string;
        highlight: string;
        lastInspectedAt: string | null;
        updatedAt: string;
      }>
    >('/merchants/manage'),
  setCertification: (
    id: string,
    body: {
      selectedBadge?: boolean;
      status?: string;
      highlight?: string;
      creditScore?: number;
      note?: string;
    },
  ) => request(`/merchants/${id}/certification`, { method: 'POST', body: JSON.stringify(body) }),
};
