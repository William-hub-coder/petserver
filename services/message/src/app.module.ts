import { Module } from '@nestjs/common';
import { AgentMemoryController } from './agent-memory.controller';
import { AgentMemoryService } from './agent-memory.service';
import { HealthController } from './health.controller';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  controllers: [HealthController, MessageController, AgentMemoryController],
  providers: [MessageService, AgentMemoryService],
})
export class AppModule {}
