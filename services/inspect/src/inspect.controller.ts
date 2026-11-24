import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';

@Controller('inspect')
export class InspectController {
  @Get('tasks')
  tasks() {
    return {
      code: ErrorCode.OK,
      data: [
        {
          id: 'task_shell_1',
          merchantAlias: '商户-A12',
          category: 'hospital',
          status: 'assigned',
          checkInRequired: true,
        },
      ],
      note: 'Inspect task shell — blind review aliases only',
    };
  }

  @Post('tasks/:id/check-in')
  checkIn(@Param('id') id: string, @Body() body: { lat?: number; lng?: number }) {
    return {
      code: ErrorCode.OK,
      data: {
        taskId: id,
        checkedInAt: new Date().toISOString(),
        lat: body.lat,
        lng: body.lng,
        bssidVerified: false,
        note: 'Check-in / BSSID verification stub',
      },
    };
  }

  @Get('reviews/queue')
  reviewQueue() {
    return {
      code: ErrorCode.OK,
      data: [
        {
          id: 'review_shell_1',
          merchantAlias: '商户-B07',
          scorePreview: 82,
          status: 'pending_blind_review',
        },
      ],
    };
  }

  @Get('credit/:merchantId')
  credit(@Param('merchantId') merchantId: string) {
    return {
      code: ErrorCode.OK,
      data: {
        merchantId,
        score: 85,
        grade: 'A',
        formula:
          'inspect40% + userReview25% + fulfillment20% + mystery10% - compliance',
        note: 'Credit score engine stub',
      },
    };
  }
}
