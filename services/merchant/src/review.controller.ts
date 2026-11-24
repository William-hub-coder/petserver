import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { ReviewService } from './review.service';

@Controller()
export class ReviewController {
  constructor(private readonly reviews: ReviewService) {}

  @Get('reviews/tags')
  tags() {
    return { code: ErrorCode.OK, data: this.reviews.allowedTags() };
  }

  @Post('reviews')
  async create(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { bookingId?: string; rating?: number; content?: string; tags?: string[] },
  ) {
    if (!userId) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    const data = await this.reviews.create(userId, body);
    return { code: ErrorCode.OK, data };
  }

  @Post('reviews/:id/helpful')
  async helpful(@Param('id') id: string) {
    const data = await this.reviews.markHelpful(id);
    return { code: ErrorCode.OK, data };
  }

  @Get('merchants/:id/reviews')
  async list(
    @Param('id') id: string,
    @Query('filter') filter?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.reviews.listByMerchant(id, { filter, page, pageSize });
    return { code: ErrorCode.OK, data };
  }
}
