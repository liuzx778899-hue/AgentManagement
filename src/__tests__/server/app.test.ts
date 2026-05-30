import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { errorHandler } from '../../server/middleware/errorHandler';

describe('Server App', () => {
  let app: express.Express;

  beforeEach(async () => {
    // Import the app factory fresh for each test
    const { createApp } = await import('../../server/app');
    app = await createApp();
  });

  describe('Health Check', () => {
    it('should return healthy status on /api/health', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        status: 'healthy',
      });
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from localhost:5173', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should not allow requests from other origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://evil.com');

      // CORS should not allow this origin
      expect(response.headers['access-control-allow-origin']).not.toBe('http://evil.com');
    });
  });

  describe('Error Handler', () => {
    it('should handle errors and return standardized error response', async () => {
      // Create a minimal Express app to test error handler directly
      const testApp = express();
      testApp.use(cors({ origin: 'http://localhost:5173', credentials: true }));
      testApp.use(express.json());

      // Add a test route that passes an error
      testApp.get('/api/test-error', (_req, _res, next) => {
        next(new Error('Test error'));
      });

      // Add error handler AFTER the routes
      testApp.use(errorHandler);

      const response = await request(testApp)
        .get('/api/test-error')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toMatchObject({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Test error',
          recoverable: true,
        },
      });
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON request bodies', async () => {
      const testBody = { test: 'data', number: 42 };

      // Add a test route that echoes the body
      const { createApp } = await import('../../server/app');
      const testApp = await createApp();
      testApp.post('/api/echo', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(testApp)
        .post('/api/echo')
        .send(testBody)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.received).toEqual(testBody);
    });
  });
});
