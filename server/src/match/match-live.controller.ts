import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MatchLiveService } from './match-live.service';
import { SubmitLiveActionDto } from './dto/live-action.dto';
import { ChangeClockPeriodDto, SwitchPossessionDto } from './dto/match-period.dto';
import { UpdateStatsDeltaDto } from './dto/update-stats.dto';
import { MatchLiveSnapshot } from '@shared/types';

@ApiTags('足球赛况与现场记录')
@Controller('matches')
export class MatchLiveController {
  constructor(private readonly liveService: MatchLiveService) {}

  @Get()
  @ApiOperation({ summary: '获取全部比赛赛程列表' })
  public getMatches(): MatchLiveSnapshot[] {
    return this.liveService.getMatches();
  }

  @Get(':id/live')
  @ApiOperation({ summary: '获取指定比赛实时赛况（时钟、比分、统计、时间线）' })
  public getLiveSnapshot(@Param('id') id: string): MatchLiveSnapshot {
    return this.liveService.getLiveSnapshot(id);
  }

  @Patch(':id/live/clock')
  @ApiOperation({ summary: '控制比赛时钟（开始/中场确认/下半场/完赛/暂停）' })
  public updateClock(
    @Param('id') id: string,
    @Body() dto: ChangeClockPeriodDto,
  ): MatchLiveSnapshot {
    return this.liveService.updateClock(id, dto);
  }

  @Post(':id/live/possession')
  @ApiOperation({ summary: '切换当前持球方 (home/away/neutral)' })
  public switchPossession(
    @Param('id') id: string,
    @Body() dto: SwitchPossessionDto,
  ): MatchLiveSnapshot {
    return this.liveService.switchPossession(id, dto);
  }

  @Post(':id/live/action')
  @ApiOperation({ summary: '提交现场动作（重大事件进时间线，纯统计动作累加数据）' })
  public recordAction(
    @Param('id') id: string,
    @Body() dto: SubmitLiveActionDto,
  ): MatchLiveSnapshot {
    return this.liveService.recordAction(id, dto);
  }

  @Patch(':id/live/stats')
  @ApiOperation({ summary: '手动微调指定技术统计数值 (+1/-1)' })
  public updateStatsDelta(
    @Param('id') id: string,
    @Body() dto: UpdateStatsDeltaDto,
  ): MatchLiveSnapshot {
    return this.liveService.updateStatsDelta(id, dto);
  }

  @Patch(':id/live/penalty-shootout')
  @ApiOperation({ summary: '更新点球大战轮次、球员与比分状态' })
  public updatePenaltyShootout(
    @Param('id') id: string,
    @Body() dto: any,
  ): MatchLiveSnapshot {
    return this.liveService.updatePenaltyShootout(id, dto);
  }

  @Delete(':id/live/events/:eventId')
  @ApiOperation({ summary: '删除时间线事件（自动回扣比分与关联统计）' })
  public deleteTimelineEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
  ): MatchLiveSnapshot {
    return this.liveService.deleteTimelineEvent(id, eventId);
  }

  @Post()
  @ApiOperation({ summary: '创建新比赛（包含8人制/11人制名单及球队信息）' })
  public createMatch(@Body() dto: any): MatchLiveSnapshot {
    return this.liveService.createMatch(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '修改未开赛比赛的主客队信息与名单配置' })
  public updateMatch(
    @Param('id') id: string,
    @Body() dto: any,
  ): MatchLiveSnapshot {
    return this.liveService.updateMatch(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除比赛（支持未开赛、误触创建等比赛移除）' })
  public deleteMatch(@Param('id') id: string): { success: boolean; id: string } {
    return this.liveService.deleteMatch(id);
  }

  @Post(':id/live/undo')
  @ApiOperation({ summary: '一键撤销上一步操作 (30步快照回滚)' })
  public undo(@Param('id') id: string): MatchLiveSnapshot {
    return this.liveService.undo(id);
  }

  @Post(':id/live/reset')
  @ApiOperation({ summary: '重置比赛为初始模拟状态' })
  public reset(@Param('id') id: string): MatchLiveSnapshot {
    return this.liveService.reset(id);
  }
}
