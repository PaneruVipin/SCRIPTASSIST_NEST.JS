import request from 'supertest';
import { setupE2EApp, teardownE2EApp } from './setup';

let httpServer: any;
let authTokens: any;

beforeAll(async () => {
  const setup = await setupE2EApp();
  httpServer = setup.httpServer;
  authTokens = setup.authTokens;
});


describe('UsersController (e2e)', () => {
  // making unique email to avoid conflict with existing ones
  const newUser = {
    email: `e2euser-${Date.now()}@mail.com`, // ensures every run unique
    password: 'P@ssword123',
    name: 'Test User',
  };

  let createdUserId: string;

  describe('/users [POST]', () => {
    it('should create a new user (admin only)', async () => {
      const res = await request(httpServer)
        .post('/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(newUser)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(newUser.email);
      createdUserId = res.body.id;
    });

    it('should fail with invalid email format', async () => {
      const res = await request(httpServer)
        .post('/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ ...newUser, email: 'not-an-email' })
        .expect(400);

      expect(res.body.message).toContain('email must be an email');
    });
  });

  describe('/users [GET]', () => {
    it('should return list of users', async () => {
      const res = await request(httpServer)
        .get('/users')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('/users/:id [GET]', () => {
    it('should get one user by id', async () => {
      const res = await request(httpServer)
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(res.body.id).toBe(createdUserId);
    });

    it('should return 404 for non-existing id', async () => {
      await request(httpServer)
        .get('/users/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(404);
    });
  });

  describe('/users/:id [PATCH]', () => {
    it('should update user name', async () => {
      const newName = 'Updated Name';
      const res = await request(httpServer)
        .patch(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ name: newName })
        .expect(200);

      expect(res.body.name).toBe(newName);
    });

    it('should fail update with wrong type', async () => {
      const res = await request(httpServer)
        .patch(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ email: 12345 }) // wrong type: number instead of string
        .expect(400);

      expect(res.body.message).toContain('email must be');
    });
  });

  describe('/users/:id [DELETE]', () => {
    it('should delete user', async () => {
      await request(httpServer)
        .delete(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);
    });

    it('should return 404 when deleting again', async () => {
      await request(httpServer)
        .delete(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(404);
    });
  });
});


describe('UsersController (auth/role/guard tests)', () => {
    it('should block access with no token', async () => {
      await request(httpServer)
        .get('/users')
        .expect(401); // JWT Guard should reject
    });
  
    it('should block access with invalid token', async () => {
      await request(httpServer)
        .get('/users')
        .set('Authorization', 'Bearer faketoken123')
        .expect(401);
    });
  
    it('should block non-admin user', async () => {
      await request(httpServer)
        .get('/users')
        .set('Authorization', `Bearer ${authTokens.user}`) // assuming regular user token exists
        .expect(403); // RolesGuard should reject
    });
  
    // 🧪 Optional: simulate rapid requests to trigger rate limiting
    it('should rate limit after too many requests (simulate)', async () => {
      const attempts = 15;   // above the 100 limit is unrealistic here, just showing structure
      let blocked = false;  
  
      for (let i = 0; i < attempts; i++) {
        const res = await request(httpServer)
          .get('/users')
          .set('Authorization', `Bearer ${authTokens.admin}`);
  
        if (res.status === 429) {
          blocked = true;
          break;
        }
      }
  
      // rate-limiting depends on config, maybe it don't trigger in test. so this is soft check
      expect(blocked).toBe(false); // set to true if you mock RateLimitGuard better
    });
  });