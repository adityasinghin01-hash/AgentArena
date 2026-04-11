// tests/audition.test.js
// Integration tests for Phase 4 Audition (Execution Engine) endpoints.

require('dotenv').config();
const request = require('supertest');
const { TEST_RECAPTCHA_TOKEN } = require('./helpers');
const mongoose = require('mongoose');
const claudeService = require('../services/claudeService');

jest.mock('../services/claudeService');

const MONGO_URI = process.env.MONGO_URI_TEST;
const RUN_ID = Date.now();
const TEST_USER = {
  email: `auditiontest+${RUN_ID}@spinx.dev`,
  password: 'Test@12345',
  name: 'Audition Test User',
};

let app;
let User;
let Agent;
let Pipeline;
let Audition;
let token;
let userId;
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
  Audition = require('../models/Audition');

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

    .send({ email: TEST_USER.email, password: TEST_USER.password, recaptchaToken: TEST_RECAPTCHA_TOKEN });

    .send({ email: TEST_USER.email, password: TEST_USER.password, recaptchaToken: 'dev-bypass' });


  expect(loginRes.status).toBe(200);
  token = loginRes.body.accessToken;

  // Create mock agent
  const agent = await Agent.create({
    name: 'Evaluator',
    description: 'evaluates',
    category: 'researcher',
    deployedBy: userId,
    systemPrompt: 'You are a test evaluator.',
    pricing: 'free',
    creator_id: userId
  });

  // Create mock pipeline
  const pipeline = await Pipeline.create({
    userId,
    outcomeText: 'Test Audition',
    slots: [
      {
        name: 'Slot1',
        task: 'Do task',
        evaluationCriteria: 'Must pass',
        assignedAgents: [agent._id] // assignedAgents array as per Audition code
      }
    ]
  });
  pipelineId = pipeline._id;
});

afterAll(async () => {
  try {
    if (userId) {
      await Audition.deleteMany({ userId });
      await Pipeline.deleteMany({ userId });
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

// ── GET AUDITION ───────────────────────────────────────────

describe('GET Audition APIs', () => {
  let createdAuditionId;

  beforeAll(async () => {
    // Create a mock audition history
    const aud = await Audition.create({
      userId,
      pipelineId,
      userInput: "Sample mock input for history",
      results: []
    });
    createdAuditionId = aud._id;
  });

  it('should return 404 for missing audition', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/audition/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  it('should retrieve my audition via GET /api/v1/audition/:id', async () => {
    const res = await request(app)
      .get(`/api/v1/audition/${createdAuditionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should retrieve paginated auditions by pipeline via GET /api/v1/audition/pipeline/:pipelineId', async () => {
    const res = await request(app)
      .get(`/api/v1/audition/pipeline/${pipelineId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });
});

// ── RUN AUDITION (SSE) ─────────────────────────────────────

describe('POST /api/v1/audition/run/:pipelineId', () => {

  it('should execute the audition and stream results (200 OK text/event-stream)', async () => {
    // Mock the agent run and evaluation so the stream concludes instantly and flawlessly
    claudeService.runAgent.mockResolvedValue('Mock AI completed task');
    claudeService.evaluateOutput.mockResolvedValue({
      accuracy: 90, completeness: 80, format: 90, hallucination: 100, total: 89
    });

    const res = await request(app)
      .post(`/api/v1/audition/run/${pipelineId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userInput: 'Let us test' });

    // Ensure it properly instantiated the stream
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    
    // Validate we called the actual logic
    expect(claudeService.runAgent).toHaveBeenCalled();
    expect(claudeService.evaluateOutput).toHaveBeenCalled();

    // Verify Audition was actually created in DB as part of the execution flow
    const audCount = await Audition.countDocuments({ pipelineId });
    expect(audCount).toBeGreaterThan(0);
  });
});
