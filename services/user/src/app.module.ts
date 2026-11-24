import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  controllers: [HealthController, UserController, CommunityController],
  providers: [UserService, CommunityService],
})
export class AppModule {}
