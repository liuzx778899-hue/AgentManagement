import express from 'express';
import cors from 'cors';
import { createRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  // CORS - only allow localhost:5173 (Vite dev server)
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, status: 'healthy' });
  });

  // API routes
  app.use('/api', createRouter());

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}