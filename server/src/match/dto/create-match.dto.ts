import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlayerInfo } from '@shared/types';

export class TeamInfoDto {
  @ApiProperty({ description: '球队名称' })
  name: string;

  @ApiProperty({ description: '球队简称' })
  shortName: string;

  @ApiPropertyOptional({ description: '所属学院' })
  college?: string;

  @ApiProperty({ description: '球衣主颜色' })
  primaryColor: string;

  @ApiProperty({ description: '首发名单' })
  starters: PlayerInfo[];

  @ApiPropertyOptional({ description: '替补名单' })
  substitutes?: PlayerInfo[];
}

export class CreateMatchDto {
  @ApiProperty({ description: '赛事标题' })
  title: string;

  @ApiProperty({ description: '赛事名称' })
  competitionName: string;

  @ApiProperty({ description: '比赛场地' })
  venue: string;

  @ApiProperty({ description: '赛制', enum: ['8_aside', '11_aside'] })
  matchType: '8_aside' | '11_aside';

  @ApiProperty({ description: '主队信息' })
  homeTeam: TeamInfoDto;

  @ApiProperty({ description: '客队信息' })
  awayTeam: TeamInfoDto;
}
