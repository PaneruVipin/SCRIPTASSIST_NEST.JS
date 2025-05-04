import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import "./jest-setup"
import request from 'supertest';

export let app: INestApplication;
export let httpServer: any;
export let authTokens: {admin:string,user:string};

export async function setupE2EApp() {
  if (app) return { app, httpServer,authTokens }; // prevent re-init
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();

  //loging intercepter
  app.useGlobalInterceptors(new LoggingInterceptor());

  // expeception filter
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

  await app.init();
  httpServer = app.getHttpServer();
  const adminCred = { email:"admin@example.com", password:"admin123" }

  const userCred ={email:"user@example.com", password:"user123"}

  const loginRes = await Promise.all([adminCred,userCred].map((cred)=>request(httpServer).post('/auth/login').send(cred))) 

  authTokens = {admin:loginRes?.[0]?.body.access_token,user:loginRes?.[1]?.body.access_token}
  return { app, httpServer ,authTokens};
}

export async function teardownE2EApp() {
  if (app) await app.close();
}
// teardownE2EApp()