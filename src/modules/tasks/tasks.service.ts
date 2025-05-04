import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TaskStatus } from './enums/task-status.enum';
import { TaskFilterDto } from './dto/task-filter.dto';
import { UsersService } from '@modules/users/users.service';
import { isUUID } from 'class-validator';
import { instanceToPlain } from 'class-transformer';
import { TaskPriority } from './enums/task-priority.enum';
import { BatchTaskOperationDto } from './dto/batch-task.dto';
import { TaskAction } from './enums/task-action.enum';
import { SuccessResponseDto } from '@common/dto/action-successfull.dto';
import { TaskStatsResponseDto } from './dto/task-stats-response.dto';
import { BatchProcessResponseDto } from './dto/batch-task-response.dto';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectQueue('task-processing')
    private taskQueue: Queue,
    private userService:UsersService
  ) {}

    // create new task and queue it to worker
    async create(createTaskDto: CreateTaskDto): Promise<Task> {
      await this.userService.findOneOrFail(createTaskDto.userId)
  
      const queryRunner = this.tasksRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
    
      try {
        const task = this.tasksRepository.create(createTaskDto);
        const savedTask = await queryRunner.manager.save(task);
  
        // add job to queue for processing this task
        await this.taskQueue.add('task-assigned', {
          taskId: savedTask.id,
          status: savedTask.status,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        });
  
        await queryRunner.commitTransaction();
        return savedTask;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException('Failed to create task and queue it');
      } finally {
        await queryRunner.release();
      }
    }
  
    // get all tasks with filter, sort and pagination
    async findAll(taskSearchDto: TaskFilterDto, user?:User) {
      const { role, id } = user || {}
      const { status, priority, page, limit, sortBy, sortOrder } = taskSearchDto;
      const queryBuilder = this.tasksRepository.createQueryBuilder('task');

       if(role == "user"){
          queryBuilder.andWhere('task.userId = :id', { id }); // when normal user want acces to own data
       }

      if (status) {
        queryBuilder.andWhere('task.status = :status', { status });
      }
  
      if (priority) {
        queryBuilder.andWhere('task.priority = :priority', { priority });
      }
  
      queryBuilder.skip((page - 1) * limit).take(limit);
  
      // sorting by field user requested
      queryBuilder.orderBy(`task.${sortBy}`, sortOrder);
  
      const [tasks, totalCount] = await queryBuilder.getManyAndCount();
  
      return {
        data: tasks,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    }
  
    // just find task by id and return with user
    async findOne(id: string, user?:User): Promise<Task> {
      const where:{id:string,userId?:string}={ id }
      if(user?.role == "user"){
        where.userId = user.id   // for authenticate when user send request for own data
      }
      try {
        return instanceToPlain(await this.tasksRepository.findOneOrFail({
          where,   
          relations: ['user'],
        })) as Task;
      } catch (error) {
        throw new NotFoundException("Task not found");
      }
    }
  
    // update task and if status changed then send job to queue
    async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
      if (updateTaskDto.userId) {
        await this.userService.findOneOrFail(updateTaskDto.userId);
      }
  
      const queryRunner = this.tasksRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
  
      try {
        const task = await queryRunner.manager.findOneOrFail(Task, { where: { id } });
        const originalStatus = task.status;
  
        const updated = queryRunner.manager.merge(Task, task, updateTaskDto);
        const savedTask = await queryRunner.manager.save(Task, updated);
  
        if (originalStatus !== savedTask.status) {
          // if status changed then push job to queue
          await this.taskQueue.add('task-status-update', {
            taskId: savedTask.id,
            status: savedTask.status,
          }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
          });
        }
  
        await queryRunner.commitTransaction();
        return savedTask;
      } catch (error: any) {
        await queryRunner.rollbackTransaction();
  
        if (error.name === 'EntityNotFoundError') {
          throw new NotFoundException(`Task not found`);
        }
  
        throw new InternalServerErrorException(`Failed to update task`);
      } finally {
        await queryRunner.release();
      }
    }
  
    // delete task by id, nothing fancy
    async remove(id: string): Promise<SuccessResponseDto> {
      const result = await this.tasksRepository.delete({ id });
  
      if (result.affected === 0) {
        throw new NotFoundException(`Task not found`);
      }
       return {success:true, message:"deleted successfuly"}
    }
  
    // return tasks with only given status
    async findByStatus(status: TaskStatus): Promise<Task[]> {
      return this.tasksRepository.find({ where: { status } });
    }
  
    // used by worker to update task status
    async updateStatus(id: string, status: string): Promise<Task> {
      const task = await this.findOne(id);
      task.status = status as any;
      return this.tasksRepository.save(task);
    }
  
    // stats for dashboard, just raw counts
    async getStats():Promise<TaskStatsResponseDto> {
      const result = await this.tasksRepository
        .createQueryBuilder('task')
        .select([
          'COUNT(*)::int AS total',
          `COUNT(*) FILTER (WHERE task.status = '${TaskStatus.COMPLETED}')::int AS "completed"`,
          `COUNT(*) FILTER (WHERE task.status = '${TaskStatus.IN_PROGRESS}')::int AS "inProgress"`,
          `COUNT(*) FILTER (WHERE task.status = '${TaskStatus.PENDING}')::int AS "pending"`,
          `COUNT(*) FILTER (WHERE task.priority = '${TaskPriority.HIGH}')::int AS "highPriority"`,
        ])
        .getRawOne();
  
      return result;
    }
  
    // run batch actions like complete/delete
    async batchProcess(operations: BatchTaskOperationDto):Promise<BatchProcessResponseDto> {
      const { tasks: taskIds, action } = operations;
      const queryRunner = this.tasksRepository.manager.connection.createQueryRunner();
  
      await queryRunner.connect();
      await queryRunner.startTransaction();
  
      try {
        let result;
  
        switch (action) {
          case TaskAction.COMPLETE:
            result = await this.processCompleteTasks(taskIds, queryRunner);
            break;
          case TaskAction.DELETE:
            result = await this.processDeleteTasks(taskIds, queryRunner);
            break;
          default:
            return this.createBatchSuccessResponse({ action })
        }
  
        await queryRunner.commitTransaction();
  
        if (result?.raw?.length) {
          await this.enqueueTasksForProcessing(result.raw, action);
        }
  
        return this.createBatchSuccessResponse(result);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException('Batch operation failed');
      } finally {
        await queryRunner.release();
      }
    }
  
    // update status to completed for given tasks
    private async processCompleteTasks(taskIds: string[], queryRunner: QueryRunner) {
      const existingTasks = await queryRunner.manager
        .createQueryBuilder(Task, 'task')
        .select(['task.id', 'task.status'])
        .where('task.id IN (:...taskIds)', { taskIds })
        .getMany();
  
      const tasksToUpdate = existingTasks.filter(task => task.status !== TaskStatus.COMPLETED);
      const idsToUpdate = tasksToUpdate.map(t => t.id);
  
      if (idsToUpdate.length === 0) {
        return { raw: [], affected: 0, action: "complete" };
      }
  
      return await queryRunner.manager
        .createQueryBuilder()
        .update(Task)
        .set({ status: TaskStatus.COMPLETED })
        .where('id IN (:...idsToUpdate)', { idsToUpdate })
        .returning(['id', 'status'])
        .execute();
    }
  
    // delete all given tasks
    private async processDeleteTasks(taskIds: string[], queryRunner: QueryRunner) {
      return await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from(Task)
        .where('id IN (:...taskIds)', { taskIds })
        .returning(['id', "title", "userId"])
        .execute();
    }
  
    // send bulk jobs to queue for complete/delete
    private async enqueueTasksForProcessing(tasks: any[], action: TaskAction) {
      const jobName = action === TaskAction.COMPLETE ? 'status-update' : 'delete';
      const jobs = tasks.map(row => ({
        name: `task-${jobName}`,
        data: { taskId: row.id, status: row.status, title: row.title, userId: row.userId },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }));
      await this.taskQueue.addBulk(jobs);
    }
  
    // just a basic response shape for batch ops
    private createBatchSuccessResponse(result: any):BatchProcessResponseDto {
      return {
        success: true,
        action: result?.action,
        affected: result?.affected || 0,
        result: result?.raw,
      };
    }    

}
