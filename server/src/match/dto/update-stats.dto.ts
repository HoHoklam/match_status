import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString } from 'class-validator';

export class UpdateStatsDeltaDto {
  @ApiProperty({
    description: '统计项标识',
    enum: ['shots', 'shotsOnTarget', 'cornerKicks', 'freeKicks', 'fouls', 'yellowCards', 'redCards'],
  })
  @IsString()
  statKey: 'shots' | 'shotsOnTarget' | 'cornerKicks' | 'freeKicks' | 'fouls' | 'yellowCards' | 'redCards';

  @ApiProperty({ description: '归属方', enum: ['home', 'away'] })
  @IsIn(['home', 'away'])
  side: 'home' | 'away';

  @ApiProperty({ description: '增减量 (如 1 或 -1)' })
  @IsNumber()
  delta: number;
}
