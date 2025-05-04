import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { randomUUID } from 'crypto';

/**
 * Custom Swagger decorator to document standardized API error responses.
 *
 * @param status -(Optional) HTTP status code (e.g., 400, 404, 500)
 * @param description - Description of the error for documentation
 * @param message - message to show in the example
 * @param path -Static path to show in the example
 * @param exampleOverride - (Optional) Override or extend parts of the default example response
 */
export function ApiErrorResponse({
  status = 400,
  message,
  path,
  description,
  exampleOverride,
}: {
  status?: number;
  message: string;
  path: string;
  description:string,
  exampleOverride?: Partial<Record<string, any>>;
}) {
  // Default structure for the error response example
  const defaultExample = {
    success: false,
    status,
    message,
    path,
    timestamp: new Date().toISOString(), // will be a static timestamp when Swagger is built
    correlationId: randomUUID(),       // example value; real value comes from middleware/interceptor
    errors: {
      message: [],                       // typically an array of validation or domain error messages
    },
  };

  // Use Swagger's ApiResponse decorator, applying the composed example schema
  return applyDecorators(
    ApiResponse({
      status,
      description,
      schema: {
        example: {
          ...defaultExample,
          ...(exampleOverride || {}), // allow override of default example fields
        },
      },
    }),
  );
}
