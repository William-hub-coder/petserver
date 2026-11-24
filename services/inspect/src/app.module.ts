import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { InspectController } from './inspect.controller';

@Module({
  controllers: [HealthController, InspectController],
})
export class AppModule {}
