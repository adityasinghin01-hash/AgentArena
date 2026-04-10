// tests/pipeline.test.js
// Integration tests for Phase 3 Pipeline Engine endpoints.

require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI_TEST;
const RUN_ID = Date.now();
const TEST_USER = {
  email: `pipelinetest+${RUN_ID}@spinx.dev`,
  password: 'Test@12345',
  name: 'Pipeline Test User',
};

let app;
let User;
let Agent;
let Pipeline;
let token;
let userId;
let mockAgent1Id;
let mockAgent2Id;
let pipelineId;

beforeAll(async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI_TEST env var is required for tests');
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Setup app
  app = require('../app');
  User = require('../models/User');
  Agent = require('../models/Agent');
  Pipeline = require('../models/Pipeline');

  await User.deleteOne({ email: TEST_USER.email });

  const user = await User.create({
    name: TEST_USER.name,
    email: TEST_USER.email,
    password: TEST_USER.password,
    isVerified: true,
    role: 'user',
  });
  userId = user._id;

  const loginRes = await request(app)
    .post('/api/v1/login')
    .send({ email: TEST_USER.email, password: TEST_USER.password });

  expect(loginRes.status).toBe(200);
  token = loginRes.body.accessToken;

  // Create mock agents so the pipeline auto-matcher can find them
  const a1 = await Agent.create({
    name: 'Linter Expert',
    description: 'Finds syntax errors.',
    category: 'linter',
    deployedBy: userId,
    systemPrompt: 'You are a linter.',
    pricing: 'free',
    creator_id: userId
  });
  mockAgent1Id = a1._id;

  const a2 = await Agent.create({
    name: 'Content Writer',
    description: 'Writes documentation.',
    category: 'writer',
    deployedBy: userId,
    systemPrompt: 'You are a writer.',
    pricing: 'free',
    creator_id: userId
  });
  mockAgent2Id = a2._id;
});

afterAll(async () => {
  try {
    if (userId) {
      await Pipeline.deleteMany({ creator_id: userId });
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

// ── CREATE PIPELINE ────────────────────────────────────────

describe('POST /api/v1/pipeline/create', () => {
  it('should create a pipeline using explicit agent assignments and return 201', async () => {
    const res = await request(app)
      .post('/api/v1/pipeline/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        outcomeText: 'Lint and Doc',
        slots: [
          {
            name: 'Slot1',
            task: 'Lint code',
            evaluationCriteria: 'No bugs',
            assignedAgents: [mockAgent1Id.toString()]
          }
        ]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pipeline).toHaveProperty('_id');
    
    // Store pipeline ID for the next test
    pipelineId = res.body.data.pipeline._id;
    
    expect(res.body.data.pipeline.slots[0].assignedAgents[0]._id).toBe(mockAgent1Id.toString());
  });

  it('should auto-match agents if assigned_agent_ids are missing or empty', async () => {
    // The auto-matcher searches by category or task keywords. 
    // mockAgent1Id is 'linter', mockAgent2Id is 'writer'.
    const res = await request(app)
      .post('/api/v1/pipeline/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        outcomeText: 'Write things',
        slots: [
          {
            name: 'AutoWriter',
            task: 'Write documentation as a writer',
            evaluationCriteria: 'Good text',
            assignedAgents: []
          }
        ]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.pipeline.slots[0].assignedAgents.length).toBeGreaterThan(0);
    // Ideally it matched the writer 
  });
  
  it('should return 400 for empty slots', async () => {
    const res = await request(app)
      .post('/api/v1/pipeline/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        outcomeText: 'Do nothing',
        slots: []
      });

    expect(res.statusCode).toBe(400);
  });
});

// ── GET PIPELINE ───────────────────────────────────────────

describe('GET /api/v1/pipeline/:id', () => {
  it('should return the populated pipeline with 200', async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/${pipelineId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(pipelineId.toString());
    
    // Check if the agent was populated!
    const slot = res.body.data.slots[0];
    expect(typeof slot.assignedAgents[0]).toBe('object'); // Populated to an object, not just string ID
    expect(slot.assignedAgents[0].name).toBe('Linter Expert');
  });

  it('should return 400 for invalid ID', async () => {
    const res = await request(app)
      .get('/api/v1/pipeline/invalid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
  });
  
  it('should return 404 for non-existent pipeline', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/pipeline/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });
});
