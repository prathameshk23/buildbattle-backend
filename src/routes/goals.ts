import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { GoalsUpdateSchema } from '../schemas/index.js';
import { AppError } from '../types/index.js';

const router = Router();

router.use(authenticate);

// ─── GET /goals ───────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new AppError('Goals not found', 404, 'GOALS_NOT_FOUND');
    }

    res.json({ data, error: null });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /goals ───────────────────────────────────────────────────────────────

router.put(
  '/',
  validate(GoalsUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from('goals')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !data) {
        throw new AppError(
          error?.message ?? 'Failed to update goals',
          422,
          'UPDATE_FAILED'
        );
      }

      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
