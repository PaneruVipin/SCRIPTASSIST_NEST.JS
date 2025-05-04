import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskAction } from '../enums/task-action.enum';

class BatchTaskResultDto {
  @ApiProperty({ example: '8d4224d1-c583-40d0-9600-121e85336efb' })
  @Expose()
  id: string;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.COMPLETED })
  @Expose()
  status: TaskStatus;
}

export class BatchProcessResponseDto {
  @ApiProperty({ example: true })
  @Expose()
  success: boolean;

  @ApiProperty({ example: 1 })
  @Expose()
  affected: number;

  @ApiProperty({ enum: TaskAction, example: TaskAction.COMPLETE})
  @Expose()
  action: TaskAction;

  @ApiProperty({
    type: [BatchTaskResultDto],
    description: 'List of processed tasks',
    example: [
      {
        id: '8d4224d1-c583-40d0-9600-121e85336efb',
        status: TaskStatus.COMPLETED,
      },
    ],
    required: true,
  })
  @Expose()
  @Type(() => BatchTaskResultDto)
  result: BatchTaskResultDto[];
}
