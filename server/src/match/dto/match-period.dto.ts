import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { MatchPeriod, PossessionSide } from '@shared/types';

export class ChangeClockPeriodDto {
  @ApiProperty({
    description: '比赛阶段',
    enum: ['NOT_STARTED', 'FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'FINISHED', 'PAUSED'],
  })
  @IsIn(['NOT_STARTED', 'FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'FINISHED', 'PAUSED'])
  period: MatchPeriod;

  @ApiPropertyOptional({ description: '中场确认或微调时的分钟数' })
  @IsOptional()
  @IsNumber()
  confirmedMinute?: number;

  @ApiPropertyOptional({ description: '重置时的指定秒数' })
  @IsOptional()
  @IsNumber()
  resetSecond?: number;

  @ApiPropertyOptional({ description: '当前走字秒数' })
  @IsOptional()
  @IsNumber()
  currentSecond?: number;

  @ApiPropertyOptional({ description: '盘面格式化显示时间 (如 36:20)' })
  @IsOptional()
  displayTime?: string;

  @ApiPropertyOptional({ description: '完赛时附带的点球大战数据' })
  @IsOptional()
  penaltyShootout?: any;
}

export class UpdatePenaltyShootoutDto {
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  homeScore: number;

  @IsNumber()
  awayScore: number;

  @IsOptional()
  winnerSide?: 'home' | 'away' | null;

  @IsNumber()
  roundsCount: number;

  homeKicks: any[];
  awayKicks: any[];

  @IsOptional()
  isCompleted?: boolean;
}

export class SwitchPossessionDto {
  @ApiProperty({ description: '持球方', enum: ['home', 'away', 'neutral'] })
  @IsIn(['home', 'away', 'neutral'])
  side: PossessionSide;

  @ApiPropertyOptional({ description: '主队累计持球秒数校准' })
  @IsOptional()
  @IsNumber()
  homeSeconds?: number;

  @ApiPropertyOptional({ description: '客队累计持球秒数校准' })
  @IsOptional()
  @IsNumber()
  awaySeconds?: number;

  @ApiPropertyOptional({ description: '当前走字秒数' })
  @IsOptional()
  @IsNumber()
  currentSecond?: number;

  @ApiPropertyOptional({ description: '盘面格式化显示时间 (如 36:20)' })
  @IsOptional()
  displayTime?: string;

  @ApiPropertyOptional({ description: '盘面显示比赛分钟' })
  @IsOptional()
  @IsNumber()
  displayMinute?: number;
}
