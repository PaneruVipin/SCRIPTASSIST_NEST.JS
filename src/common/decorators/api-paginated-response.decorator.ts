import { PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { SetMetadata } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiPaginatedResponse = ({status=200,description,type}:{status?:number,description:string,type:any}) => ApiResponse({
    status,
    description,
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(type) },
            },
          },
        },
      ],
    },
  })

