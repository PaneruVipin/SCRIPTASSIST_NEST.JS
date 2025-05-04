import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TaskStatsResponseDto {
  @ApiProperty({ example: 100 })
  @Expose()
  total: number;

  @ApiProperty({ example: 60 })
  @Expose()
  completed: number;

  @ApiProperty({ example: 25 })
  @Expose()
  inProgress: number;

  @ApiProperty({ example: 15 })
  @Expose()
  pending: number;

  @ApiProperty({ example: 20 })
  @Expose()
  highPriority: number;
}
