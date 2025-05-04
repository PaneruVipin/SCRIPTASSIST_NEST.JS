import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Invalid request payload' })
  message: string;

  @ApiProperty({ example: '/users' })
  path: string;

  @ApiProperty({ example: '2025-05-02T12:34:56.789Z' })
  timestamp: string;

  @ApiProperty({ example: { "message": [],}, required: false })
  errors?: any;

  @ApiProperty({ example: 'abc123xyz789', required: false })
  correlationId?: string;
}
