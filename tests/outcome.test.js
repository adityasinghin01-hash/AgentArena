// tests/outcome.test.js
// Integration tests for the Phase 3 Outcome Engine endpoints.
// We mock the claudeService so we don't make real AI API calls.

require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const claudeService = require('../services/claudeService');

// Mock the Claude Service completely
jest.mock('../services/claudeService');

const MONGO_URI = process.env.MONGO_URI_TEST;
const RUN_ID = Date.now();
const TEST_USER = {
  email: `outcometest+${RUN_ID}@spinx.dev`,
  password: 'Test@12345',
  name: 'Outcome Test User',
};

let app;
let User;
let token;
let userId;

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
});

afterAll(async () => {
  try {
    if (userId) {
      await User.findByIdAndDelete(userId);
    }
  } catch (err) {
    console.warn('Teardown warning:', err.message);
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// ── OUTCOME DECOMPOSE ──────────────────────────────────────

describe('POST /api/v1/outcome/decompose', () => {
  it('should successfully decompose outcome into slots and return 200', async () => {
    // Setup our deterministic mock response
    claudeService.decomposeOutcome.mockResolvedValueOnce({
      slots: [
        {
          name: 'Linter',
          task: 'Check for syntax errors.',
          evaluation_criteria: 'Zero syntax errors remaining.'
        },
        {
          name: 'Writer',
          task: 'Write the documentation.',
          evaluation_criteria: 'Clear, concise English.'
        }
      ]
    });

    const res = await request(app)
      .post('/api/v1/outcome/decompose')
      .set('Authorization', `Bearer ${token}`)
      .send({
        outcomeText: 'Audit my code and write documentation for it.'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slots).toHaveLength(2);
    expect(res.body.data.slots[0].name).toBe('Linter');
    
    // Ensure we actually called the mock!
    expect(claudeService.decomposeOutcome).toHaveBeenCalledTimes(1);
    expect(claudeService.decomposeOutcome).toHaveBeenCalledWith('Audit my code and write documentation for it.');
  });

  it('should return 400 if outcomeText is missing or empty', async () => {
    const res = await request(app)
      .post('/api/v1/outcome/decompose')
      .set('Authorization', `Bearer ${token}`)
      .send({ outcomeText: '   ' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
  
  it('should return 500 if the AI service throws an error', async () => {
    claudeService.decomposeOutcome.mockRejectedValueOnce(new Error('AI is down'));
    
    const res = await request(app)
      .post('/api/v1/outcome/decompose')
      .set('Authorization', `Bearer ${token}`)
      .send({ outcomeText: 'Some valid prompt' });
      
    // Usually mapped to 500 or 502 depending on error handler
    expect(res.statusCode).toBeGreaterThanOrEqual(500); 
  });
});
