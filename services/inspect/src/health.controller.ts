import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@petpal/shared';

@Controller()
export class HealthController {
  @Get('health')
  health(): HealthResponse {
    return {
      service: 'inspect',
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }
}
