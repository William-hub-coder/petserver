import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@petpal/shared';
import { OrchestratorClient } from './orchestrator.client';

@Controller()
export class HealthController {
  constructor(private readonly orchestrator: OrchestratorClient) {}

  @Get('health')
  health(): HealthResponse {
    return {
      service: 'agent-gateway',
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  }

  /** 深健康：探测 orchestrator，供启动脚本与 gateway 依赖检查 */
  @Get('health/deep')
  async deep() {
    const orch = await this.orchestrator.ping();
    return {
      service: 'agent-gateway',
      status: orch.ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      orchestrator: {
        url: process.env.ORCHESTRATOR_URL ?? 'http://localhost:8000',
        ...orch,
      },
    };
  }
}
