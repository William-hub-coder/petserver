import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, MerchantStatus, prisma } from '@petpal/db';
import { randomBytes } from 'crypto';
import { AmapClient } from './amap.client';

/**
 * 预约履约核心服务（merchant 微服务内）。
 *
 * ## 状态流转（BookingStatus）
 * ```
 * confirmed/pending
 *   ├─(onsite)──────────► verify() 商家核销 ──► verified ──► 评价 reviewed
 *   ├─(online_consult)──► completeByUser() ──► verified ──► 评价 reviewed
 *   ├─(home_visit)──────► completeByUser() ──► verified ──► 评价 reviewed
 *   └─ cancel() ───────► cancelled
 * ```
 *
 * ## channel 与 kind
 * - 创建订单时 **只认** `MerchantService.kind`，写入 `Booking.channel`（防前端伪造渠道）。
 * - `onsite`：到店服务，用户出示核销码，商家 `POST /bookings/verify`。
 * - `online_consult`：线上问诊；创建必填 `note`（症状）；用户 `POST /bookings/:id/complete`。
 *   产品价通常为 ¥5 服务费（见 seed-extra-services），结束后酌情补收暂未做自动计费。
 * - `home_visit`：上门服务；创建必填 `address`；同样由用户 complete。
 *
 * ## 金额
 * `amountCents` 直接取服务当前标价快照；问诊「先收 5 元、后补差」的补差需后续单独建模。
 */
@Injectable()
export class BookingService {
  constructor(private readonly amap: AmapClient) {}

  /**
   * 创建预约。
   * @param userId 网关注入的 x-user-id
   * @param body.address 上门地址（仅 home_visit 强制）
   * @param body.note 问诊症状或上门备注（online_consult 强制）
   */
  async create(
    userId: string,
    body: {
      merchantId?: string;
      serviceId?: string;
      petId?: string;
      bookingAt?: string;
      address?: string;
      note?: string;
    },
  ) {
    if (!body.merchantId || !body.serviceId || !body.bookingAt) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少预约参数' });
    }
    const merchant = await prisma.merchant.findUnique({ where: { id: body.merchantId } });
    if (!merchant || merchant.status !== MerchantStatus.online) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '商户不可预约' });
    }
    const service = await prisma.merchantService.findFirst({
      where: { id: body.serviceId, merchantId: body.merchantId, enabled: true },
    });
    if (!service) throw new BadRequestException({ code: 'BAD_REQUEST', message: '服务项无效' });

    // 履约渠道跟服务类型走，避免前端伪造 channel
    const channel = service.kind || 'onsite';
    if (channel === 'home_visit' && !(body.address || '').trim()) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '上门服务请填写上门地址' });
    }
    if (channel === 'online_consult' && !(body.note || '').trim()) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: '线上问诊请简要描述症状/咨询问题',
      });
    }

    // 核销码：短 hex，到店扫码 / 凭证展示共用；线上/上门也可查看但完成不依赖扫码
    const verifyCode = randomBytes(4).toString('hex').toUpperCase();

    // 上门：地址 geocode 为爱宠服务点坐标，供 live 地图使用
    let destLat: number | null = null;
    let destLng: number | null = null;
    let servicePhase: string | null = null;
    if (channel === 'home_visit') {
      const g = await this.amap.geocode(body.address!.trim());
      destLat = g.lat;
      destLng = g.lng;
      servicePhase = 'en_route';
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        merchantId: body.merchantId,
        serviceId: body.serviceId,
        petId: body.petId || null,
        // MVP：创建即 confirmed（跳过商家接单 pending）；后续可接商家确认
        status: BookingStatus.confirmed,
        bookingAt: new Date(body.bookingAt),
        verifyCode,
        amountCents: service.priceCents,
        channel,
        addressSnapshot: body.address?.trim() || null,
        note: body.note?.trim() || null,
        destLat,
        destLng,
        servicePhase,
      },
      include: { merchant: true, service: true },
    });

    // 站内信：按渠道差异化文案，方便消息中心展示下一步动作
    const tip =
      channel === 'online_consult'
        ? `已预约线上问诊「${booking.service.name}」。请在预约时段准备好症状描述；本服务为健康咨询与分诊，不开处方，急症请线下就医。`
        : channel === 'home_visit'
          ? `已预约上门服务「${booking.service.name}」，服务地址：${booking.addressSnapshot}。请留意服务人员联系。`
          : `已预约「${booking.merchant.name}」${booking.service.name}，请准时到店并出示核销码。`;

    await prisma.message.create({
      data: {
        userId,
        title:
          channel === 'online_consult'
            ? '线上问诊预约成功'
            : channel === 'home_visit'
              ? '上门服务预约成功'
              : '预约成功',
        body: tip,
        type: 'order',
      },
    });

    // 线上问诊：同库直写打开 doctor_consult 会话 + 系统消息 + 会话提醒站内信
    if (channel === 'online_consult') {
      await this.openDoctorConsultConversation(booking);
    }

    // 创建响应带核销码，便于前端立刻展示（到店场景）
    return this.toDto(booking, true);
  }

  /** 问诊预约成功后开会话（与 message 服务逻辑对齐，避免跨服务 HTTP 依赖） */
  private async openDoctorConsultConversation(booking: {
    id: string;
    userId: string;
    merchantId: string;
    note: string | null;
    merchant: { name: string; ownerUserId: string | null };
    service: { name: string };
  }) {
    const existing = await prisma.conversation.findUnique({ where: { bookingId: booking.id } });
    if (existing) return existing;

    const conv = await prisma.conversation.create({
      data: {
        kind: 'doctor_consult',
        userId: booking.userId,
        merchantId: booking.merchantId,
        bookingId: booking.id,
        lastMsgAt: new Date(),
        lastPreview: '问诊会话已开启',
        merchantUnread: booking.merchant.ownerUserId ? 1 : 0,
      },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderUserId: booking.userId,
        senderRole: 'system',
        type: 'system',
        body: `「${booking.merchant.name}」线上问诊已开启。本服务为健康咨询与分诊，不开处方；急症请线下就医。症状：${booking.note || '（未填写）'}`,
      },
    });
    await prisma.message.create({
      data: {
        userId: booking.userId,
        title: '问诊会话已开启',
        body: `可在消息中心与「${booking.merchant.name}」继续沟通。`,
        type: 'chat',
        conversationId: conv.id,
      },
    });
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
    }
    return conv;
  }

  /**
   * 列表：普通用户看自己的单；role=merchant 看名下门店的单（含核销码，方便店端操作）。
   */
  async list(userId: string, role?: string) {
    if (role === 'merchant') {
      const owned = await prisma.merchant.findMany({
        where: { ownerUserId: userId },
        select: { id: true },
      });
      const ids = owned.map((m) => m.id);
      const rows = await prisma.booking.findMany({
        where: { merchantId: { in: ids } },
        include: { merchant: true, service: true, user: true },
        orderBy: { bookingAt: 'desc' },
      });
      return rows.map((b) => this.toDto(b, true));
    }

    const rows = await prisma.booking.findMany({
      where: { userId },
      include: { merchant: true, service: true },
      orderBy: { bookingAt: 'desc' },
    });
    return rows.map((b) => this.toDto(b, true));
  }

  async get(userId: string, id: string, role?: string) {
    const b = await prisma.booking.findUnique({
      where: { id },
      include: { merchant: true, service: true },
    });
    if (!b) throw new NotFoundException({ code: 'NOT_FOUND', message: '预约不存在' });
    const isOwner = b.userId === userId;
    const isMerchant = role === 'merchant' && b.merchant.ownerUserId === userId;
    if (!isOwner && !isMerchant) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权查看' });
    }
    return this.toDto(b, true);
  }

  /**
   * 核销码/凭证载荷。
   * qrPayload 格式：`PETPAL:{bookingId}:{verifyCode}`，商家端可扫完整串或只输后半段码。
   */
  async qrcode(userId: string, id: string) {
    const b = await prisma.booking.findUnique({ where: { id }, include: { service: true } });
    if (!b) throw new NotFoundException({ code: 'NOT_FOUND', message: '预约不存在' });
    if (b.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权查看' });
    if (b.status === BookingStatus.cancelled) {
      throw new ConflictException({ code: 'CONFLICT', message: '预约已取消' });
    }
    return {
      bookingId: b.id,
      verifyCode: b.verifyCode,
      qrPayload: `PETPAL:${b.id}:${b.verifyCode}`,
      status: b.status,
      channel: b.channel,
      label:
        b.channel === 'online_consult'
          ? '问诊凭证码'
          : b.channel === 'home_visit'
            ? '上门服务核销码'
            : '到店核销码',
    };
  }

  async cancel(userId: string, id: string) {
    const b = await prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'NOT_FOUND', message: '预约不存在' });
    if (b.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权操作' });
    if (b.status !== BookingStatus.pending && b.status !== BookingStatus.confirmed) {
      throw new ConflictException({ code: 'CONFLICT', message: '当前状态不可取消' });
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.cancelled, cancelledAt: new Date() },
      include: { merchant: true, service: true },
    });
    return this.toDto(updated);
  }

  /**
   * 用户确认「线上问诊 / 上门服务」已完成。
   *
   * - 仅允许 channel ∈ {online_consult, home_visit}；到店必须走 {@link verify}。
   * - 成功后状态变为 `verified`，与商家核销同态，以便复用评价接口。
   * - 幂等：已 verified/reviewed 时返回 alreadyVerified=true，不报错。
   */
  async completeByUser(userId: string, id: string) {
    const b = await prisma.booking.findUnique({
      where: { id },
      include: { merchant: true, service: true },
    });
    if (!b) throw new NotFoundException({ code: 'NOT_FOUND', message: '预约不存在' });
    if (b.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权操作' });
    if (!['online_consult', 'home_visit'].includes(b.channel)) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '到店服务请由商家核销' });
    }
    if (b.status === BookingStatus.verified || b.status === BookingStatus.reviewed) {
      return { ...this.toDto(b, true), alreadyVerified: true };
    }
    if (b.status !== BookingStatus.confirmed && b.status !== BookingStatus.pending) {
      throw new ConflictException({ code: 'CONFLICT', message: '当前状态不可完成' });
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.verified, verifiedAt: new Date() },
      include: { merchant: true, service: true },
    });
    await prisma.message.create({
      data: {
        userId,
        title: '服务已完成，邀请评价',
        body: `「${b.service.name}」已完成，去评价帮助更多铲屎官吧。`,
        type: 'order',
      },
    });
    return { ...this.toDto(updated, true), alreadyVerified: false };
  }

  /**
   * 商家核销（到店主路径）。
   * code 可为纯 verifyCode，或扫码得到的 `PETPAL:id:code`（取最后一段）。
   * 校验：码存在 + 当前登录用户是该单商户的 ownerUserId。
   */
  async verify(merchantUserId: string, code?: string) {
    if (!code?.trim()) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '缺少核销码' });
    }
    const raw = code.trim().toUpperCase();
    const verifyCode = raw.includes(':') ? raw.split(':').pop()! : raw;

    const booking = await prisma.booking.findFirst({
      where: { verifyCode },
      include: { merchant: true, service: true },
    });
    if (!booking) throw new NotFoundException({ code: 'NOT_FOUND', message: '核销码无效' });
    if (booking.merchant.ownerUserId !== merchantUserId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: '非本店预约' });
    }

    if (booking.status === BookingStatus.verified || booking.status === BookingStatus.reviewed) {
      return { ...this.toDto(booking), alreadyVerified: true };
    }
    if (booking.status !== BookingStatus.confirmed && booking.status !== BookingStatus.pending) {
      throw new ConflictException({ code: 'CONFLICT', message: `状态 ${booking.status} 不可核销` });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.verified, verifiedAt: new Date() },
      include: { merchant: true, service: true },
    });

    await prisma.message.create({
      data: {
        userId: booking.userId,
        title: '服务核销成功，邀请评价',
        body: `「${booking.merchant.name}」服务已完成，去评价帮助更多铲屎官吧。`,
        type: 'order',
      },
    });

    return { ...this.toDto(updated), alreadyVerified: false };
  }

  /**
   * 统一对外 DTO。
   * - DB 字段 addressSnapshot 对外映射为 `address`，降低前端心智负担。
   * - withCode=false 时可隐藏核销码（当前 list/get 仍多传 true，便于店端/用户端展示）。
   */
  private toDto(
    b: {
      id: string;
      userId: string;
      merchantId: string;
      serviceId: string;
      petId: string | null;
      status: BookingStatus;
      bookingAt: Date;
      verifyCode: string;
      amountCents: number;
      verifiedAt: Date | null;
      channel?: string;
      addressSnapshot?: string | null;
      note?: string | null;
      merchant?: { name: string };
      service?: { name: string; kind?: string };
    },
    withCode = false,
  ) {
    // 兼容旧数据：若 channel 未写，回退到服务 kind
    const channel = b.channel || b.service?.kind || 'onsite';
    return {
      id: b.id,
      userId: b.userId,
      merchantId: b.merchantId,
      merchantName: b.merchant?.name,
      serviceId: b.serviceId,
      serviceName: b.service?.name,
      petId: b.petId,
      status: b.status,
      bookingAt: b.bookingAt.toISOString(),
      verifyCode: withCode ? b.verifyCode : undefined,
      amountCents: b.amountCents,
      verifiedAt: b.verifiedAt?.toISOString() ?? null,
      channel,
      address: b.addressSnapshot || null,
      note: b.note || null,
      destLat: (b as { destLat?: number | null }).destLat ?? null,
      destLng: (b as { destLng?: number | null }).destLng ?? null,
      servicePhase: (b as { servicePhase?: string | null }).servicePhase ?? null,
    };
  }
}
