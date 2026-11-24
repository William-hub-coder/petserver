import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { PetListingService } from './pet-listing.service';

@Controller('pet-listings')
export class PetListingController {
  constructor(private readonly listings: PetListingService) {}

  @Get()
  async list(
    @Query('channel') channel?: string,
    @Query('city') city?: string,
    @Query('species') species?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const data = await this.listings.list({
      channel,
      city,
      species,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
    });
    return { code: ErrorCode.OK, data };
  }

  @Get('map')
  async map(@Query('channel') channel?: string, @Query('city') city?: string) {
    const data = await this.listings.mapPoints({ channel, city });
    return { code: ErrorCode.OK, data };
  }

  @Get('moderation/queue')
  async moderationQueue() {
    const data = await this.listings.moderationQueue();
    return { code: ErrorCode.OK, data };
  }

  @Post('moderation/:id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() body: { action?: 'approve' | 'reject'; note?: string },
  ) {
    const data = await this.listings.resolve(id, body);
    return { code: ErrorCode.OK, data };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const data = await this.listings.detail(id);
    return { code: ErrorCode.OK, data };
  }

  @Post()
  async create(@Headers('x-user-id') userId: string | undefined, @Body() body: Record<string, unknown>) {
    const data = await this.listings.create(userId, body as never);
    return { code: ErrorCode.OK, data };
  }

  @Post(':id/apply')
  async apply(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body() body: { motive?: string; experience?: string; acceptHomeVisit?: boolean },
  ) {
    const data = await this.listings.apply(userId, id, body);
    return { code: ErrorCode.OK, data };
  }

  @Post(':id/contact')
  async contact(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.listings.contact(userId, id);
    return { code: ErrorCode.OK, data };
  }
}
