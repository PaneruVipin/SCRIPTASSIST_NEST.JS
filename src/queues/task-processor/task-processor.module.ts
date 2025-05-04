import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskProcessorService } from './task-processor.service';
import { TasksModule } from '../../modules/tasks/tasks.module';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'task-processing',
    }),
    TasksModule,
    UsersModule
  ],
  providers: [TaskProcessorService],
  exports: [TaskProcessorService],
})

export class TaskProcessorModule {} 