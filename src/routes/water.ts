import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { WaterLogSchema, DateQuerySchema } from '../schemas/index.js';
import { AppError } from '../types/index.js';

const router = Router();

router.use(authenticate);

// ─── GET /water?date=YYYY-MM-DD ───────────────────────────────────────────────

router.get(
  '/',
  validate(DateQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { date } = req.query as { date: string };

      const { data, error } = await supabaseAdmin
        .from('water_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('logged_at', { ascending: true });

      if (error) {
        throw new AppError(error.message, 422, 'DB_ERROR');
      }

      const total_ml = (data ?? []).reduce((sum, log) => sum + log.amount_ml, 0);

      res.json({
        data: { date, total_ml, logs: data ?? [] },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /water ──────────────────────────────────────────────────────────────

router.post(
  '/',
  validate(WaterLogSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from('water_logs')
        .insert({ user_id: userId, ...req.body })
        .select()
        .single();

      if (error || !data) {
        throw new AppError(error?.message ?? 'Failed to log water intake', 422, 'INSERT_FAILED');
      }

      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
