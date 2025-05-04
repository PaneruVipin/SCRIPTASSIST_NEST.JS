import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { RateLimit } from '@common/decorators/rate-limit.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { UserOrMeParam } from '@common/decorators/user-or-me.param';
import { GetUsersQueryDto } from './dto/get-user.dto';
import { PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { SuccessResponseDto } from '@common/dto/action-successfull.dto';
import { ApiPaginatedResponse } from '@common/decorators/api-paginated-response.decorator';
import { ApiErrorResponse } from '@common/decorators/api-error-response.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(RateLimitGuard, JwtAuthGuard, RolesGuard)
@RateLimit({ limit: 100, windowMs: 60000 })
@Roles('admin')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExtraModels(PaginatedResponseDto, UserResponseDto)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiErrorResponse({
    message: 'email must be a valid email',
    description: 'Failed when email is not valid',
    path: '/users',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get a paginated list of users' })
  @ApiPaginatedResponse({
    status: 200,
    description: 'List of users with pagination metadata',
    type: UserResponseDto,
  }) // custom decorator for paginated response
  @ApiErrorResponse({
    message: 'Invalid query parameters',
    description: 'Query params failed validation',
    path: '/users',
  })
  findAll(@Query() userSearchDto: GetUsersQueryDto) {
    return this.usersService.findAll(userSearchDto);
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get a user by ID or "me"' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User ID (UUID) or "me" to refer to the authenticated user',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  }) // need for document param because i used custom decorator for modify param
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
  @ApiErrorResponse({
    message: 'User not found',
    description: 'No user found with given ID or "me"',
    path: '/users/:id',
  })
  findOne(@UserOrMeParam('id') id: string) {
    return this.usersService.findOneOrFail(id);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Update a user by ID or "me"' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User ID (UUID) or "me" to refer to the authenticated user',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiErrorResponse({
    message: 'Invalid update data',
    description: 'Payload failed validation or user not found',
    path: '/users/:id',
  })
  update(@UserOrMeParam('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully', type: SuccessResponseDto })
  @ApiErrorResponse({
    message: 'Delete failed',
    description: 'User not found or unauthorized access',
    path: '/users/:id',
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
