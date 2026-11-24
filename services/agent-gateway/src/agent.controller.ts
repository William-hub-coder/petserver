import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ErrorCode,
  MVP_AGENTS,
  type AgentChatContextDto,
  type AgentHistoryMessageDto,
  type ChatRequestDto,
  type ChatResponseDto,
} from '@petpal/shared';
import { BizClient } from './biz.client';
import { MemoryClient } from './memory.client';
import { OrchestratorClient } from './orchestrator.client';

/**
 * Agent 接入层 HTTP（本服务默认 :3006）。
 *
 * 编排：记忆落库 → 业务上下文 → Python orchestrator（可工具回灌）→ 写回助手消息。
 */
@Controller('agent')
export class AgentController {
  private readonly maxLen = Math.max(32, Number(process.env.AGENT_CHAT_MAX_LEN ?? 2000));
  private readonly rateLimit = Math.max(1, Number(process.env.AGENT_CHAT_RATE_LIMIT ?? 30));
  private readonly rateWindowMs = 60_000;
  private readonly hits = new Map<string, number[]>();
  private readonly summaryEvery = Math.max(6, Number(process.env.AGENT_SUMMARY_EVERY ?? 12));

  constructor(
    private readonly orchestrator: OrchestratorClient,
    private readonly memory: MemoryClient,
    private readonly biz: BizClient,
  ) {}

  @Get('agents')
  listAgents() {
    return {
      code: ErrorCode.OK,
      data: {
        mvp: MVP_AGENTS,
        note: 'A1 memory + read-only tools; A2/A6/A8 stubs',
      },
    };
  }

  /** 拉取 AI 会话历史（游客用 guestKey/sessionId；登录带 x-user-id） */
  @Get('memory')
  async getMemory(
    @Query('sessionId') sessionId: string | undefined,
    @Query('guestKey') guestKey: string | undefined,
    @Headers('x-user-id') userId?: string,
  ) {
    const sid = (sessionId || guestKey || '').trim();
    if (!sid) {
      throw new BadRequestException({ code: ErrorCode.BAD_REQUEST, message: 'sessionId required' });
    }
    try {
      const gk = (guestKey || '').trim() || undefined;
      const touched = await this.memory.touch({
        userId,
        guestKey: gk,
        sessionId: sessionId?.trim() || undefined,
      });
      const hist = await this.memory.history(touched.id, {
        userId,
        guestKey: gk,
        limit: 40,
      });
      return { code: ErrorCode.OK, data: hist };
    } catch {
      return {
        code: ErrorCode.OK,
        data: { sessionId: sid, summary: null, messages: [] },
      };
    }
  }

  /** 登录后合并游客会话 */
  @Post('memory/merge')
  @HttpCode(200)
  async mergeMemory(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { guestKey?: string },
  ) {
    if (!userId) {
      throw new HttpException(
        { code: ErrorCode.UNAUTHORIZED, message: '请先登录' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const guestKey = (body.guestKey || '').trim();
    if (!guestKey) {
      throw new BadRequestException({ code: ErrorCode.BAD_REQUEST, message: 'guestKey required' });
    }
    const data = await this.memory.merge(guestKey, userId);
    return { code: ErrorCode.OK, data };
  }

  /**
   * 用户对话入口。body: { message, sessionId?, guestKey?, context? }
   */
  @Post('chat')
  @HttpCode(200)
  async chat(
    @Body() body: ChatRequestDto,
    @Req() req: { ip?: string; headers?: Record<string, string | string[] | undefined> },
    @Headers('x-forwarded-for') xff?: string,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
      throw new BadRequestException({ code: ErrorCode.BAD_REQUEST, message: 'message required' });
    }
    if (message.length > this.maxLen) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        message: `message too long (max ${this.maxLen})`,
      });
    }

    const ip = String(xff?.split(',')[0] || req.ip || 'unknown').trim();
    this.assertRateLimit(ip);

    const userId = headerUserId || body.userId || undefined;
    const guestKey = (body.guestKey || body.sessionId || '').trim() || undefined;
    const city =
      typeof body.context === 'object' && body.context && 'city' in body.context
        ? String((body.context as AgentChatContextDto).city || '上海')
        : '上海';

    let sessionId = body.sessionId?.trim() || guestKey || '';
    let summary: string | null = null;
    let history: AgentHistoryMessageDto[] = [];

    try {
      const session = await this.memory.touch({ userId, guestKey, sessionId: sessionId || undefined });
      sessionId = session.id;
      summary = session.summary;
      await this.memory.append(
        sessionId,
        { role: 'user', content: message, guestKey },
        userId,
      );
      const hist = await this.memory.history(sessionId, { userId, guestKey, limit: 16 });
      summary = hist.summary ?? summary;
      history = hist.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(0, -1) // 当前用户句已单独传 message
        .map((m) => ({
          role: m.role as AgentHistoryMessageDto['role'],
          content: m.content,
          intent: m.intent,
          createdAt: m.createdAt,
        }));
    } catch {
      // 记忆服务不可用时仍走编排（无持久化）
      if (!sessionId) sessionId = guestKey || `tmp-${Date.now()}`;
    }

    const context = await this.biz.loadContext(userId, city);
    context.summary = summary;

    let orchBody: ChatRequestDto = {
      message,
      sessionId,
      userId,
      guestKey,
      history,
      context,
    };

    let data = await this.orchestrator.chat(orchBody);

    // 工具回灌：最多 2 轮
    for (let i = 0; i < 2 && data.toolCalls?.length && !data.fallback; i++) {
      const toolResults = await this.biz.runTools(data.toolCalls, {
        userId,
        city,
        context,
      });
      orchBody = {
        ...orchBody,
        toolResults,
        history: [
          ...history,
          { role: 'user', content: message },
          ...(data.reply ? [{ role: 'assistant' as const, content: data.reply }] : []),
        ],
      };
      data = await this.orchestrator.chat(orchBody);
      if (!data.toolCalls?.length) break;
    }

    const reply = data.reply || '我在，可以再说具体一点吗？';
    const response: ChatResponseDto = {
      sessionId: data.sessionId || sessionId,
      intent: data.intent,
      routedTo: data.routedTo || 'A1',
      reply,
      aiGenerated: true,
      fallback: Boolean(data.fallback),
    };

    try {
      await this.memory.append(
        sessionId,
        {
          role: 'assistant',
          content: reply,
          intent: String(data.intent || ''),
          guestKey,
          meta: { routedTo: data.routedTo, fallback: data.fallback },
        },
        userId,
      );
      if (data.summary) {
        await this.memory.patchSummary(sessionId, data.summary, userId, guestKey);
      } else if (history.length + 2 >= this.summaryEvery && !summary) {
        // 轻量本地摘要占位：取最近几轮
        const snip = [...history.slice(-4), { role: 'user', content: message }, { role: 'assistant', content: reply }]
          .map((m) => `${m.role}: ${m.content.slice(0, 80)}`)
          .join(' | ');
        await this.memory.patchSummary(sessionId, snip.slice(0, 500), userId, guestKey);
      }
    } catch {
      /* ignore persist errors */
    }

    return { code: ErrorCode.OK, data: response };
  }

  @Get('security/status')
  securityStatus() {
    return {
      code: ErrorCode.OK,
      data: {
        agent: 'A8',
        mode: 'observe',
        note: 'Security agent shell — observe mode only',
        limits: {
          maxLen: this.maxLen,
          rateLimitPerMin: this.rateLimit,
        },
      },
    };
  }

  private assertRateLimit(ip: string) {
    const now = Date.now();
    const windowStart = now - this.rateWindowMs;
    const prev = (this.hits.get(ip) ?? []).filter((t) => t > windowStart);
    if (prev.length >= this.rateLimit) {
      throw new HttpException(
        { code: ErrorCode.RATE_LIMITED, message: '请求过于频繁，请稍后再试' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    prev.push(now);
    this.hits.set(ip, prev);

    if (this.hits.size > 5000) {
      for (const [k, arr] of this.hits) {
        const kept = arr.filter((t) => t > windowStart);
        if (!kept.length) this.hits.delete(k);
        else this.hits.set(k, kept);
      }
    }
  }
}
