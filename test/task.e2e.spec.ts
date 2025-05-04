import request from 'supertest';
import { setupE2EApp, teardownE2EApp } from './setup';
import { TaskStatus } from '@modules/tasks/enums/task-status.enum';
import { TaskPriority } from '@modules/tasks/enums/task-priority.enum';

let httpServer: any;
let authTokens: any;
let createdTaskId: string;
let testUserId: string;

beforeAll(async () => {
  const setup = await setupE2EApp();
  httpServer = setup.httpServer;
  authTokens = setup.authTokens;

  // Create a test user to associate with tasks
  const userRes = await request(httpServer)
    .post('/users')
    .set('Authorization', `Bearer ${authTokens.admin}`)
    .send({
      email: `taskuser-${Date.now()}@mail.com`,
      name: 'Task User',
      password: 'TestPass123',
    });
  testUserId = userRes.body.id;
});

// afterAll(async () => {
//   await teardownE2EApp(httpServer);
// });

describe('TasksController (e2e)', () => {
  const newTask = {
    title: 'Test Task',
    description: 'Test Description',
    userId: '', // to be filled with testUserId
    priority: TaskPriority.MEDIUM,
  };

  beforeAll(() => {
    newTask.userId = testUserId;
  });

  describe('/tasks [POST]', () => {
    it('should create a new task', async () => {
      const res = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send(newTask)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(newTask.title);
      createdTaskId = res.body.id;
    });

    it('should fail with invalid userId', async () => {
      const res = await request(httpServer)
        .post('/tasks')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ ...newTask, userId: 'invalid-uuid' })
        .expect(400);
    });
  });

  describe('/tasks [GET]', () => {
    it('should return paginated tasks', async () => {
      const res = await request(httpServer)
        .get('/tasks')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .query({ page: 1, limit: 10 })
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should filter tasks by status', async () => {
      const res = await request(httpServer)
        .get('/tasks')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .query({ status: TaskStatus.PENDING, page: 1, limit: 10 })
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('/tasks/stats [GET]', () => {
    it('should return task statistics', async () => {
      const res = await request(httpServer)
        .get('/tasks/stats')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(res.body).toHaveProperty('total');
    });
  });

  describe('/tasks/:id [GET]', () => {
    it('should return task by ID', async () => {
      const res = await request(httpServer)
        .get(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);

      expect(res.body.id).toBe(createdTaskId);
    });

    it('should return 404 for invalid task ID', async () => {
      await request(httpServer)
        .get('/tasks/123e4567-e89b-12d3-a456-426614174999')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(404);
    });
  });

  describe('/tasks/:id [PATCH]', () => {
    it('should update a task title', async () => {
      const res = await request(httpServer)
        .patch(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ title: 'Updated Task Title' })
        .expect(200);
      expect(res.body.title).toBe('Updated Task Title');
    });

    it('should return 400 for invalid payload', async () => {
    const res=  await request(httpServer)
        .patch(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ user: 123 }) // invalid type
        .expect(400);
    });
  });

  describe('/tasks/:id [DELETE]', () => {
    it('should delete the task', async () => {
      await request(httpServer)
        .delete(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(200);
    });

    it('should return 404 when deleting again', async () => {
      await request(httpServer)
        .delete(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .expect(404);
    });
  });

  describe('/tasks/batch [POST]', () => {
    let taskIds: string[] = [];

    beforeAll(async () => {
      const promises = Array.from({ length: 3 }).map(() =>
        request(httpServer)
          .post('/tasks')
          .set('Authorization', `Bearer ${authTokens.admin}`)
          .send({ ...newTask, title: `Batch Task ${Date.now()}` })
      );
      const results = await Promise.all(promises);
      taskIds = results.map(res => res.body.id);
    });

    it('should mark tasks as complete', async () => {
      const res = await request(httpServer)
        .post('/tasks/batch')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ tasks: taskIds, action: 'complete' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.affected).toBeGreaterThan(0);
    });

    it('should delete tasks in batch', async () => {
      const res = await request(httpServer)
        .post('/tasks/batch')
        .set('Authorization', `Bearer ${authTokens.admin}`)
        .send({ tasks: taskIds, action: 'delete' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
