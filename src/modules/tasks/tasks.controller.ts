import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { TaskIdDto } from './dto/uuid-parm.dto';
import { BatchTaskOperationDto } from './dto/batch-task.dto';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { SuccessResponseDto } from '@common/dto/action-successfull.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { ApiPaginatedResponse } from '@common/decorators/api-paginated-response.decorator';
import { TaskDeatilResponseDto } from './dto/task-detail-response.dto';
import { TaskStatsResponseDto } from './dto/task-stats-response.dto';
import { BatchProcessResponseDto } from './dto/batch-task-response.dto';
import { ApiErrorResponse } from '@common/decorators/api-error-response.decorator';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(RateLimitGuard, JwtAuthGuard, RolesGuard)
@Roles('admin')
@RateLimit({ limit: 100, windowMs: 60000 })
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully', type: TaskResponseDto })
  @ApiErrorResponse({   // common custom decorator for document all erorrs 
    status: 400,
    message: 'Validation failed',
    description: 'Missing or invalid task input data',
    path: '/tasks',
  })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Find all tasks with optional filtering and paginated response' })
  @ApiPaginatedResponse({
    status: 200,
    description: 'List of tasks with pagination metadata',
    type: TaskResponseDto,
  })
  @ApiErrorResponse({
    status: 400,
    message: 'Invalid query parameters',
    description: 'Filtering parameters are incorrect or malformed',
    path: '/tasks',
  })
  findAll(@Query() taskSearchDto: TaskFilterDto, @Request() req: any) {
    return this.tasksService.findAll(taskSearchDto, req.user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiResponse({ status: 200, description: 'Task statistics object', type: TaskStatsResponseDto })
  @ApiErrorResponse({
    status: 500,
    message: 'Internal server error',
    description: 'Unable to fetch task statistics',
    path: '/tasks/stats',
  })
  async getStats() {
    return this.tasksService.getStats();
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Find a task by ID' })
  @ApiResponse({ status: 200, description: 'Task found', type: TaskDeatilResponseDto })
  @ApiErrorResponse({
    status: 404,
    message: 'Task not found',
    description: 'No task exists with the given ID',
    path: '/tasks/:id',
  })
  findOne(@Param() { id }: TaskIdDto) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task by ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully', type: TaskResponseDto })
  @ApiErrorResponse({
    status: 400,
    message: 'Invalid update data',
    description: 'One or more fields are invalid',
    path: '/tasks/:id',
  })
  update(@Param() { id }: TaskIdDto, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task by ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully', type: SuccessResponseDto })
  @ApiErrorResponse({
    status: 404,
    message: 'Task not found',
    description: 'Task with specified ID does not exist',
    path: '/tasks/:id',
  })
  remove(@Param() { id }: TaskIdDto) {
    return this.tasksService.remove(id);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Batch process multiple tasks' })
  @ApiResponse({
    status: 200,
    description: 'Batch operation successful',
    type: BatchProcessResponseDto,
  })
  @ApiErrorResponse({
    status: 400,
    message: 'Invalid batch operation',
    description: 'Batch task input is malformed or missing fields',
    path: '/tasks/batch',
  })
  @HttpCode(HttpStatus.OK)
  batchProcess(@Body() operations: BatchTaskOperationDto) {
    return this.tasksService.batchProcess(operations);
  }
}
