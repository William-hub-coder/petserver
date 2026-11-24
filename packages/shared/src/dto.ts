import { AgentIntent } from './intents';

export interface HealthResponse {
  service: string;
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
}

export interface AgentHistoryMessageDto {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  intent?: string | null;
  createdAt?: string;
}

export interface AgentToolCallDto {
  name: string;
  args?: Record<string, unknown>;
}

export interface AgentToolResultDto {
  name: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface AgentChatContextDto {
  pets?: Array<{
    id: string;
    name: string;
    type: string;
    breed?: string | null;
    gender?: string | null;
    dietNote?: string | null;
    habitatNote?: string | null;
    specialNeeds?: string | null;
    notes?: string | null;
  }>;
  bookings?: Array<{
    id: string;
    merchantName?: string;
    serviceName?: string;
    status: string;
    bookingAt: string;
  }>;
  orders?: Array<{
    id: string;
    status: string;
    totalCents?: number;
    createdAt?: string;
  }>;
  city?: string;
  nickname?: string;
  summary?: string | null;
}

export interface ChatRequestDto {
  sessionId?: string;
  /** 游客客户端键；未登录时与 sessionId 可同值 */
  guestKey?: string;
  userId?: string;
  message: string;
  context?: AgentChatContextDto | Record<string, unknown>;
  history?: AgentHistoryMessageDto[];
  toolResults?: AgentToolResultDto[];
}

export interface ChatResponseDto {
  sessionId: string;
  intent: AgentIntent | string;
  routedTo: string;
  reply: string;
  /** Compliance: AI-generated content marker */
  aiGenerated: true;
  fallback?: boolean;
  toolCalls?: AgentToolCallDto[];
  /** 可选：滚动摘要（由 orchestrator 建议） */
  summary?: string | null;
}

export interface MerchantListItemDto {
  id: string;
  name: string;
  category: string;
  tags?: string[];
  creditScore?: number;
  rating?: number;
  reviewCount?: number;
  distanceKm?: number;
  selectedBadge?: boolean;
  address?: string;
  openUntil?: string;
  priceLevel?: string;
  highlight?: string;
  coverTone?: string;
  inspectedAt?: string | null;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: {
    id: string;
    phone: string;
    nickname: string;
    role: string;
  };
}

export interface UserMeDto {
  id: string;
  phone: string;
  nickname: string;
  avatarUrl?: string | null;
  role: string;
  privacyAcceptedAt?: string | null;
  privacyVersion?: string | null;
  pets: Array<{
    id: string;
    name: string;
    type: string;
    breed?: string | null;
  }>;
}

export interface BookingDto {
  id: string;
  userId: string;
  merchantId: string;
  merchantName?: string;
  serviceId: string;
  serviceName?: string;
  petId?: string | null;
  status: string;
  bookingAt: string;
  verifyCode?: string;
  amountCents: number;
  verifiedAt?: string | null;
}
