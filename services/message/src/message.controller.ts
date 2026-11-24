import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { MessageService } from './message.service';

@Controller('messages')
export class MessageController {
  constructor(private readonly messages: MessageService) {}

  @Get('inbox')
  async inbox(@Headers('x-user-id') userId?: string) {
    const data = await this.messages.inbox(userId);
    return { code: ErrorCode.OK, data };
  }

  @Post('inbox/:id/read')
  async markInboxRead(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.messages.markInboxRead(userId, id);
    return { code: ErrorCode.OK, data };
  }

  @Get('unread-summary')
  async unreadSummary(@Headers('x-user-id') userId?: string) {
    const data = await this.messages.unreadSummary(userId);
    return { code: ErrorCode.OK, data };
  }

  @Post('dispatch')
  async dispatch(
    @Body()
    body: {
      userId?: string;
      title?: string;
      body?: string;
      type?: 'system' | 'order' | 'marketing' | 'chat';
      conversationId?: string;
    },
  ) {
    const data = await this.messages.dispatch(body);
    return { code: ErrorCode.OK, data };
  }

  @Get('templates')
  async templates() {
    const data = await this.messages.templates();
    return { code: ErrorCode.OK, data };
  }

  @Post('conversations')
  async createConversation(
    @Headers('x-user-id') userId: string | undefined,
    @Body()
    body: {
      kind?: 'merchant_support' | 'doctor_consult' | 'mall_support' | 'adoption';
      merchantId?: string;
      bookingId?: string;
      listingId?: string;
    },
  ) {
    const data = await this.messages.createOrGetConversation(userId, body);
    return { code: ErrorCode.OK, data };
  }

  @Get('conversations')
  async listConversations(@Headers('x-user-id') userId?: string) {
    const data = await this.messages.listConversations(userId);
    return { code: ErrorCode.OK, data };
  }

  @Get('conversations/:id/messages')
  async listMessages(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
  ) {
    const data = await this.messages.listMessages(userId, id, cursor);
    return { code: ErrorCode.OK, data };
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body() body: { body?: string },
  ) {
    const data = await this.messages.sendMessage(userId, id, body);
    return { code: ErrorCode.OK, data };
  }

  @Post('conversations/:id/read')
  async markRead(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.messages.markConversationRead(userId, id);
    return { code: ErrorCode.OK, data };
  }

  @Post('conversations/:id/close')
  async close(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.messages.closeConversation(userId, id);
    return { code: ErrorCode.OK, data };
  }

  @Post('flags')
  async flags(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { chatMessageId?: string; conversationId?: string; reason?: string },
  ) {
    const data = await this.messages.reportFlag(userId, body);
    return { code: ErrorCode.OK, data };
  }

  @Get('moderation/queue')
  async moderationQueue() {
    const data = await this.messages.moderationQueue();
    return { code: ErrorCode.OK, data };
  }

  @Post('moderation/:id/resolve')
  async resolveModeration(
    @Param('id') id: string,
    @Body() body: { action?: 'dismiss' | 'action'; note?: string },
  ) {
    const data = await this.messages.resolveModeration(id, body);
    return { code: ErrorCode.OK, data };
  }
}
