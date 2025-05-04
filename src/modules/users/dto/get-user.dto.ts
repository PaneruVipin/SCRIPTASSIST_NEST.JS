import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { UserRole } from '../enums/user-role.enum';
import { SortOrder } from '@common/enums/sort-order.enum';
import { UserSortBy } from '../enums/user-sort-by.ebum';

export class GetUsersQueryDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    default: 1,
    description: 'Current page number for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    default: 10,
    description: 'Number of users per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number = 10;

  @ApiPropertyOptional({
    enum: UserSortBy,
    default: UserSortBy.CREATED_AT,
    description: 'Field to sort users by',
  })
  @IsOptional()
  @IsEnum(UserSortBy)
  sortBy: UserSortBy = UserSortBy.CREATED_AT;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Sort order (ASC or DESC)',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Filter users by role',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    type: String,
    description: 'Search term for user name or email',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
