import request from 'supertest';
import { setupE2EApp } from './setup';

let httpServer: any;

beforeAll(async () => {
  // setup app before tests run, shared httpServer for all tests
  const setup = await setupE2EApp();
  httpServer = setup.httpServer;
});

describe('AuthController (e2e)', () => {
  // using dynamic email to avoid conflict if rerun
  const testUserCred = {
    email: `testuser${new Date().getTime()}@example.com`,
    password: 'StrongPassword123!',
  };

  const userName = 'TEST USER'; // because it's required by DTO for registr user

  describe('/auth/register [POST]', () => {
    it('should register a new user', async () => {
      const response = await request(httpServer)
        .post('/auth/register')
        .send({ ...testUserCred, name: userName }) // include name
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(testUserCred.email);
    });

    it('should fail if user already exists', async () => {
      const response = await request(httpServer)
        .post('/auth/register')
        .send({ ...testUserCred, name: userName })
        .expect(400);

      expect(response.body.message).toContain('email already used');
    });

    it('should fail if email is not email', async () => {
      const res = await request(httpServer)
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'Password1!', name: userName })
        .expect(400);

      expect(res.body.message).toContain('email must be an email'); // depending on DTO errors
    });

    it('should fail if password is missing', async () => {
      const res = await request(httpServer)
        .post('/auth/register')
        .send({ email: 'test@example.com', name: userName })
        .expect(400);

      expect(res.body.message).toContain('password should not be empty');
    });

    it('should fail if email is number', async () => {
      const res = await request(httpServer)
        .post('/auth/register')
        .send({ ...testUserCred, email: 12345 }) // wrong type
        .expect(400);

      expect(res.body.message).toContain('email'); // should catch type issue
    });
  });

  describe('/auth/login [POST]', () => {
    it('should login an existing user', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send(testUserCred)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
    });

    it('should return 401 with invalid credentials', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({ email: testUserCred.email, password: 'WrongPassword' })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should fail with missing email', async () => {
      const res = await request(httpServer)
        .post('/auth/login')
        .send({ password: 'somepass' })
        .expect(400);

      // forgot email — should be handled by DTO validator
      expect(res.body.message).toContain('email');
    });

    it('should fail if password is empty', async () => {
      const res = await request(httpServer)
        .post('/auth/login')
        .send({ email: testUserCred.email, password: "" }) // wrong type
        .expect(400);

      expect(res.body.message).toContain('password');
    });
  });
});
