import { ApiProperty } from '@nestjs/swagger';

export class PaginatedMetaDto {
  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 3 })
  page: number;

  @ApiProperty({ example: 1 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}


export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({
    type: () => PaginatedMetaDto,
  })
  meta: PaginatedMetaDto;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
