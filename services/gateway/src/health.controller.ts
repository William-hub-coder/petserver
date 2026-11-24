import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@petpal/shared';
import { ProxyService } from './proxy.service';

@Controller()
export class HealthController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('health')
  health(): HealthResponse {
    return {
      service: 'gateway',
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }

  @Get('health/deps')
  async deps() {
    return this.proxy.checkDeps();
  }
}
