import { Module } from '@nestjs/common';
import { MatchLiveController } from './match-live.controller';
import { MatchLiveService } from './match-live.service';

@Module({
  controllers: [MatchLiveController],
  providers: [MatchLiveService],
  exports: [MatchLiveService],
})
export class MatchModule {}
