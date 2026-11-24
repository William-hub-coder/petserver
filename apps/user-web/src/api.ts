/**
 * 用户端 API 封装。
 *
 * - base：`VITE_API_BASE_URL`，开发默认 `/api`（Vite 代理到 gateway:3000）
 * - 响应约定：`{ code: 'OK', data }`，非 OK 抛 Error(message)
 * - Token：localStorage；请求自动带 Authorization
 *
 * 预约相关扩展字段：
 * - createBooking 可传 address / note（上门 / 问诊）
 * - bookings 项含 channel、address、note
 * - serviceCatalog(kind) / completeBooking(id) 见方法注释
 */
const base = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'petpal_access_token';
const REFRESH_KEY = 'petpal_refresh_token';
const USER_KEY = 'petpal_user';

export type ApiUser = {
  id: string;
  phone: string;
  nickname: string;
  role: string;
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): ApiUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function saveAuth(data: {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}) {
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

/** 游客身份键：生成后永不被 sessionId 覆盖（否则历史会读失败） */
const AI_GUEST_KEY = 'petpal_ai_guest';
/** 服务端 AgentSession.id */
const AI_SESSION_KEY = 'petpal_ai_session';

export function getAiGuestKey() {
  let key = localStorage.getItem(AI_GUEST_KEY);
  // 兼容旧版：曾把 guest/session 混存在 petpal_ai_session
  if (!key) {
    const legacy = localStorage.getItem(AI_SESSION_KEY);
    if (legacy && !legacy.startsWith('c') && legacy.includes('-')) {
      // uuid 形态更像旧 guestKey
      key = legacy;
    }
  }
  if (!key) {
    key =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  localStorage.setItem(AI_GUEST_KEY, key);
  return key;
}

export function getAiSessionId() {
  return localStorage.getItem(AI_SESSION_KEY) || '';
}

export function setAiSessionId(id: string) {
  if (id) localStorage.setItem(AI_SESSION_KEY, id);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, { ...init, headers });
  const json = (await res.json().catch(() => ({}))) as {
    code?: string;
    data?: T;
    message?: string;
  };
  if (!res.ok || (json.code && json.code !== 'OK')) {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json.data as T;
}

export const api = {
  sendSms: (phone: string) =>
    request<{ phone: string; sent: boolean }>('/auth/sms/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  login: (phone: string, code: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      user: ApiUser;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
  me: () =>
    request<{
      id: string;
      phone: string;
      nickname: string;
      role: string;
      pets: import('./lib/pet-species').UserPet[];
    }>('/users/me'),
  createPet: (body: Partial<import('./lib/pet-species').UserPet> & { name: string; type: string }) =>
    request('/users/pets', { method: 'POST', body: JSON.stringify(body) }),
  updatePet: (
    id: string,
    body: Partial<import('./lib/pet-species').UserPet> & { name?: string; type?: string },
  ) => request(`/users/pets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deletePet: (id: string) => request(`/users/pets/${id}`, { method: 'DELETE' }),
  merchants: (q?: {
    city?: string;
    category?: string;
    keyword?: string;
    lat?: string;
    lng?: string;
  }) => {
    const params = new URLSearchParams();
    if (q?.city) params.set('city', q.city);
    if (q?.category) params.set('category', q.category);
    if (q?.keyword) params.set('keyword', q.keyword);
    if (q?.lat) params.set('lat', q.lat);
    if (q?.lng) params.set('lng', q.lng);
    const qs = params.toString();
    return request<import('./data/mock').Merchant[]>(`/merchants${qs ? `?${qs}` : ''}`);
  },
  /** 附近实景找店：高德周边 + 严选认证，默认最多 10 条 */
  merchantsNearby: (q: {
    lat: string;
    lng: string;
    city?: string;
    module?: string;
    keyword?: string;
    limit?: number;
    radiusM?: number;
  }) => {
    const params = new URLSearchParams();
    params.set('lat', q.lat);
    params.set('lng', q.lng);
    if (q.city) params.set('city', q.city);
    if (q.module) params.set('module', q.module);
    if (q.keyword) params.set('keyword', q.keyword);
    if (q.limit != null) params.set('limit', String(q.limit));
    if (q.radiusM != null) params.set('radiusM', String(q.radiusM));
    return request<{
      items: import('./data/mock').Merchant[];
      keywords: string;
      amapConfigured: boolean;
      certifiedCount: number;
      limit: number;
    }>(`/merchants/nearby?${params.toString()}`);
  },
  merchant: (id: string) =>
    request<
      import('./data/mock').Merchant & {
        services: Array<{ id: string; name: string; price: number; duration: string }>;
        lat?: number | null;
        lng?: number | null;
      }
    >(`/merchants/${id}`),
  regeo: (lat: number, lng: number) =>
    request<{
      city: string;
      district: string;
      township?: string;
      street?: string;
      address: string;
      mock: boolean;
    }>(`/geo/regeo?lat=${lat}&lng=${lng}`),
  geoSearch: (q: string) =>
    request<{
      items: Array<{
        name: string;
        address: string;
        city: string;
        district: string;
        lat: number;
        lng: number;
        mock: boolean;
      }>;
    }>(`/geo/search?q=${encodeURIComponent(q)}`),
  shipOrder: (orderId: string) =>
    request<{
      orderId: string;
      delivery: {
        id: string;
        status: string;
        statusLabel: string;
        courierName: string | null;
        etaText: string | null;
        origin: { lat: number; lng: number } | null;
        dest: { lat: number; lng: number; address?: string | null } | null;
        courier: { lat: number; lng: number } | null;
      } | null;
    }>(`/shop-orders/${orderId}/ship`, { method: 'POST', body: '{}' }),
  getOrderDelivery: (orderId: string) =>
    request<{
      orderId: string;
      delivery: {
        id: string;
        status: string;
        statusLabel: string;
        courierName: string | null;
        etaText: string | null;
        origin: { lat: number; lng: number } | null;
        dest: { lat: number; lng: number; address?: string | null } | null;
        courier: { lat: number; lng: number } | null;
      } | null;
    }>(`/shop-orders/${orderId}/delivery`),
  bookingLive: (bookingId: string) =>
    request<{
      bookingId: string;
      serviceName: string;
      merchantName: string;
      address: string | null;
      servicePhase: string;
      phaseLabel: string;
      etaText: string | null;
      petAnchor: { lat: number | null; lng: number | null; label: string; note: string };
      provider: { lat: number; lng: number } | null;
    }>(`/bookings/${bookingId}/live`),
  timeslots: (id: string, date?: string) =>
    request<{ date: string; slots: Array<{ period: string; time: string; datetime: string; available: boolean }> }>(
      `/merchants/${id}/timeslots${date ? `?date=${date}` : ''}`,
    ),
  createBooking: (body: {
    merchantId: string;
    serviceId: string;
    petId?: string;
    bookingAt: string;
    address?: string;
    note?: string;
  }) =>
    request<{ id: string; verifyCode?: string; status: string; channel?: string }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
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
        channel?: string;
        address?: string | null;
        note?: string | null;
      }>
    >('/bookings'),
  qrcode: (id: string) =>
    request<{ bookingId: string; verifyCode: string; qrPayload: string; status: string }>(
      `/bookings/${id}/qrcode`,
    ),
  /** 用户确认线上问诊/上门服务完成（到店请用核销码，勿调用此接口） */
  completeBooking: (id: string) =>
    request<{ id: string; status: string }>(`/bookings/${id}/complete`, {
      method: 'POST',
      body: '{}',
    }),
  cancelBooking: (id: string) =>
    request(`/bookings/${id}/cancel`, { method: 'POST', body: '{}' }),
  /** 频道级服务列表：online_consult | home_visit | onsite */
  serviceCatalog: (kind: 'online_consult' | 'home_visit' | 'onsite') =>
    request<
      Array<{
        id: string;
        merchantId: string;
        merchantName: string;
        name: string;
        price: number;
        duration: string;
        kind: string;
        description: string;
        creditScore: number;
        city: string;
      }>
    >(`/service-catalog?kind=${kind}`),
  createReview: (body: {
    bookingId: string;
    rating: number;
    content?: string;
    tags?: string[];
  }) => request('/reviews', { method: 'POST', body: JSON.stringify(body) }),
  reviewTags: () => request<string[]>('/reviews/tags'),
  merchantReviews: (merchantId: string, filter = 'all', page = 1) =>
    request<{
      summary: {
        count: number;
        avgRating: number;
        goodRate: number;
        topTags: Array<{ name: string; count: number }>;
        note: string;
      };
      total: number;
      items: Array<{
        id: string;
        user: string;
        score: number;
        text: string;
        tags: string[];
        serviceName: string;
        helpfulCount: number;
        date: string;
      }>;
    }>(`/merchants/${merchantId}/reviews?filter=${filter}&page=${page}`),
  markReviewHelpful: (id: string) =>
    request<{ id: string; helpfulCount: number }>(`/reviews/${id}/helpful`, {
      method: 'POST',
      body: '{}',
    }),
  inbox: () =>
    request<
      Array<{
        id: string;
        type: string;
        title: string;
        body: string;
        time: string;
        unread: boolean;
        conversationId?: string;
      }>
    >('/messages/inbox'),
  markInboxRead: (id: string) =>
    request<{ ok: boolean }>(`/messages/inbox/${id}/read`, { method: 'POST', body: '{}' }),
  unreadSummary: () =>
    request<{ inbox: number; chat: number; total: number }>('/messages/unread-summary'),
  conversations: () =>
    request<
      Array<{
        id: string;
        kind: string;
        kindLabel: string;
        status: string;
        merchantId: string;
        bookingId?: string | null;
        lastMsgAt: string | null;
        lastPreview: string | null;
        unread: number;
        peerName?: string;
        merchantName?: string;
        coverTone?: string | null;
      }>
    >('/messages/conversations'),
  openConversation: (body: {
    kind?: 'merchant_support' | 'doctor_consult' | 'mall_support';
    merchantId?: string;
    bookingId?: string;
  }) =>
    request<{ id: string; kind: string; merchantId: string; bookingId?: string | null }>(
      '/messages/conversations',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  conversationMessages: (id: string) =>
    request<{
      conversation: {
        id: string;
        kind: string;
        kindLabel: string;
        status: string;
        unread: number;
      };
      messages: Array<{
        id: string;
        body: string;
        type: string;
        senderRole: string;
        mine: boolean;
        blocked?: boolean;
        moderationStatus: string;
        time: string;
      }>;
    }>(`/messages/conversations/${id}/messages`),
  sendChatMessage: (id: string, body: string) =>
    request<{
      ok: boolean;
      blocked?: boolean;
      message?: string;
      id?: string;
      body?: string;
      senderRole?: string;
      time?: string;
    }>(`/messages/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  markConversationRead: (id: string) =>
    request<{ ok: boolean }>(`/messages/conversations/${id}/read`, { method: 'POST', body: '{}' }),
  reportChatFlag: (body: { chatMessageId?: string; conversationId?: string; reason?: string }) =>
    request<{ ok: boolean; id: string }>('/messages/flags', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  chat: (
    message: string,
    opts?: { sessionId?: string; guestKey?: string; context?: Record<string, unknown> },
  ) =>
    request<{
      reply: string;
      sessionId: string;
      fallback?: boolean;
      routedTo: string;
      intent?: string;
    }>('/agent/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        sessionId: opts?.sessionId,
        guestKey: opts?.guestKey || getAiGuestKey(),
        context: opts?.context,
      }),
    }),

  aiHistory: (sessionId?: string, guestKey?: string) => {
    const qs = new URLSearchParams();
    const sid = sessionId || getAiSessionId() || getAiGuestKey();
    const gk = guestKey || getAiGuestKey();
    qs.set('sessionId', sid);
    qs.set('guestKey', gk);
    return request<{
      sessionId: string;
      summary: string | null;
      messages: Array<{ role: string; content: string; createdAt?: string }>;
    }>(`/agent/memory?${qs}`);
  },

  mergeAiSession: (guestKey: string) =>
    request<{ sessionId: string; merged: number }>('/agent/memory/merge', {
      method: 'POST',
      body: JSON.stringify({ guestKey }),
    }),

  productCategories: () =>
    request<Array<{ key: string; label: string }>>('/products/categories'),
  products: (q?: { category?: string; keyword?: string; sort?: string }) => {
    const params = new URLSearchParams();
    if (q?.category) params.set('category', q.category);
    if (q?.keyword) params.set('keyword', q.keyword);
    if (q?.sort) params.set('sort', q.sort);
    const qs = params.toString();
    return request<
      Array<{
        id: string;
        name: string;
        category: string;
        subtitle: string;
        coverTone: string;
        coverUrl?: string | null;
        price: number;
        originalPrice: number | null;
        sales: number;
        rating: number;
        reviewCount: number;
        tags: string[];
        merchantId: string;
        merchantName: string;
        selectedBadge: boolean;
      }>
    >(`/products${qs ? `?${qs}` : ''}`);
  },
  product: (id: string) =>
    request<{
      id: string;
      name: string;
      category: string;
      subtitle: string;
      coverTone: string;
      coverUrl?: string | null;
      price: number;
      originalPrice: number | null;
      sales: number;
      rating: number;
      reviewCount: number;
      tags: string[];
      merchantId: string;
      merchantName: string;
      selectedBadge: boolean;
      detail: string;
      specs: Record<string, string>;
      stock: number;
      unit: string;
      merchantCreditScore?: number;
      complianceNote: string;
    }>(`/products/${id}`),
  productReviewTags: () => request<string[]>('/products/review-tags'),
  productReviews: (productId: string, filter = 'all') =>
    request<{
      summary: {
        count: number;
        avgRating: number;
        goodRate: number;
        topTags: Array<{ name: string; count: number }>;
        note: string;
      };
      items: Array<{
        id: string;
        user: string;
        score: number;
        text: string;
        tags: string[];
        helpfulCount: number;
        date: string;
      }>;
    }>(`/products/${productId}/reviews?filter=${filter}`),
  createProductReview: (body: {
    orderItemId: string;
    rating: number;
    content?: string;
    tags?: string[];
  }) =>
    request('/product-reviews', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  markProductReviewHelpful: (id: string) =>
    request<{ id: string; helpfulCount: number }>(`/product-reviews/${id}/helpful`, {
      method: 'POST',
      body: '{}',
    }),
  cart: () =>
    request<{
      items: Array<{
        id: string;
        productId: string;
        qty: number;
        name: string;
        coverTone: string | null;
        coverUrl?: string | null;
        price: number;
        priceCents: number;
        stock: number;
        merchantName: string;
        selectedBadge: boolean;
      }>;
      total: number;
      totalCents: number;
      count: number;
    }>('/cart'),
  addToCart: (productId: string, qty = 1) =>
    request('/cart', { method: 'POST', body: JSON.stringify({ productId, qty }) }),
  updateCart: (productId: string, qty: number) =>
    request(`/cart/${productId}`, { method: 'PATCH', body: JSON.stringify({ qty }) }),
  checkout: (body: {
    items?: Array<{ productId: string; qty: number }>;
    fromCart?: boolean;
    address?: string;
    remark?: string;
    payNow?: boolean;
  }) =>
    request<{ id: string; total: number; status: string }>('/shop-orders/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  shopOrders: () =>
    request<
      Array<{
        id: string;
        status: string;
        statusLabel: string;
        total: number;
        createdAt: string;
        canShip?: boolean;
        canTrack?: boolean;
        items: Array<{
          id: string;
          productId: string;
          name: string;
          price: number;
          qty: number;
          coverTone: string | null;
          coverUrl?: string | null;
          reviewed?: boolean;
          canReview?: boolean;
        }>;
      }>
    >('/shop-orders'),

  petListings: (q?: {
    channel?: 'adopt' | 'sale';
    city?: string;
    species?: string;
    lat?: number;
    lng?: number;
  }) => {
    const params = new URLSearchParams();
    if (q?.channel) params.set('channel', q.channel);
    if (q?.city) params.set('city', q.city);
    if (q?.species) params.set('species', q.species);
    if (q?.lat != null) params.set('lat', String(q.lat));
    if (q?.lng != null) params.set('lng', String(q.lng));
    const qs = params.toString();
    return request<
      Array<{
        id: string;
        channel: 'adopt' | 'sale';
        channelLabel: string;
        priceLabel?: string;
        title: string;
        species: string;
        breed: string | null;
        gender: string | null;
        ageMonths: number | null;
        ageLabel: string;
        city: string;
        district: string | null;
        lat: number | null;
        lng: number | null;
        coverUrl: string | null;
        vaccinated: boolean;
        sterilized: boolean;
        priceCents: number;
        price: number;
        free: boolean;
        merchantId: string;
        merchantName: string;
        selectedBadge: boolean;
        creditScore: number;
        distanceKm: number | null;
      }>
    >(`/pet-listings${qs ? `?${qs}` : ''}`);
  },
  petListing: (id: string) =>
    request<{
      id: string;
      channel: 'adopt' | 'sale';
      channelLabel: string;
      priceLabel?: string;
      title: string;
      species: string;
      breed: string | null;
      gender: string | null;
      ageLabel: string;
      city: string;
      district: string | null;
      address?: string | null;
      lat: number | null;
      lng: number | null;
      coverUrl: string | null;
      images: string[];
      vaccinated: boolean;
      sterilized: boolean;
      price: number;
      free: boolean;
      merchantId: string;
      merchantName: string;
      selectedBadge: boolean;
      creditScore: number;
      description: string;
      licenseNo?: string | null;
      quarantineNote?: string | null;
      complianceNote: string;
    }>(`/pet-listings/${id}`),
  petListingsMap: (q?: { channel?: string; city?: string }) => {
    const params = new URLSearchParams();
    if (q?.channel) params.set('channel', q.channel);
    if (q?.city) params.set('city', q.city);
    const qs = params.toString();
    return request<
      Array<{
        id: string;
        title: string;
        channel: string;
        species: string;
        lat: number;
        lng: number;
        coverUrl: string | null;
        district: string | null;
      }>
    >(`/pet-listings/map${qs ? `?${qs}` : ''}`);
  },
  contactPetListing: (id: string) =>
    request<{ ok: boolean; conversationId: string; merchantId: string }>(
      `/pet-listings/${id}/contact`,
      { method: 'POST', body: '{}' },
    ),
  applyPetListing: (
    id: string,
    body: { motive: string; experience?: string; acceptHomeVisit?: boolean },
  ) =>
    request<{ ok: boolean; applicationId: string; conversationId: string }>(
      `/pet-listings/${id}/apply`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  communityPosts: (q?: { category?: string; cursor?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (q?.category) params.set('category', q.category);
    if (q?.cursor) params.set('cursor', q.cursor);
    if (q?.limit != null) params.set('limit', String(q.limit));
    const qs = params.toString();
    return request<{
      items: CommunityPost[];
      nextCursor: string | null;
    }>(`/users/community/posts${qs ? `?${qs}` : ''}`);
  },
  communityPost: (id: string) => request<CommunityPost>(`/users/community/posts/${id}`),
  createCommunityPost: (body: {
    title: string;
    content?: string;
    category?: string;
    mediaType?: string;
    mediaUrls?: string[];
    coverUrl?: string;
  }) =>
    request<CommunityPost>('/users/community/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  likeCommunityPost: (id: string) =>
    request<{ liked: boolean; likeCount: number }>(`/users/community/posts/${id}/like`, {
      method: 'POST',
      body: '{}',
    }),
  communityComments: (id: string) =>
    request<{ items: CommunityComment[] }>(`/users/community/posts/${id}/comments`),
  addCommunityComment: (id: string, content: string) =>
    request<CommunityComment>(`/users/community/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

export type CommunityPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  mediaType: string;
  mediaUrls: string[];
  coverUrl: string | null;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  createdAt: string;
  author: { id: string; nickname: string; avatarUrl: string | null };
};

export type CommunityComment = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; nickname: string; avatarUrl: string | null };
};

/** 登录后把游客 AI 会话合并到账号 */
export async function mergeAiSessionAfterLogin() {
  if (!getToken()) return null;
  const guestKey = getAiGuestKey();
  try {
    const data = await api.mergeAiSession(guestKey);
    if (data?.sessionId) setAiSessionId(data.sessionId);
    return data;
  } catch {
    return null;
  }
}
