import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types/index.js';

/**
 * Global Express error handler.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * Handles:
 * - `AppError` — known operational errors with status codes
 * - `ZodError` — schema validation failures (unlikely here since validate middleware catches them first)
 * - Unknown errors — returns 500
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known operational error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      data: null,
      error: { message: err.message, code: err.code },
    });
    return;
  }

  // Zod validation error (fallback)
  if (err instanceof ZodError) {
    res.status(400).json({
      data: null,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  // Unknown error — log and return 500
  console.error('[ErrorHandler] Unhandled error:', err);
  res.status(500).json({
    data: null,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
}
