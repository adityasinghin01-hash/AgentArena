// tests/webhooks.test.js
// Integration tests for webhook CRUD endpoints.
// Creates a verified test user directly in DB to bypass recaptcha + email verification.

require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI_TEST;

const RUN_ID = Date.now();

const TEST_USER = {
  email: `webhooktest+${RUN_ID}@spinx.dev`,
  password: 'Test@12345',
  name: 'Webhook Test',
};

let app;
let User;
let Webhook;
let token;
let userId;
let webhookId;

beforeAll(async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI_TEST env var is required for tests');
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Lazy-load app and models after env vars are validated
  app = require('../app');
  User = require('../models/User');
  Webhook = require('../models/Webhook');

  // Delete any stale test user from previous runs, then create fresh
  // This avoids issues with password corruption from prior runs
  await User.deleteOne({ email: TEST_USER.email });

  const user = await User.create({
    name: TEST_USER.name,
    email: TEST_USER.email,
    password: TEST_USER.password,
    isVerified: true,
    role: 'user',
  });
  userId = user._id;

  // Login to get a JWT token
  const loginRes = await request(app)
    .post('/api/v1/login')
    .send({ email: TEST_USER.email, password: TEST_USER.password });

  expect(loginRes.status).toBe(200);
  expect(loginRes.body.accessToken).toBeDefined();
  expect(typeof loginRes.body.accessToken).toBe('string');
  token = loginRes.body.accessToken;
});

afterAll(async () => {
  try {
    if (userId) {
      await Webhook.deleteMany({ userId });
      await User.findByIdAndDelete(userId);
    }
  } catch (err) {
    console.warn('Teardown warning:', err.message);
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// ── CREATE ─────────────────────────────────────────────────

describe('POST /api/v1/webhooks', () => {
  it('should create a webhook and return 201 with rawSecret', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        url: 'https://example.com/webhook',
        events: ['user.created'],
        description: 'Test webhook',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('rawSecret');
    expect(res.body.data.webhook).toHaveProperty('id');
    webhookId = res.body.data.webhook.id;
  });

  it('should return 400 for invalid URL (not HTTPS)', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        url: 'http://insecure.com/hook',
        events: ['user.created'],
      });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid event name', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        url: 'https://example.com/webhook',
        events: ['totally.fake.event'],
      });

    expect(res.statusCode).toBe(400);
  });
});

// ── LIST ───────────────────────────────────────────────────

describe('GET /api/v1/webhooks', () => {
  it('should list webhooks and return 200 with count >= 1', async () => {
    const res = await request(app)
      .get('/api/v1/webhooks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── GET SINGLE ─────────────────────────────────────────────

describe('GET /api/v1/webhooks/:id', () => {
  it('should return a single webhook with 200', async () => {
    const res = await request(app)
      .get(`/api/v1/webhooks/${webhookId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id || res.body.data.id).toBeTruthy();
  });

  it('should return 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .get('/api/v1/webhooks/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
  });
});

// ── UPDATE ─────────────────────────────────────────────────

describe('PATCH /api/v1/webhooks/:id', () => {
  it('should update description and return 200', async () => {
    const res = await request(app)
      .patch(`/api/v1/webhooks/${webhookId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated description' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the update was actually persisted
    const getRes = await request(app)
      .get(`/api/v1/webhooks/${webhookId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data.description).toBe('Updated description');
  });
});

// ── DELETE ─────────────────────────────────────────────────

describe('DELETE /api/v1/webhooks/:id', () => {
  it('should delete the webhook and return 200', async () => {
    const res = await request(app)
      .delete(`/api/v1/webhooks/${webhookId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
