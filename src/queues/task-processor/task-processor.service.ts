import { Injectable, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TasksService } from '../../modules/tasks/tasks.service';
import { UsersService } from '@modules/users/users.service';

@Injectable()
@Processor('task-processing', {
  concurrency: 10, // process up to 10 jobs in parallel
})
export class TaskProcessorService extends WorkerHost {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly userService: UsersService,
  ) {
    super(); // required by WorkerHost
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    // just log, no extra logic for now
    this.logger.debug(`✅ Job ${job.id} (${job.name}) completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    // useful for debugging retries
    this.logger.error(`❌ Job ${job.id} (${job.name}) failed: ${error.message}`);
  }

  async process(job: Job): Promise<any> {
    // all jobs land here first
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'task-status-update':
          return await this.handleStatusUpdate(job);

        case 'task-assigned':
          return await this.handleAssigning(job); 

        case 'task-delete':
          return await this.handleStatusDelete(job);

        case 'overdue-tasks-notification':
          return await this.handleOverdueTasks(job);

        default:
          // fallback if someone queues a job with wrong name
          this.logger.warn(`Unknown job type: ${job.name}`);
          return { success: false, error: 'Unknown job type' };
      }
    } catch (error) {
      // important: let BullMQ handle retries based on config
      this.logger.error(
        `Error processing job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private async handleStatusUpdate(job: Job) {
    const { taskId, status } = job.data;

    // sanity check
    if (!taskId || !status) {
      return { success: false, error: 'Missing taskId or status' };
    }

    const task = await this.tasksService.findOne(taskId);
    if (!task) {
      return { success: false, error: `Task not found: ${taskId}` };
    }

    // just simulate a notification (no email or socket yet)
    this.logger.debug(
      `📣 To ${task.user.email} - Hey "${task.user.name}", your task "${task.title}" status changed to ${status}.`,
    );

    return { success: true };
  }

  private async handleAssigning(job: Job) {
    const { taskId, status } = job.data;

    if (!taskId || !status) {
      return { success: false, error: 'Missing taskId or status' };
    }

    const task = await this.tasksService.findOne(taskId);
    if (!task) {
      return { success: false, error: `Task not found: ${taskId}` };
    }

    this.logger.debug(
      `📣 To ${task.user.email} - Hey "${task.user.name}", you are assigned a new task "${task.title}" with status ${status}.`,
    );

    return { success: true };
  }

  private async handleStatusDelete(job: Job) {
    const { taskId, user_Id, title } = job.data;

    const user = await this.userService.findOneOrFail(user_Id); // should throw if not found

    this.logger.debug(
      `📣 To ${user.email} - Hey "${user.name}", your task "${title}" is deleted.`,
    );

    return { success: true };
  }

  private async handleOverdueTasks(job: Job) {
    const { taskId } = job.data;

    if (!taskId) {
      return { success: false, error: 'Missing taskId' };
    }

    const task = await this.tasksService.findOne(taskId);
    if (!task) {
      return { success: false, error: `Task not found: ${taskId}` };
    }

    this.logger.debug(
      `📣 To ${task.user.email} - Hey "${task.user.name}", your task "${task.title}" is overdue.`,
    );

    return { success: true };
  }
}
