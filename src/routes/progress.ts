import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ProgressQuerySchema, WeightLogSchema } from '../schemas/index.js';
import { AppError } from '../types/index.js';

const router = Router();

router.use(authenticate);

// ─── GET /progress/summary?start=&end= ───────────────────────────────────────

router.get(
  '/summary',
  validate(ProgressQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { start, end } = req.query as { start: string; end: string };

      // Aggregate diary entries
      const { data: diaryData, error: diaryError } = await supabaseAdmin
        .from('diary_entries')
        .select('date, kcal, protein_g, carbs_g, fat_g')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end);

      if (diaryError) throw new AppError(diaryError.message, 422, 'DB_ERROR');

      // Aggregate water logs
      const { data: waterData, error: waterError } = await supabaseAdmin
        .from('water_logs')
        .select('date, amount_ml')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end);

      if (waterError) throw new AppError(waterError.message, 422, 'DB_ERROR');

      // Aggregate step logs
      const { data: stepData, error: stepError } = await supabaseAdmin
        .from('step_logs')
        .select('date, count')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end);

      if (stepError) throw new AppError(stepError.message, 422, 'DB_ERROR');

      // Compute totals
      const totals = (diaryData ?? []).reduce(
        (acc, entry) => ({
          kcal: acc.kcal + entry.kcal,
          protein_g: acc.protein_g + entry.protein_g,
          carbs_g: acc.carbs_g + entry.carbs_g,
          fat_g: acc.fat_g + entry.fat_g,
        }),
        { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      );

      const total_water_ml = (waterData ?? []).reduce(
        (sum, log) => sum + log.amount_ml,
        0
      );

      const total_steps = (stepData ?? []).reduce((sum, log) => sum + log.count, 0);

      const days = (stepData ?? []).length || 1;

      res.json({
        data: {
          date_range: { start, end },
          totals: {
            ...totals,
            water_ml: total_water_ml,
            steps: total_steps,
          },
          averages: {
            kcal_per_day: Math.round(totals.kcal / days),
            water_ml_per_day: Math.round(total_water_ml / days),
            steps_per_day: Math.round(total_steps / days),
          },
        },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /progress/weight-history ─────────────────────────────────────────────

router.get('/weight-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) {
      throw new AppError(error.message, 422, 'DB_ERROR');
    }

    res.json({ data: data ?? [], error: null });
  } catch (err) {
    next(err);
  }
});

// ─── POST /progress/weight ────────────────────────────────────────────────────

router.post(
  '/weight',
  validate(WeightLogSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from('weight_logs')
        .insert({ user_id: userId, ...req.body })
        .select()
        .single();

      if (error || !data) {
        throw new AppError(error?.message ?? 'Failed to log weight', 422, 'INSERT_FAILED');
      }

      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
