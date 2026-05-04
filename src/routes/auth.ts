import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin, supabaseAuth } from '../config/supabase.js';
import { validate } from '../middleware/validate.js';
import { RegisterSchema, LoginSchema, RefreshSchema } from '../schemas/index.js';
import { AppError } from '../types/index.js';
import { generateGoals } from '../services/goals.js';

const router = Router();

// ─── POST /auth/register ──────────────────────────────────────────────────────

router.post(
  '/register',
  validate(RegisterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, display_name } = req.body as {
        email: string;
        password: string;
        display_name?: string;
      };

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new AppError(
          authError?.message ?? 'Registration failed',
          400,
          'REGISTRATION_FAILED'
        );
      }

      const userId = authData.user.id;

      // Build a blank profile (trigger may also do this, but we ensure it here)
      const blankProfile = {
        id: userId,
        display_name: display_name ?? null,
        age: null,
        sex: null,
        height_cm: null,
        weight_kg: null,
        activity_level: null,
        goal_type: null,
      };

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(blankProfile, { onConflict: 'id' });

      if (profileError) {
        console.error('[Auth] Failed to create profile row:', profileError.message);
        // Non-fatal — the DB trigger should also create it
      }

      // Generate default goals
      const goalTargets = generateGoals(blankProfile as Parameters<typeof generateGoals>[0]);

      const { error: goalsError } = await supabaseAdmin.from('goals').upsert(
        { user_id: userId, ...goalTargets },
        { onConflict: 'user_id' }
      );

      if (goalsError) {
        console.error('[Auth] Failed to create goals row:', goalsError.message);
      }

      res.status(201).json({
        data: {
          user: { id: userId, email: authData.user.email },
          session: authData.session,
        },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post(
  '/login',
  validate(LoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };

      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        throw new AppError(
          error?.message ?? 'Invalid credentials',
          401,
          'INVALID_CREDENTIALS'
        );
      }

      res.json({
        data: {
          user: { id: data.user.id, email: data.user.email },
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

router.post(
  '/refresh',
  validate(RefreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body as { refresh_token: string };

      const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token });

      if (error || !data.session) {
        throw new AppError(
          error?.message ?? 'Failed to refresh session',
          401,
          'REFRESH_FAILED'
        );
      }

      res.json({
        data: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
