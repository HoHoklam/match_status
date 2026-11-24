import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { LiveActionType } from '@shared/types';

export class SubmitLiveActionDto {
  @ApiProperty({
    description: '动作类型',
    enum: [
      'GOAL',
      'PENALTY',
      'OWN_GOAL',
      'YELLOW_CARD',
      'RED_CARD',
      'SUBSTITUTION',
      'SHOT',
      'SHOT_ON_TARGET',
      'CORNER',
      'FREE_KICK',
      'FOUL',
    ],
  })
  @IsString()
  type: LiveActionType;

  @ApiProperty({ description: '归属方', enum: ['home', 'away'] })
  @IsIn(['home', 'away'])
  side: 'home' | 'away';

  @ApiPropertyOptional({
    description: '进球细分类型',
    enum: ['regular', 'penalty', 'penalty_missed', 'own_goal'],
  })
  @IsOptional()
  @IsString()
  goalType?: import('@shared/types').GoalType;

  @ApiPropertyOptional({ description: '发生分钟数' })
  @IsOptional()
  @IsNumber()
  minute?: number;

  @ApiPropertyOptional({ description: '发生具体时间点 (如 36:20)' })
  @IsOptional()
  @IsString()
  secondFormatted?: string;

  @ApiPropertyOptional({ description: '当事球员姓名' })
  @IsOptional()
  @IsString()
  playerName?: string;

  @ApiPropertyOptional({ description: '当事球员球衣号码' })
  @IsOptional()
  @IsNumber()
  playerNumber?: number;

  @ApiPropertyOptional({ description: '助攻球员姓名（进球专属）' })
  @IsOptional()
  @IsString()
  assistPlayerName?: string;

  @ApiPropertyOptional({ description: '换上球员姓名（换人专属）' })
  @IsOptional()
  @IsString()
  subInPlayerName?: string;

  @ApiPropertyOptional({ description: '换下球员姓名（换人专属）' })
  @IsOptional()
  @IsString()
  subOutPlayerName?: string;

  @ApiPropertyOptional({ description: '出牌原因' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '是否同时记录射正' })
  @IsOptional()
  isShotOnTarget?: boolean;

  @ApiPropertyOptional({ description: '常规时间点球是否罚进' })
  @IsOptional()
  penaltyScored?: boolean;
}
