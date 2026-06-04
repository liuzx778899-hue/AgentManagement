/**
 * Request Tracing Middleware Tests
 *
 * Issue: #34 - Request headers support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requestTracing, idempotencyCheck, tenantIsolation } from '../../../server/middleware/requestTracing';

describe('requestTracing middleware', () => {
  let app: express.Application;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestTracing', () => {
    it('should generate X-Request-Id if not provided', async () => {
      app.use(requestTracing);
      app.get('/test', (req, res) => {
        res.json({ requestId: req.requestId });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.requestId).toMatch(/^req-\d+-[a-z0-9]+$/);
      expect(response.headers['x-request-id']).toBe(response.body.requestId);
    });

    it('should use provided X-Request-Id header', async () => {
      app.use(requestTracing);
      app.get('/test', (req, res) => {
        res.json({ requestId: req.requestId });
      });

      const response = await request(app)
        .get('/test')
        .set('X-Request-Id', 'custom-request-id');

      expect(response.status).toBe(200);
      expect(response.body.requestId).toBe('custom-request-id');
      expect(response.headers['x-request-id']).toBe('custom-request-id');
    });

    it('should parse X-Idempotency-Key header', async () => {
      app.use(requestTracing);
      app.post('/test', (req, res) => {
        res.json({ idempotencyKey: req.idempotencyKey });
      });

      const response = await request(app)
        .post('/test')
        .set('X-Idempotency-Key', 'idem-key-123');

      expect(response.status).toBe(200);
      expect(response.body.idempotencyKey).toBe('idem-key-123');
    });

    it('should parse X-Tenant-Id header', async () => {
      app.use(requestTracing);
      app.get('/test', (req, res) => {
        res.json({ tenantId: req.tenantId });
      });

      const response = await request(app)
        .get('/test')
        .set('X-Tenant-Id', 'tenant-456');

      expect(response.status).toBe(200);
      expect(response.body.tenantId).toBe('tenant-456');
    });

    it('should set idempotencyKey to undefined if not provided', async () => {
      app.use(requestTracing);
      app.get('/test', (req, res) => {
        res.json({ idempotencyKey: req.idempotencyKey });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.idempotencyKey).toBeUndefined();
    });

    it('should set tenantId to undefined if not provided', async () => {
      app.use(requestTracing);
      app.get('/test', (req, res) => {
        res.json({ tenantId: req.tenantId });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.tenantId).toBeUndefined();
    });
  });

  describe('idempotencyCheck', () => {
    it('should log idempotency key when provided', async () => {
      app.use(requestTracing, idempotencyCheck);
      app.post('/test', (req, res) => {
        res.json({ ok: true });
      });

      await request(app)
        .post('/test')
        .set('X-Idempotency-Key', 'idem-key-123');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Idempotency] Key: idem-key-123')
      );
    });

    it('should not log when idempotency key is not provided', async () => {
      app.use(requestTracing, idempotencyCheck);
      app.post('/test', (req, res) => {
        res.json({ ok: true });
      });

      await request(app).post('/test');

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[Idempotency]')
      );
    });
  });

  describe('tenantIsolation', () => {
    it('should log tenant ID when provided', async () => {
      app.use(requestTracing, tenantIsolation);
      app.get('/test', (req, res) => {
        res.json({ ok: true });
      });

      await request(app)
        .get('/test')
        .set('X-Tenant-Id', 'tenant-789');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Tenant] ID: tenant-789')
      );
    });

    it('should not log when tenant ID is not provided', async () => {
      app.use(requestTracing, tenantIsolation);
      app.get('/test', (req, res) => {
        res.json({ ok: true });
      });

      await request(app).get('/test');

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[Tenant]')
      );
    });
  });
});
