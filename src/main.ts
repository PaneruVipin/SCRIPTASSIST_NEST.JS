import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ApiResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { AuthResponseDto } from '@modules/auth/dto/auth-response.dto';
import { ErrorResponseDto } from '@common/dto/http-error-response.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

 // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());
   
  // Global Exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors();

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('TaskFlow API')
    .setDescription('Task Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {extraModels:[ErrorResponseDto]});
  SwaggerModule.setup('api', app, document);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap(); 