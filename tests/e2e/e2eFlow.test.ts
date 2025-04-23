
import request from 'supertest';
import app from '../../src/index'; // Adjust if app is exported differently
import { describe, it } from 'node:test';

let adminToken = '';
let userTokens: Record<string, string> = {};
let createdTasks: any[] = [];
let createdUsers: any[] = [];
let projectId: number;

jest.setTimeout(300000); // allow up to 5 minutes

describe('E2E Test Flow', () => {
  const testUsers = [
    { email: 'user1@example.com', password: 'test123', name: 'user1' },
    { email: 'user2@example.com', password: 'test123', name: 'user2' },
  ];

  const adminUser = { email: 'admin@example.com', password: 'admin123' };

  beforeAll(async () => { // Use 'beforeAll' for setup
    await new Promise(resolve => setTimeout(resolve, 10000)); // Sleep before tests
  });

  it('Phase 1: Admin login, create project, create tasks', async () => {
    const loginRes = await request(app)
      .post('/login')
      .send(adminUser);

    adminToken = loginRes.body.token;

    const projectRes = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'PulseTrack' });

    projectId = projectRes.body.id;

    const tasks = [
      {
        title: 'Implement Clock-In API',
        description: 'Create endpoint to clock user into attendance',
        status: 'in review',
        priority: 'High',
        dueDate: '2025-04-30',
        projectId,
        assignees: [],
      },
      {
        title: 'Design UI',
        description: 'Create UI for dashboard',
        status: 'pending',
        priority: 'Medium',
        dueDate: '2025-05-02',
        projectId,
        assignees: [],
      },
    ];

    for (const task of tasks) {
      const taskRes = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(task);

      createdTasks.push(taskRes.body);
    }
  });

  it('Phase 2: Register users and assign to tasks', async () => {
    for (const user of testUsers) {
      await request(app).post('/auth/register').send(user);

      const loginRes = await request(app)
        .post('/login')
        .send(user);

      userTokens[user.email] = loginRes.body.token;
      createdUsers.push(loginRes.body.user);
    }

    const taskAssignments = [
      { taskId: createdTasks[0].id, assignees: [createdUsers[0].id, createdUsers[1].id] },
      { taskId: createdTasks[1].id, assignees: [createdUsers[0].id] },
    ];

    for (const assign of taskAssignments) {
      await request(app)
        .put(`/tasks/${assign.taskId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigneeIds: assign.assignees });
    }
  });

  it('Phase 3: User task activity', async () => {
    const userEmail = testUsers[0].email;
    const token = userTokens[userEmail];

    await request(app)
      .post('/users/me/clock-in')
      .set('Authorization', `Bearer ${token}`);

    await new Promise((res) => setTimeout(res, 10000));

    const closestTask = createdTasks[0]; // Just for demo
    await request(app)
      .post(`/tasks/${closestTask.id}/start`)
      .set('Authorization', `Bearer ${token}`);

    await new Promise((res) => setTimeout(res, 10000));

    await request(app)
      .post(`/tasks/end?status=in%20review`)
      .set('Authorization', `Bearer ${token}`);

    const secondTask = createdTasks[1];
    await request(app)
      .post(`/tasks/${secondTask.id}/start`)
      .set('Authorization', `Bearer ${token}`);

    await new Promise((res) => setTimeout(res, 60000));

    await request(app)
      .post(`/tasks/end?isCompleted=true`)
      .set('Authorization', `Bearer ${token}`);
  });

  it('Phase 4: Layoff and clock-out flow', async () => {
    const userEmail = testUsers[0].email;
    const token = userTokens[userEmail];

    await request(app)
      .post(`/tasks/${createdTasks[1].id}/start`)
      .set('Authorization', `Bearer ${token}`);

    await new Promise((res) => setTimeout(res, 5000));

    await request(app)
      .post('/activity/users/me/layoff/start')
      .set('Authorization', `Bearer ${token}`);

    await new Promise((res) => setTimeout(res, 10000));

    await request(app)
      .post('/activity/users/me/layoff/end')
      .set('Authorization', `Bearer ${token}`);

    await request(app)
      .post('/tasks/end?status=paused')
      .set('Authorization', `Bearer ${token}`);

    await new Promise((res) => setTimeout(res, 60000));

    await request(app)
      .post('/users/me/clock-out')
      .set('Authorization', `Bearer ${token}`);
  });
});
