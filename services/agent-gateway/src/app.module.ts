import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { BizClient } from './biz.client';
import { HealthController } from './health.controller';
import { MemoryClient } from './memory.client';
import { OrchestratorClient } from './orchestrator.client';

@Module({
  controllers: [HealthController, AgentController],
  providers: [OrchestratorClient, MemoryClient, BizClient],
})
export class AppModule {}
