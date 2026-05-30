import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('API Error:', err);

  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
      recoverable: true,
    },
  });
}
