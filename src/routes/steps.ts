import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { StepLogSchema, DateQuerySchema } from '../schemas/index.js';
import { AppError } from '../types/index.js';

const router = Router();

router.use(authenticate);

// ─── GET /steps?date=YYYY-MM-DD ───────────────────────────────────────────────

router.get(
  '/',
  validate(DateQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { date } = req.query as { date: string };

      const { data, error } = await supabaseAdmin
        .from('step_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (error) {
        throw new AppError(error.message, 422, 'DB_ERROR');
      }

      res.json({
        data: { date, count: data?.count ?? 0, log: data ?? null },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /steps — upsert (one row per user per day) ─────────────────────────

router.post(
  '/',
  validate(StepLogSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { date, count } = req.body as { date: string; count: number };

      const { data, error } = await supabaseAdmin
        .from('step_logs')
        .upsert(
          { user_id: userId, date, count, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single();

      if (error || !data) {
        throw new AppError(error?.message ?? 'Failed to log steps', 422, 'UPSERT_FAILED');
      }

      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
