import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@petpal/db';

const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONTENT = 4000;

@Injectable()
export class AgentMemoryService {
  async touch(body: { userId?: string; guestKey?: string; sessionId?: string }) {
    const userId = body.userId?.trim() || undefined;
    const guestKey = body.guestKey?.trim() || body.sessionId?.trim() || undefined;
    if (!userId && !guestKey) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'userId or guestKey required' });
    }

    if (body.sessionId) {
      const existing = await prisma.agentSession.findUnique({ where: { id: body.sessionId } });
      if (existing && !existing.mergedIntoId) {
        if (userId && existing.userId && existing.userId !== userId) {
          throw new ForbiddenException({ code: 'FORBIDDEN', message: '会话不属于当前用户' });
        }
        const updated = await prisma.agentSession.update({
          where: { id: existing.id },
          data: {
            ...(userId && !existing.userId ? { userId } : {}),
            updatedAt: new Date(),
          },
        });
        return this.toSession(updated);
      }
    }

    if (userId) {
      const active = await prisma.agentSession.findFirst({
        where: { userId, mergedIntoId: null },
        orderBy: { updatedAt: 'desc' },
      });
      if (active) {
        const updated = await prisma.agentSession.update({
          where: { id: active.id },
          data: { updatedAt: new Date() },
        });
        return this.toSession(updated);
      }
      const created = await prisma.agentSession.create({
        data: { userId, guestKey: guestKey ?? null },
      });
      return this.toSession(created);
    }

    const since = new Date(Date.now() - GUEST_TTL_MS);
    const guest = await prisma.agentSession.findFirst({
      where: {
        guestKey: guestKey!,
        userId: null,
        mergedIntoId: null,
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (guest) {
      const updated = await prisma.agentSession.update({
        where: { id: guest.id },
        data: { updatedAt: new Date() },
      });
      return this.toSession(updated);
    }
    const created = await prisma.agentSession.create({
      data: { guestKey: guestKey! },
    });
    return this.toSession(created);
  }

  async listMessages(
    sessionId: string,
    opts: { userId?: string; guestKey?: string; limit?: number },
  ) {
    const session = await this.assertAccess(sessionId, opts.userId, opts.guestKey);
    const take = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const rows = await prisma.agentMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take,
    });
    const messages = rows.reverse().map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      intent: m.intent,
      meta: m.meta,
      createdAt: m.createdAt.toISOString(),
    }));
    return {
      sessionId: session.id,
      summary: session.summary,
      userId: session.userId,
      guestKey: session.guestKey,
      messages,
    };
  }

  async appendMessage(
    sessionId: string,
    body: {
      role?: string;
      content?: string;
      intent?: string;
      meta?: Record<string, unknown>;
      userId?: string;
      guestKey?: string;
    },
  ) {
    const session = await this.assertAccess(sessionId, body.userId, body.guestKey);
    const role = (body.role || 'user').trim();
    if (!['user', 'assistant', 'system', 'tool'].includes(role)) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'invalid role' });
    }
    const content = (body.content || '').trim();
    if (!content) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'content required' });
    }
    if (content.length > MAX_CONTENT) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'content too long' });
    }

    const msg = await prisma.agentMessage.create({
      data: {
        sessionId: session.id,
        role,
        content,
        intent: body.intent?.trim() || null,
        ...(body.meta != null
          ? { meta: JSON.parse(JSON.stringify(body.meta)) as object }
          : {}),
      },
    });
    await prisma.agentSession.update({
      where: { id: session.id },
      data: { lastMsgAt: msg.createdAt, updatedAt: new Date() },
    });
    return {
      id: msg.id,
      sessionId: session.id,
      role: msg.role,
      content: msg.content,
      intent: msg.intent,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  async patchSession(
    sessionId: string,
    body: { summary?: string; userId?: string; guestKey?: string },
  ) {
    await this.assertAccess(sessionId, body.userId, body.guestKey);
    const updated = await prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        ...(body.summary !== undefined ? { summary: body.summary } : {}),
        updatedAt: new Date(),
      },
    });
    return this.toSession(updated);
  }

  async merge(body: { userId?: string; guestKey?: string }) {
    const userId = body.userId?.trim();
    const guestKey = body.guestKey?.trim();
    if (!userId || !guestKey) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'userId and guestKey required',
      });
    }

    const userSession = await this.touch({ userId });
    const since = new Date(Date.now() - GUEST_TTL_MS);
    const guest = await prisma.agentSession.findFirst({
      where: {
        guestKey,
        userId: null,
        mergedIntoId: null,
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!guest || guest.id === userSession.id) {
      return { sessionId: userSession.id, merged: 0 };
    }

    if (guest.messages.length) {
      for (const m of guest.messages) {
        await prisma.agentMessage.create({
          data: {
            sessionId: userSession.id,
            role: m.role,
            content: m.content,
            intent: m.intent,
            ...(m.meta != null ? { meta: m.meta as object } : {}),
            createdAt: m.createdAt,
          },
        });
      }
    }

    const summary =
      [guest.summary, userSession.summary].filter(Boolean).join('\n').trim() || null;
    await prisma.agentSession.update({
      where: { id: userSession.id },
      data: {
        summary,
        lastMsgAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await prisma.agentSession.update({
      where: { id: guest.id },
      data: { mergedIntoId: userSession.id, updatedAt: new Date() },
    });

    return { sessionId: userSession.id, merged: guest.messages.length };
  }

  async messageCount(sessionId: string) {
    return prisma.agentMessage.count({ where: { sessionId } });
  }

  private async assertAccess(sessionId: string, userId?: string, guestKey?: string) {
    const session = await prisma.agentSession.findUnique({ where: { id: sessionId } });
    if (!session || session.mergedIntoId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '会话不存在' });
    }
    if (userId && session.userId === userId) return session;
    if (guestKey && session.guestKey === guestKey) {
      const age = Date.now() - session.updatedAt.getTime();
      if (!session.userId && age > GUEST_TTL_MS) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: '游客会话已过期' });
      }
      // 登录用户会话也允许用 guestKey 关联（合并前/后过渡）
      if (!session.userId || session.userId === userId || !userId) return session;
    }
    // 持有 sessionId（cuid）即可访问游客会话；前端会持久化该 id
    if (!session.userId) {
      const age = Date.now() - session.updatedAt.getTime();
      if (age > GUEST_TTL_MS) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: '游客会话已过期' });
      }
      return session;
    }
    // 内部编排：仅带 sessionId 且无冲突时放行（agent-gateway 可信内网）
    if (!userId && !guestKey) return session;
    if (userId && !session.userId) return session;
    throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权访问该 AI 会话' });
  }

  private toSession(s: {
    id: string;
    userId: string | null;
    guestKey: string | null;
    summary: string | null;
    lastMsgAt: Date | null;
    mergedIntoId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: s.id,
      userId: s.userId,
      guestKey: s.guestKey,
      summary: s.summary,
      lastMsgAt: s.lastMsgAt?.toISOString() || null,
      mergedIntoId: s.mergedIntoId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
