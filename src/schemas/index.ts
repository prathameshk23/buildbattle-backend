import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(1).max(100).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// ─── Profile ───────────────────────────────────────────────────────────────────

export const ActivityLevelEnum = z.enum([
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active',
]);

export const GoalTypeEnum = z.enum(['weight_loss', 'maintenance', 'weight_gain']);

export const SexEnum = z.enum(['male', 'female']);

export const ProfileUpdateSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  age: z.number().int().min(10).max(120).optional(),
  sex: SexEnum.optional(),
  height_cm: z.number().min(50).max(300).optional(),
  weight_kg: z.number().min(20).max(500).optional(),
  activity_level: ActivityLevelEnum.optional(),
  goal_type: GoalTypeEnum.optional(),
});

// ─── Goals ─────────────────────────────────────────────────────────────────────

export const GoalsUpdateSchema = z.object({
  target_weight_kg: z.number().min(20).max(500).optional(),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
    .optional(),
  daily_kcal: z.number().int().min(500).max(10000).optional(),
  protein_g: z.number().int().min(0).max(1000).optional(),
  carbs_g: z.number().int().min(0).max(2000).optional(),
  fat_g: z.number().int().min(0).max(1000).optional(),
  water_ml: z.number().int().min(0).max(20000).optional(),
  steps: z.number().int().min(0).max(100000).optional(),
});

// ─── Diary ─────────────────────────────────────────────────────────────────────

export const MealSectionEnum = z.enum([
  'breakfast',
  'morning_snack',
  'lunch',
  'evening_snack',
  'dinner',
]);

export const DiaryEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  meal_section: MealSectionEnum,
  food_name: z.string().min(1).max(200),
  kcal: z.number().min(0),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  serving_g: z.number().min(0),
  quantity: z.number().min(0.1),
});

export const DiaryQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
});

// ─── Water ─────────────────────────────────────────────────────────────────────

export const WaterLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  amount_ml: z.number().int().min(1).max(5000),
});

export const DateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
});

// ─── Steps ─────────────────────────────────────────────────────────────────────

export const StepLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  count: z.number().int().min(0).max(200000),
});

// ─── Progress ──────────────────────────────────────────────────────────────────

export const ProgressQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
});

export const WeightLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  weight_kg: z.number().min(20).max(500),
});

// ─── Food ──────────────────────────────────────────────────────────────────────

export const FoodSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
});

export const FoodScanSchema = z.object({
  image_base64: z.string().min(100, 'Image data is required'),
  mime_type: z
    .string()
    .regex(/^image\/(png|jpe?g|webp)$/i, 'Use PNG, JPG, JPEG, or WEBP image')
    .default('image/jpeg'),
});
