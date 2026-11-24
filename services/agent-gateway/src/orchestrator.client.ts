import { Injectable, Logger } from '@nestjs/common';
import type { ChatRequestDto, ChatResponseDto } from '@petpal/shared';
import { AgentIntent } from '@petpal/shared';

/**
 * 调用 Python orchestrator（默认 ORCHESTRATOR_URL=http://localhost:8000）。
 *
 * ## 完整链路
 * user-web → gateway:3000/agent/chat → **本服务:3006** → orchestrator:8000/v1/chat
 *
 * 稳定性：超时 + 有限重试（网络/5xx）；失败仍 200 + fallback，避免前端整页报死。
 */
@Injectable()
export class OrchestratorClient {
  private readonly logger = new Logger(OrchestratorClient.name);
  private readonly baseUrl =
    process.env.ORCHESTRATOR_URL ?? 'http://localhost:8000';
  private readonly timeoutMs = Number(process.env.AGENT_ORCH_TIMEOUT_MS ?? 55_000);
  private readonly retries = Math.max(0, Number(process.env.AGENT_ORCH_RETRIES ?? 2));

  async ping(): Promise<{ ok: boolean; status?: number; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(Math.min(5000, this.timeoutMs)),
      });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async chat(body: ChatRequestDto): Promise<ChatResponseDto> {
    let lastErr = 'unknown';
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}/v1/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (res.status >= 500 && attempt < this.retries) {
          lastErr = `orchestrator status ${res.status}`;
          await sleep(300 * (attempt + 1));
          continue;
        }
        if (!res.ok) {
          throw new Error(`orchestrator status ${res.status}`);
        }
        return (await res.json()) as ChatResponseDto;
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
        const retryable =
          /abort|timeout|ECONNREFUSED|fetch failed|network|status 5/i.test(lastErr);
        if (retryable && attempt < this.retries) {
          await sleep(350 * (attempt + 1));
          continue;
        }
        break;
      }
    }

    this.logger.warn(`orchestrator chat failed after retries: ${lastErr}`);
    return {
      sessionId: body.sessionId ?? 'local-fallback',
      intent: AgentIntent.UNKNOWN,
      routedTo: 'human',
      reply:
        '当前智能客服暂不可用，已为你排队人工客服（本地降级占位）。请确认 orchestrator(:8000) 与 DeepSeek Key 正常。',
      aiGenerated: true,
      fallback: true,
    };
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
