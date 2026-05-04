import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { DiaryEntrySchema, DiaryQuerySchema } from '../schemas/index.js';
import { AppError, MealSection } from '../types/index.js';

const router = Router();

router.use(authenticate);

// ─── GET /diary?date=YYYY-MM-DD ───────────────────────────────────────────────

router.get(
  '/',
  validate(DiaryQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { date } = req.query as { date: string };

      const { data, error } = await supabaseAdmin
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: true });

      if (error) {
        throw new AppError(error.message, 422, 'DB_ERROR');
      }

      // Group entries by meal_section
      const sections: Record<MealSection, typeof data> = {
        breakfast: [],
        morning_snack: [],
        lunch: [],
        evening_snack: [],
        dinner: [],
      };

      for (const entry of data ?? []) {
        const section = entry.meal_section as MealSection;
        if (sections[section]) {
          sections[section].push(entry);
        }
      }

      res.json({ data: { date, sections }, error: null });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /diary ──────────────────────────────────────────────────────────────

router.post(
  '/',
  validate(DiaryEntrySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabaseAdmin
        .from('diary_entries')
        .insert({ user_id: userId, ...req.body })
        .select()
        .single();

      if (error || !data) {
        throw new AppError(error?.message ?? 'Failed to add diary entry', 422, 'INSERT_FAILED');
      }

      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /diary/:entryId ───────────────────────────────────────────────────

router.delete('/:entryId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { entryId } = req.params;

    // Verify ownership before deletion
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('diary_entries')
      .select('id, user_id')
      .eq('id', entryId)
      .single();

    if (fetchError || !existing) {
      throw new AppError('Diary entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    if (existing.user_id !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    const { error } = await supabaseAdmin
      .from('diary_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      throw new AppError(error.message, 422, 'DELETE_FAILED');
    }

    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
