import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ConversationKind,
  ConversationStatus,
  MerchantStatus,
  prisma,
  type Conversation,
} from '@petpal/db';
import { findBlockedKeyword } from './keywords';

const MAX_BODY = 2000;

type InboxTypeLabel = '系统' | '订单' | '活动' | '会话';

function inboxTypeLabel(type: string): InboxTypeLabel {
  if (type === 'order') return '订单';
  if (type === 'marketing') return '活动';
  if (type === 'chat') return '会话';
  return '系统';
}

function kindLabel(kind: ConversationKind): string {
  if (kind === 'doctor_consult') return '问诊';
  if (kind === 'mall_support') return '商城';
  if (kind === 'adoption') return '领养售宠';
  return '门店';
}

function previewOf(body: string) {
  const t = body.replace(/\s+/g, ' ').trim();
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

@Injectable()
export class MessageService {
  async inbox(userId?: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const rows = await prisma.message.findMany({
      where: { userId, channel: 'inbox' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((m) => ({
      id: m.id,
      type: inboxTypeLabel(m.type),
      title: m.title,
      body: m.body,
      time: m.createdAt.toISOString(),
      unread: !m.readAt,
      conversationId: m.conversationId || undefined,
    }));
  }

  async markInboxRead(userId: string | undefined, id: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const row = await prisma.message.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: '消息不存在' });
    if (!row.readAt) {
      await prisma.message.update({ where: { id }, data: { readAt: new Date() } });
    }
    return { ok: true, id };
  }

  async unreadSummary(userId?: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '用户不存在' });

    const inbox = await prisma.message.count({
      where: { userId, channel: 'inbox', readAt: null },
    });

    let chat = 0;
    if (user.role === 'merchant') {
      const owned = await prisma.merchant.findMany({
        where: { ownerUserId: userId },
        select: { id: true },
      });
      const ids = owned.map((m) => m.id);
      if (ids.length) {
        const agg = await prisma.conversation.aggregate({
          where: { merchantId: { in: ids }, status: 'open' },
          _sum: { merchantUnread: true },
        });
        chat = agg._sum.merchantUnread || 0;
      }
    } else {
      const agg = await prisma.conversation.aggregate({
        where: { userId, status: 'open' },
        _sum: { userUnread: true },
      });
      chat = agg._sum.userUnread || 0;
    }

    return { inbox, chat, total: inbox + chat };
  }

  async dispatch(body: {
    userId?: string;
    title?: string;
    body?: string;
    type?: 'system' | 'order' | 'marketing' | 'chat';
    conversationId?: string;
  }) {
    if (!body.userId || !body.title || !body.body) {
      return { ok: false, note: 'missing fields' };
    }
    const m = await prisma.message.create({
      data: {
        userId: body.userId,
        title: body.title,
        body: body.body,
        type: body.type || 'system',
        conversationId: body.conversationId || null,
      },
    });
    return { ok: true, id: m.id };
  }

  async templates() {
    return [
      { code: 'booking_success', title: '预约成功', bodyTemplate: '已预约{{merchant}}' },
      { code: 'review_invite', title: '邀请评价', bodyTemplate: '服务已完成，邀请评价' },
      { code: 'chat_notify', title: '新会话消息', bodyTemplate: '{{merchant}}发来新消息' },
    ];
  }

  async createOrGetConversation(
    userId: string | undefined,
    body: {
      kind?: 'merchant_support' | 'doctor_consult' | 'mall_support' | 'adoption';
      merchantId?: string;
      bookingId?: string;
      listingId?: string;
    },
  ) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const kind = body.kind || 'merchant_support';
    if (!body.merchantId && !body.bookingId && !body.listingId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: '缺少 merchantId、bookingId 或 listingId',
      });
    }

    if (kind === 'doctor_consult' || body.bookingId) {
      return this.openDoctorConsult(userId, body.bookingId!, body.merchantId);
    }

    if (kind === 'adoption' || body.listingId) {
      return this.openAdoptionConversation(userId, body.listingId!, body.merchantId);
    }

    if (!body.merchantId) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少 merchantId' });
    }
    const merchant = await prisma.merchant.findUnique({ where: { id: body.merchantId } });
    if (!merchant || merchant.status !== MerchantStatus.online) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '商户不可联系' });
    }

    const existing = await prisma.conversation.findFirst({
      where: { userId, merchantId: body.merchantId, kind },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return this.toConversationDto(existing, 'user');

    const conv = await prisma.conversation.create({
      data: {
        kind,
        userId,
        merchantId: body.merchantId,
        lastMsgAt: new Date(),
        lastPreview: kind === 'mall_support' ? '已建立商城客服会话' : '已建立门店会话',
      },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderUserId: userId,
        senderRole: 'system',
        type: 'system',
        body:
          kind === 'mall_support'
            ? `您正在联系「${merchant.name}」商城客服，请描述订单或商品问题。`
            : `您正在联系「${merchant.name}」，商家通常会在营业时间内回复。`,
      },
    });
    return this.toConversationDto(conv, 'user');
  }

  async openAdoptionConversation(userId: string, listingId: string, merchantIdHint?: string) {
    const listing = await prisma.petListing.findUnique({
      where: { id: listingId },
      include: { merchant: true },
    });
    if (!listing || listing.status !== 'published') {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '领养/售宠信息不可用' });
    }
    if (merchantIdHint && merchantIdHint !== listing.merchantId) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '信息与门店不匹配' });
    }
    if (listing.publisherUserId === userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '不能联系自己的发布' });
    }

    const existing = await prisma.conversation.findFirst({
      where: { userId, listingId, kind: 'adoption' },
    });
    if (existing) return this.toConversationDto(existing, 'user');

    const label = listing.channel === 'adopt' ? '领养' : '宠物售卖';
    const conv = await prisma.conversation.create({
      data: {
        kind: 'adoption',
        userId,
        merchantId: listing.merchantId,
        listingId,
        lastMsgAt: new Date(),
        lastPreview: `${label}沟通已开启`,
        merchantUnread: 1,
      },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderUserId: userId,
        senderRole: 'system',
        type: 'system',
        body: `您正在就「${listing.title}」与「${listing.merchant.name}」沟通（${label}）。请勿站外转账；售卖须线下核验证照。`,
      },
    });
    await prisma.message.create({
      data: {
        userId: listing.publisherUserId,
        title: '有人咨询领养/售宠信息',
        body: `用户咨询「${listing.title}」，请及时回复。`,
        type: 'chat',
        conversationId: conv.id,
      },
    });
    return this.toConversationDto(
      await prisma.conversation.findUniqueOrThrow({ where: { id: conv.id } }),
      'user',
    );
  }

  /** 问诊预约成功后开会话（可被 booking 同库直写或 API 调用） */
  async openDoctorConsult(userId: string, bookingId: string, merchantIdHint?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { merchant: true, service: true },
    });
    if (!booking || booking.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权操作该预约' });
    }
    if (booking.channel !== 'online_consult') {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '仅线上问诊可开会诊会话' });
    }
    if (merchantIdHint && merchantIdHint !== booking.merchantId) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '预约与门店不匹配' });
    }

    const existing = await prisma.conversation.findUnique({ where: { bookingId } });
    if (existing) return this.toConversationDto(existing, 'user');

    const conv = await prisma.conversation.create({
      data: {
        kind: 'doctor_consult',
        userId,
        merchantId: booking.merchantId,
        bookingId,
        lastMsgAt: new Date(),
        lastPreview: '问诊会话已开启',
      },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderUserId: userId,
        senderRole: 'system',
        type: 'system',
        body: `「${booking.merchant.name}」线上问诊已开启。本服务为健康咨询与分诊，不开处方；急症请线下就医。症状：${booking.note || '（未填写）'}`,
      },
    });
    await prisma.message.create({
      data: {
        userId,
        title: '问诊会话已开启',
        body: `可在消息中心与「${booking.merchant.name}」继续沟通。`,
        type: 'chat',
        conversationId: conv.id,
      },
    });
    // 提醒店长
    if (booking.merchant.ownerUserId) {
      await prisma.message.create({
        data: {
          userId: booking.merchant.ownerUserId,
          title: '新的线上问诊',
          body: `用户预约了「${booking.service.name}」，请及时回复问诊会话。`,
          type: 'chat',
          conversationId: conv.id,
        },
      });
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { merchantUnread: { increment: 1 } },
      });
    }
    return this.toConversationDto(await prisma.conversation.findUniqueOrThrow({ where: { id: conv.id } }), 'user');
  }

  async listConversations(userId?: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '用户不存在' });

    if (user.role === 'merchant') {
      const owned = await prisma.merchant.findMany({
        where: { ownerUserId: userId },
        select: { id: true },
      });
      const ids = owned.map((m) => m.id);
      const rows = await prisma.conversation.findMany({
        where: { merchantId: { in: ids } },
        include: {
          merchant: { select: { id: true, name: true, coverTone: true } },
          user: { select: { id: true, nickname: true, phone: true } },
        },
        orderBy: [{ lastMsgAt: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      });
      return rows.map((c) => ({
        ...this.toConversationDto(c, 'merchant'),
        peerName: c.user.nickname || c.user.phone,
        merchantName: c.merchant.name,
      }));
    }

    const rows = await prisma.conversation.findMany({
      where: { userId },
      include: { merchant: { select: { id: true, name: true, coverTone: true } } },
      orderBy: [{ lastMsgAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return rows.map((c) => ({
      ...this.toConversationDto(c, 'user'),
      peerName: c.merchant.name,
      merchantName: c.merchant.name,
      coverTone: c.merchant.coverTone,
    }));
  }

  async listMessages(userId: string | undefined, conversationId: string, cursor?: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const { conv, side } = await this.assertParticipant(userId, conversationId);

    const rows = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        // 被拦截的消息仅发送方可见
        OR: [{ moderationStatus: { not: 'blocked' } }, { senderUserId: userId }],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    return {
      conversation: this.toConversationDto(conv, side),
      messages: rows.map((m) => ({
        id: m.id,
        body: m.body,
        type: m.type,
        senderRole: m.senderRole,
        senderUserId: m.senderUserId,
        mine: m.senderUserId === userId && m.senderRole !== 'system',
        moderationStatus: m.moderationStatus,
        blocked: m.moderationStatus === 'blocked',
        time: m.createdAt.toISOString(),
      })),
    };
  }

  async sendMessage(
    userId: string | undefined,
    conversationId: string,
    body: { body?: string },
  ) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const text = (body.body || '').trim();
    if (!text) throw new BadRequestException({ code: 'BAD_REQUEST', message: '消息不能为空' });
    if (text.length > MAX_BODY) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: `消息过长（最多 ${MAX_BODY} 字）` });
    }

    const { conv, side, user } = await this.assertParticipant(userId, conversationId);
    if (conv.status === ConversationStatus.closed) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '会话已关闭' });
    }

    let senderRole = 'user';
    if (side === 'merchant') {
      senderRole = conv.kind === 'doctor_consult' ? 'doctor' : 'merchant';
    }

    const hit = findBlockedKeyword(text);
    if (hit) {
      const blocked = await prisma.chatMessage.create({
        data: {
          conversationId,
          senderUserId: userId,
          senderRole,
          type: 'text',
          body: text,
          moderationStatus: 'blocked',
        },
      });
      await prisma.moderationFlag.create({
        data: {
          chatMessageId: blocked.id,
          conversationId,
          reason: `关键词拦截：${hit}`,
          status: 'open',
          reporterUserId: userId,
        },
      });
      return {
        ok: false,
        blocked: true,
        message: '内容含不当信息，已拦截',
        id: blocked.id,
      };
    }

    const msg = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderUserId: userId,
        senderRole,
        type: 'text',
        body: text,
        moderationStatus: 'clean',
      },
    });

    const preview = previewOf(text);
    const now = new Date();
    if (side === 'user') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMsgAt: now,
          lastPreview: preview,
          merchantUnread: { increment: 1 },
        },
      });
      const merchant = await prisma.merchant.findUnique({ where: { id: conv.merchantId } });
      if (merchant?.ownerUserId) {
        await prisma.message.create({
          data: {
            userId: merchant.ownerUserId,
            title: `${user.nickname || '用户'}发来新消息`,
            body: preview,
            type: 'chat',
            conversationId,
          },
        });
      }
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMsgAt: now,
          lastPreview: preview,
          userUnread: { increment: 1 },
        },
      });
      const merchant = await prisma.merchant.findUnique({ where: { id: conv.merchantId } });
      await prisma.message.create({
        data: {
          userId: conv.userId,
          title: `${merchant?.name || '商家'}发来新消息`,
          body: preview,
          type: 'chat',
          conversationId,
        },
      });
    }

    return {
      ok: true,
      blocked: false,
      id: msg.id,
      body: msg.body,
      senderRole: msg.senderRole,
      time: msg.createdAt.toISOString(),
    };
  }

  async markConversationRead(userId: string | undefined, conversationId: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const { side } = await this.assertParticipant(userId, conversationId);
    if (side === 'user') {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { userUnread: 0 },
      });
      await prisma.message.updateMany({
        where: { userId, conversationId, readAt: null },
        data: { readAt: new Date() },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { merchantUnread: 0 },
      });
      await prisma.message.updateMany({
        where: { userId, conversationId, readAt: null },
        data: { readAt: new Date() },
      });
    }
    return { ok: true };
  }

  async closeConversation(userId: string | undefined, conversationId: string) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const { conv } = await this.assertParticipant(userId, conversationId);
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'closed' },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId,
        senderUserId: userId,
        senderRole: 'system',
        type: 'system',
        body: '会话已关闭',
      },
    });
    return { ok: true, id: conv.id, status: 'closed' };
  }

  async reportFlag(
    userId: string | undefined,
    body: { chatMessageId?: string; conversationId?: string; reason?: string },
  ) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const reason = (body.reason || '').trim() || '用户举报';
    let conversationId = body.conversationId;
    if (body.chatMessageId) {
      const msg = await prisma.chatMessage.findUnique({ where: { id: body.chatMessageId } });
      if (!msg) throw new NotFoundException({ code: 'NOT_FOUND', message: '消息不存在' });
      conversationId = msg.conversationId;
      await this.assertParticipant(userId, conversationId);
      await prisma.chatMessage.update({
        where: { id: msg.id },
        data: { moderationStatus: 'flagged' },
      });
    } else if (conversationId) {
      await this.assertParticipant(userId, conversationId);
    } else {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少举报目标' });
    }

    const flag = await prisma.moderationFlag.create({
      data: {
        chatMessageId: body.chatMessageId || null,
        conversationId: conversationId || null,
        reason,
        status: 'open',
        reporterUserId: userId,
      },
    });
    return { ok: true, id: flag.id };
  }

  async moderationQueue() {
    const rows = await prisma.moderationFlag.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        chatMessage: true,
        conversation: { include: { merchant: { select: { name: true } }, user: { select: { nickname: true, phone: true } } } },
      },
    });
    return rows.map((f) => ({
      id: f.id,
      reason: f.reason,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      chatMessageId: f.chatMessageId,
      conversationId: f.conversationId,
      body: f.chatMessage?.body,
      merchantName: f.conversation?.merchant.name,
      userName: f.conversation?.user.nickname || f.conversation?.user.phone,
    }));
  }

  async resolveModeration(
    id: string,
    body: { action?: 'dismiss' | 'action'; note?: string },
  ) {
    const flag = await prisma.moderationFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException({ code: 'NOT_FOUND', message: '工单不存在' });
    const action = body.action || 'dismiss';
    const status = action === 'action' ? 'actioned' : 'dismissed';
    await prisma.moderationFlag.update({
      where: { id },
      data: {
        status,
        resolvedAt: new Date(),
        resolveNote: body.note || (action === 'action' ? '已屏蔽相关内容' : '已忽略'),
      },
    });
    if (action === 'action' && flag.chatMessageId) {
      await prisma.chatMessage.update({
        where: { id: flag.chatMessageId },
        data: { moderationStatus: 'blocked' },
      });
    }
    if (action === 'action' && flag.conversationId) {
      await prisma.conversation.update({
        where: { id: flag.conversationId },
        data: { status: 'closed' },
      });
    }
    return { ok: true, id, status };
  }

  private async assertParticipant(userId: string, conversationId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '用户不存在' });
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException({ code: 'NOT_FOUND', message: '会话不存在' });

    if (conv.userId === userId) {
      return { conv, side: 'user' as const, user };
    }
    if (user.role === 'merchant') {
      const owned = await prisma.merchant.findFirst({
        where: { id: conv.merchantId, ownerUserId: userId },
      });
      if (owned) return { conv, side: 'merchant' as const, user };
    }
    throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权访问该会话' });
  }

  private toConversationDto(c: Conversation, side: 'user' | 'merchant') {
    return {
      id: c.id,
      kind: c.kind,
      kindLabel: kindLabel(c.kind),
      status: c.status,
      merchantId: c.merchantId,
      userId: c.userId,
      bookingId: c.bookingId,
      listingId: (c as Conversation & { listingId?: string | null }).listingId ?? null,
      lastMsgAt: c.lastMsgAt?.toISOString() || null,
      lastPreview: c.lastPreview,
      unread: side === 'user' ? c.userUnread : c.merchantUnread,
      createdAt: c.createdAt.toISOString(),
    };
  }
}
