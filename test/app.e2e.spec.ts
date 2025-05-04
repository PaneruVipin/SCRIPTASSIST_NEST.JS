import  request from 'supertest';
import { setupE2EApp, teardownE2EApp } from './setup';

let httpServer: any;
let authTokens:any;
beforeAll(async () => {
  const setup = await setupE2EApp();
  httpServer = setup.httpServer;
  authTokens = setup.authTokens
});

describe('App Health Check', () => {
  it('should be Not found root url', async () => {
    const res = await request(httpServer)
      .get('/')
    expect(res.status).toBe(404);
  });
});
