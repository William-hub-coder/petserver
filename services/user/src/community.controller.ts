import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { CommunityService } from './community.service';

@Controller('users/community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('posts')
  async list(
    @Query('category') category?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const data = await this.community.listPosts({
      category,
      cursor,
      limit: limit ? Number(limit) : undefined,
      userId,
    });
    return { code: ErrorCode.OK, data };
  }

  @Get('posts/:id')
  async detail(@Param('id') id: string, @Headers('x-user-id') userId?: string) {
    const data = await this.community.getPost(id, userId);
    return { code: ErrorCode.OK, data };
  }

  @Post('posts')
  async create(
    @Headers('x-user-id') userId: string | undefined,
    @Body()
    body: {
      title?: string;
      content?: string;
      category?: string;
      mediaType?: string;
      mediaUrls?: string[];
      coverUrl?: string;
    },
  ) {
    const data = await this.community.createPost(userId, body);
    return { code: ErrorCode.OK, data };
  }

  @Post('posts/:id/like')
  async like(@Param('id') id: string, @Headers('x-user-id') userId?: string) {
    const data = await this.community.toggleLike(userId, id);
    return { code: ErrorCode.OK, data };
  }

  @Get('posts/:id/comments')
  async comments(@Param('id') id: string) {
    const data = await this.community.listComments(id);
    return { code: ErrorCode.OK, data };
  }

  @Post('posts/:id/comments')
  async addComment(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { content?: string },
  ) {
    const data = await this.community.addComment(userId, id, body.content);
    return { code: ErrorCode.OK, data };
  }
}
