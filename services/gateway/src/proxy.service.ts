import { Injectable } from '@nestjs/common';

/**
 * 网关下游地址表与转发实现。
 *
 * 环境变量可覆盖默认本机端口（见仓库根 README「服务端口」）。
 * 特别注意：`agent` 指向 **agent-gateway:3006**，不是 orchestrator:8000。
 * 聊天链路：gateway → agent-gateway → orchestrator `/v1/chat`。
 */
export type DownstreamName =
  | 'auth'
  | 'user'
  | 'merchant'
  | 'inspect'
  | 'message'
  | 'agent';

@Injectable()
export class ProxyService {
  private readonly urls: Record<DownstreamName, string> = {
    auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL ?? 'http://localhost:3002',
    merchant: process.env.MERCHANT_SERVICE_URL ?? 'http://localhost:3003',
    inspect: process.env.INSPECT_SERVICE_URL ?? 'http://localhost:3004',
    message: process.env.MESSAGE_SERVICE_URL ?? 'http://localhost:3005',
    // 这里是 Nest agent-gateway，不是 Python orchestrator
    agent: process.env.AGENT_GATEWAY_URL ?? 'http://localhost:3006',
  };

  resolve(name: DownstreamName): string {
    return this.urls[name];
  }

  /**
   * 原样转发 path + method/body；下游不可达时由 Controller 转成 502。
   */
  async forward(
    name: DownstreamName,
    path: string,
    init?: RequestInit & { headers?: Record<string, string> },
  ): Promise<{ status: number; body: unknown }> {
    const url = `${this.resolve(name)}${path.startsWith('/') ? path : `/${path}`}`;
    // agent 聊天可能较久（DeepSeek），其它下游用较短超时
    const timeoutMs =
      name === 'agent'
        ? Number(process.env.GATEWAY_AGENT_TIMEOUT_MS ?? 60_000)
        : Number(process.env.GATEWAY_PROXY_TIMEOUT_MS ?? 15_000);
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: res.status, body };
  }

  /** 供 GET /health/deps：探测各下游 /health；agent 额外探测 /health/deep */
  async checkDeps() {
    const entries = await Promise.all(
      (Object.keys(this.urls) as DownstreamName[]).map(async (name) => {
        try {
          const path = name === 'agent' ? '/health/deep' : '/health';
          const { status, body } = await this.forward(name, path);
          const deepOk =
            name !== 'agent' ||
            (body &&
              typeof body === 'object' &&
              (body as { orchestrator?: { ok?: boolean } }).orchestrator?.ok !== false);
          return { name, status, body, ok: status === 200 && deepOk };
        } catch (err) {
          return {
            name,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );
    return { gateway: 'ok', deps: entries };
  }
}
