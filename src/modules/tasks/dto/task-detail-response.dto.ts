import { Expose, Type } from 'class-transformer';
import { TaskResponseDto } from './task-response.dto';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TaskDeatilResponseDto extends TaskResponseDto {
 @Expose()
 @Type(() => UserResponseDto) 
 @ApiProperty({ type: () => UserResponseDto })
  user : UserResponseDto
} 