import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ProfileUpdateSchema } from '../schemas/index.js';
import { AppError, UserProfile } from '../types/index.js';
import { generateGoals } from '../services/goals.js';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// ─── GET /profile ─────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    res.json({ data, error: null });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /profile ─────────────────────────────────────────────────────────────

router.put(
  '/',
  validate(ProfileUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const updates = req.body as Partial<UserProfile>;

      // Update the profile row
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (updateError || !updatedProfile) {
        throw new AppError(
          updateError?.message ?? 'Failed to update profile',
          422,
          'UPDATE_FAILED'
        );
      }

      // Recalculate and overwrite goals whenever biometrics change
      const goalTargets = generateGoals(updatedProfile as UserProfile);

      const { error: goalsError } = await supabaseAdmin
        .from('goals')
        .upsert(
          { user_id: userId, ...goalTargets, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

      if (goalsError) {
        console.error('[Profile] Failed to recalculate goals:', goalsError.message);
      }

      res.json({ data: updatedProfile, error: null });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
