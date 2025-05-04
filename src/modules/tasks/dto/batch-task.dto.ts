import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, ArrayNotEmpty, IsUUID } from 'class-validator';
import { TaskAction } from '../enums/task-action.enum';

export class BatchTaskOperationDto {
  @ApiProperty({
    description: 'List of task IDs to process',
    example: ['f3b4bfc8-5d64-4d84-8b91-4b7cfb6409f9', 'ff2f8b8f-0ebc-4db0-bcf1-3ad3fbc5ac90'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  tasks: string[];

  @ApiProperty({
    description: 'Action to perform on the tasks',
    enum: TaskAction,
    example: TaskAction.COMPLETE,
  })
  @IsEnum(TaskAction)
  action: TaskAction;
}
