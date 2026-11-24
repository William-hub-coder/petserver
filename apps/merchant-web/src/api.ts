const base = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'petpal_m_access_token';
const USER_KEY = 'petpal_m_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuth(data: { accessToken: string; user: { id: string; phone: string; nickname: string; role: string } }) {
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
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const json = (await res.json().catch(() => ({}))) as { code?: string; data?: T; message?: string };
  if (!res.ok || (json.code && json.code !== 'OK')) {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json.data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export const api = {
  sendSms: (phone: string) =>
    request('/auth/sms/send', { method: 'POST', body: JSON.stringify({ phone }) }),
  login: (phone: string, code: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; phone: string; nickname: string; role: string };
    }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  bookings: () =>
    request<
      Array<{
        id: string;
        merchantName?: string;
        serviceName?: string;
        status: string;
        bookingAt: string;
        verifyCode?: string;
        amountCents: number;
      }>
    >('/bookings'),
  verify: (code: string) =>
    request<{ id: string; alreadyVerified?: boolean; status: string }>('/bookings/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  applyStatus: () =>
    request<{
      status: string;
      current: string;
      merchantId?: string;
      name?: string | null;
      selectedBadge?: boolean;
      creditScore?: number;
      creditGrade?: string;
      lastInspectedAt?: string | null;
      highlight?: string;
      stages?: string[];
    }>('/merchants/apply/status'),
  conversations: () =>
    request<
      Array<{
        id: string;
        kind: string;
        kindLabel: string;
        lastMsgAt: string | null;
        lastPreview: string | null;
        unread: number;
        peerName?: string;
        merchantName?: string;
      }>
    >('/messages/conversations'),
  conversationMessages: (id: string) =>
    request<{
      conversation: { id: string; kind: string; kindLabel: string; status: string };
      messages: Array<{
        id: string;
        body: string;
        type: string;
        mine: boolean;
        blocked?: boolean;
        moderationStatus: string;
        time: string;
      }>;
    }>(`/messages/conversations/${id}/messages`),
  sendChatMessage: (id: string, body: string) =>
    request<{ ok: boolean; blocked?: boolean; message?: string }>(
      `/messages/conversations/${id}/messages`,
      { method: 'POST', body: JSON.stringify({ body }) },
    ),
  markConversationRead: (id: string) =>
    request<{ ok: boolean }>(`/messages/conversations/${id}/read`, { method: 'POST', body: '{}' }),
};
