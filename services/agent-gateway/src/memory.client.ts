import { Injectable, Logger } from '@nestjs/common';

type Ok<T> = { code?: string; data: T };

@Injectable()
export class MemoryClient {
  private readonly logger = new Logger(MemoryClient.name);
  private readonly baseUrl = process.env.MESSAGE_SERVICE_URL ?? 'http://localhost:3005';

  async touch(input: {
    userId?: string;
    guestKey?: string;
    sessionId?: string;
  }): Promise<{ id: string; summary: string | null }> {
    const data = await this.post<{
      id: string;
      summary: string | null;
    }>('/messages/ai/sessions/touch', input, input.userId);
    return data;
  }

  async history(
    sessionId: string,
    opts: { userId?: string; guestKey?: string; limit?: number },
  ): Promise<{
    sessionId: string;
    summary: string | null;
    messages: Array<{ role: string; content: string; intent?: string | null; createdAt: string }>;
  }> {
    const qs = new URLSearchParams();
    if (opts.limit) qs.set('limit', String(opts.limit));
    if (opts.guestKey) qs.set('guestKey', opts.guestKey);
    const path = `/messages/ai/sessions/${sessionId}/messages?${qs}`;
    return this.get(path, opts.userId);
  }

  async append(
    sessionId: string,
    body: {
      role: string;
      content: string;
      intent?: string;
      meta?: Record<string, unknown>;
      guestKey?: string;
    },
    userId?: string,
  ) {
    return this.post(`/messages/ai/sessions/${sessionId}/messages`, body, userId);
  }

  async patchSummary(sessionId: string, summary: string, userId?: string, guestKey?: string) {
    return this.patch(
      `/messages/ai/sessions/${sessionId}`,
      { summary, guestKey },
      userId,
    );
  }

  async merge(guestKey: string, userId: string) {
    return this.post<{ sessionId: string; merged: number }>(
      '/messages/ai/sessions/merge',
      { guestKey, userId },
      userId,
    );
  }

  private headers(userId?: string): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userId) h['x-user-id'] = userId;
    return h;
  }

  private async get<T>(path: string, userId?: string): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: this.headers(userId),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`memory GET ${res.status}`);
      const json = (await res.json()) as Ok<T>;
      return json.data;
    } catch (err) {
      this.logger.warn(`memory get failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  private async post<T>(path: string, body: unknown, userId?: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`memory POST ${res.status}`);
    const json = (await res.json()) as Ok<T>;
    return json.data;
  }

  private async patch<T>(path: string, body: unknown, userId?: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers(userId),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`memory PATCH ${res.status}`);
    const json = (await res.json()) as Ok<T>;
    return json.data;
  }
}
