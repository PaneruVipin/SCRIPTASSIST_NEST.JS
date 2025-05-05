import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { hash } from 'bcrypt';
import './jest-setup';
import { User } from '@modules/users/entities/user.entity';

export let app: INestApplication;
export let httpServer: any;
export let authTokens: { admin: string; user: string };

export async function setupE2EApp() {
  // if (app) return { app, httpServer, authTokens }; // prevent re-init

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();

  // Add global filters, pipes, etc.
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  httpServer = app.getHttpServer();

  const dataSource = app.get(DataSource);
  const userRepo = dataSource.getRepository(User);
  const jwtService = app.get(JwtService);

  // Create users
  const passwordHash = await hash('admin123', 10);
  const adminUser = await userRepo.save(
    userRepo.create({
      email: `auth-admin${Date.now()}@example.com`,
      password: passwordHash,
      name:"Auth User",
      role: "admin",
    }),
  );

  const normalUser = await userRepo.save(
    userRepo.create({
      email: `auth-user${Date.now()}@example.com`,
      password: passwordHash,
      name:"Auth User",
      role: "user",
    }),
  );

  // Generate tokens manually
  authTokens = {
    admin: jwtService.sign({ sub: adminUser.id}),
    user: jwtService.sign({ sub: normalUser.id}),
  };

  return { app, httpServer, authTokens };
}

export async function teardownE2EApp() {
  if (app) await app.close();
}
