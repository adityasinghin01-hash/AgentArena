// tests/agents.test.js
// Integration tests for Agent registry endpoints.

require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI_TEST;

const RUN_ID = Date.now();

const TEST_USER = {
  email: `agenttest+${RUN_ID}@spinx.dev`,
  password: 'Test@12345',
  name: 'Agent Test User',
};

let app;
let User;
let Agent;
let token;
let userId;
let agentId;

beforeAll(async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI_TEST env var is required for tests');
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Lazy-load app and models
  app = require('../app');
  User = require('../models/User');
  Agent = require('../models/Agent');

  await User.deleteOne({ email: TEST_USER.email });

  const user = await User.create({
    name: TEST_USER.name,
    email: TEST_USER.email,
    password: TEST_USER.password,
    isVerified: true,
    role: 'user', // Basic user
  });
  userId = user._id;

  const loginRes = await request(app)
    .post('/api/v1/login')
    .send({ email: TEST_USER.email, password: TEST_USER.password });

  expect(loginRes.status).toBe(200);
  token = loginRes.body.accessToken;
});

afterAll(async () => {
  try {
    if (userId) {
      await Agent.deleteMany({ creator_id: userId });
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

describe('POST /api/v1/agents', () => {
  it('should create an agent and return 201', async () => {
    const res = await request(app)
      .post('/api/v1/agents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Linter Agent',
        description: 'Finds syntax errors and formatting issues.',
        category: 'linter',
        systemPrompt: 'You are an expert linter. Find bugs.',
        pricing: 'free'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agent).toHaveProperty('_id');
    agentId = res.body.data.agent._id;
  });

  it('should return 400 for invalid category', async () => {
    const res = await request(app)
      .post('/api/v1/agents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Agent',
        description: 'Blah blah blah',
        category: 'magic-beans', // Invalid category
        systemPrompt: 'Do magical things.'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toMatch(/Category must be one of/);
  });
});

// ── LIST & GET ─────────────────────────────────────────────

describe('GET /api/v1/agents', () => {
  it('should return a list of agents with 200', async () => {
    const res = await request(app).get('/api/v1/agents');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.agents)).toBe(true);
    expect(res.body.data.agents.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/v1/agents/:id', () => {
  it('should return the created agent', async () => {
    const res = await request(app).get(`/api/v1/agents/${agentId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agent._id).toBe(agentId.toString());
    expect(res.body.data.agent.name).toBe('Test Linter Agent');
  });

  it('should return 404 for a non-existent agent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/v1/agents/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for an invalid ID format', async () => {
    const res = await request(app).get('/api/v1/agents/not-an-id-12345');
    expect(res.statusCode).toBe(400); // validation error
  });
});

// ── GET BY CATEGORY ────────────────────────────────────────

describe('GET /api/v1/agents/category/:category', () => {
  it('should return agents in the linter category', async () => {
    const res = await request(app).get('/api/v1/agents/category/linter');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agents.some(a => a._id === agentId.toString())).toBe(true);
  });

  it('should return 400 for an invalid category param', async () => {
    const res = await request(app).get('/api/v1/agents/category/invalidcat');
    expect(res.statusCode).toBe(400);
  });
});

// ── UPDATE ─────────────────────────────────────────────────

describe('PUT /api/v1/agents/:id', () => {
  it('should update the agent and return 200', async () => {
    const res = await request(app)
      .put(`/api/v1/agents/${agentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'An updated description for the linter.'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.agent.description).toBe('An updated description for the linter.');
  });
});

// ── DELETE ─────────────────────────────────────────────────

describe('DELETE /api/v1/agents/:id', () => {
  it('should delete the agent and return 200', async () => {
    const res = await request(app)
      .delete(`/api/v1/agents/${agentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 viewing the deleted agent', async () => {
    const res = await request(app).get(`/api/v1/agents/${agentId}`);
    expect(res.statusCode).toBe(404);
  });
});
