// tests/evaluate.test.js
// Integration test for Phase 5 standalone Evaluation endpoint

require('dotenv').config();
const request = require('supertest');
const { TEST_RECAPTCHA_TOKEN } = require('./helpers');
const mongoose = require('mongoose');
const claudeService = require('../services/claudeService');

jest.mock('../services/claudeService');

const MONGO_URI = process.env.MONGO_URI_TEST;
const RUN_ID = Date.now();
const TEST_USER = {
  email: `evaluatetest+${RUN_ID}@spinx.dev`,
  password: 'Test@12345',
  name: 'Evaluate Test User',
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

    .send({ email: TEST_USER.email, password: TEST_USER.password, recaptchaToken: TEST_RECAPTCHA_TOKEN });

    .send({ email: TEST_USER.email, password: TEST_USER.password, recaptchaToken: 'dev-bypass' });

  token = loginRes.body.accessToken;
});

afterAll(async () => {
  try {
    if (userId) {
      await User.findByIdAndDelete(userId);
    }
  } catch (_err) {}
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('POST /api/v1/evaluate', () => {

  it('should successfully evaluate and return scores 200', async () => {
    claudeService.evaluateOutput.mockResolvedValueOnce({
      accuracy: 100, completeness: 90, format: 85, hallucination: 100, total: 95
    });

    const res = await request(app)
      .post('/api/v1/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        task: 'Write a poem',
        output: 'Roses are red.',
        rubric: 'Must rhyme'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(95);
    
    expect(claudeService.evaluateOutput).toHaveBeenCalledWith(
        'Write a poem',
        'Roses are red.',
        'Must rhyme'
    );
  });

  it('should fail with 400 validation error if task is missing', async () => {
    const res = await request(app)
      .post('/api/v1/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        output: 'Missing task.'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
