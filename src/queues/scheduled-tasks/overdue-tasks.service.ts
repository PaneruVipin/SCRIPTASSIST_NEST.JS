import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, Repository } from 'typeorm';
import { Task } from '../../modules/tasks/entities/task.entity';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';
import * as _ from 'lodash';

@Injectable()
export class OverdueTasksService {
  private readonly logger = new Logger(OverdueTasksService.name);

  constructor(
    @InjectQueue('task-processing')
    private readonly taskQueue: Queue, // BullMQ queue where overdue task jobs will be enqueued

    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>, // access to task DB records
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks() {
    this.logger.debug('⏱️ Checking for overdue tasks...');

    const now = new Date();

    try {
      const overdueTasks = await this.tasksRepository.find({
        where: {
          dueDate: LessThan(now), // due date already passed
          status: Not(TaskStatus.COMPLETED), // still not completed
        },
        select: ['id'], // only fetch what's needed
      });

      this.logger.log(`🕒 Found ${overdueTasks.length} overdue tasks`);

      if (overdueTasks.length === 0) {
        this.logger.debug('No overdue tasks found.');
        return;
      }

      // prepare BullMQ jobs for overdue notification
      const jobs = overdueTasks.map((task) => ({
        name: 'overdue-tasks-notification',
        data: { taskId: task.id },
        opts: {
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }, // retry with exponential backoff
        },
      }));

      // BullMQ can accept addBulk, but chunk to avoid memory overload
      const chunks = _.chunk(jobs, 100); // handle in safe batches
      for (const chunk of chunks) {
        await this.taskQueue.addBulk(chunk);
      }

      this.logger.log(`📥 Queued ${jobs.length} overdue tasks for processing`);
    } catch (error: any) {
      // log stack for debugging cron job issues
      this.logger.error('❌ Error checking or queueing overdue tasks', error.stack);
    }

    this.logger.debug('✅ Overdue tasks check completed');
  }
}
