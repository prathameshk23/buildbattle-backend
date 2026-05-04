import { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../config/supabase.js';

/**
 * Express middleware that verifies the Supabase JWT from the
 * `Authorization: Bearer <token>` header.
 *
 * On success, attaches `req.user = { id, email }` and calls `next()`.
 * On failure, responds with 401.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      data: null,
      error: { message: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' },
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({
      data: null,
      error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED' },
    });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? '',
  };

  next();
}
