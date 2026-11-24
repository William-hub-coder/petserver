import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { AgentMemoryService } from './agent-memory.service';

@Controller('messages/ai')
export class AgentMemoryController {
  constructor(private readonly memory: AgentMemoryService) {}

  @Post('sessions/touch')
  async touch(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { userId?: string; guestKey?: string; sessionId?: string },
  ) {
    const data = await this.memory.touch({
      userId: body.userId || userId,
      guestKey: body.guestKey,
      sessionId: body.sessionId,
    });
    return { code: ErrorCode.OK, data };
  }

  @Get('sessions/:id/messages')
  async listMessages(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('guestKey') guestKey?: string,
  ) {
    const data = await this.memory.listMessages(id, {
      userId,
      guestKey,
      limit: limit ? Number(limit) : 20,
    });
    return { code: ErrorCode.OK, data };
  }

  @Post('sessions/:id/messages')
  async append(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body()
    body: {
      role?: string;
      content?: string;
      intent?: string;
      meta?: Record<string, unknown>;
      guestKey?: string;
    },
  ) {
    const data = await this.memory.appendMessage(id, {
      ...body,
      userId,
      guestKey: body.guestKey,
    });
    return { code: ErrorCode.OK, data };
  }

  @Patch('sessions/:id')
  async patch(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body() body: { summary?: string; guestKey?: string },
  ) {
    const data = await this.memory.patchSession(id, {
      summary: body.summary,
      userId,
      guestKey: body.guestKey,
    });
    return { code: ErrorCode.OK, data };
  }

  @Post('sessions/merge')
  async merge(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { guestKey?: string; userId?: string },
  ) {
    const data = await this.memory.merge({
      userId: body.userId || userId,
      guestKey: body.guestKey,
    });
    return { code: ErrorCode.OK, data };
  }
}
