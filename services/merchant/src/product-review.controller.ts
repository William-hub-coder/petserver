import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { ProductReviewService } from './product-review.service';

@Controller()
export class ProductReviewController {
  constructor(private readonly reviews: ProductReviewService) {}

  @Get('products/review-tags')
  tags() {
    return { code: ErrorCode.OK, data: this.reviews.allowedTags() };
  }

  @Get('products/:id/reviews')
  async list(
    @Param('id') id: string,
    @Query('filter') filter?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.reviews.list(id, { filter, page, pageSize });
    return { code: ErrorCode.OK, data };
  }

  @Post('product-reviews')
  async create(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { orderItemId?: string; rating?: number; content?: string; tags?: string[] },
  ) {
    const data = await this.reviews.create(userId, body);
    return { code: ErrorCode.OK, data };
  }

  @Post('product-reviews/:id/helpful')
  async helpful(@Param('id') id: string) {
    const data = await this.reviews.markHelpful(id);
    return { code: ErrorCode.OK, data };
  }
}
