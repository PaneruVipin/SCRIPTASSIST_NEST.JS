import { ErrorResponseDto } from '@common/dto/http-error-response.dto';
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger, HttpStatus, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';



@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
 
  private sensitiveFields = ['password',"access_token","ip","authorization", 'token', 'secret'];
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();

    // Generate a correlation ID for tracking
    const correlationId = (request.headers['x-correlation-id'] as string) || randomUUID();

    // Determine error severity and log appropriately
    this.logError(exception, status, correlationId);

    // Format the error response
    const errorResponse = this.formatErrorResponse(
      exception,
      status,
      exceptionResponse,
      request,
      correlationId
    );

    response.status(status).json(errorResponse);
  }

  private logError(exception: HttpException, status: number, correlationId: string) {
    const errorContext = {
      correlationId,
      stack: exception.stack,
      cause: exception.cause,
    };

    // Log based on severity
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Critical Error: ${exception.message}`,
        JSON.stringify(errorContext)
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        `Client Error: ${exception.message}`,
        JSON.stringify(errorContext)
      );
    } else {
      this.logger.log(
        `Info: ${exception.message}`,
        JSON.stringify(errorContext)
      );
    }
  }

  private formatErrorResponse(
    exception: HttpException,
    status: number,
    exceptionResponse: any,
    request: Request,
    correlationId: string
  ): ErrorResponseDto {

    const errorResponse: ErrorResponseDto = {
      success: false,
      statusCode: status,
      message: this.getErrorMessage(exception, exceptionResponse),
      path: request.url,
      timestamp: new Date().toISOString(),
      correlationId,
    };


    if (status === HttpStatus.BAD_REQUEST && typeof exceptionResponse === 'object') {
      errorResponse.errors = this.sanitizeErrorDetails(exceptionResponse);
    }


    if (exception instanceof NotFoundException) {
      errorResponse.message = errorResponse.message || 'Resource not found';
    }


    if (process.env.NODE_ENV === 'production' && status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.message = 'Internal server error 2';
      delete errorResponse.errors;
    }

    return errorResponse;
  }

  private getErrorMessage(exception: HttpException, exceptionResponse: any): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    if (typeof exceptionResponse === 'object' && exceptionResponse.message) {
      return Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message.join(', ')
        : exceptionResponse.message;
    }
    return exception.message || 'An error occurred';
  }

  private sanitizeErrorDetails(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
  
    const sanitized: Record<string, any> = Array.isArray(obj) ? [...obj] : { ...obj };
  
    for (const key in sanitized) {
      if (this.sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeErrorDetails(sanitized[key]);
      }
    }
  
    return sanitized;
  }
  
}