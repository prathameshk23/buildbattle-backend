// ─── Express Request Augmentation ─────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
}

// ─── Profile ───────────────────────────────────────────────────────────────────

export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type GoalType = 'weight_loss' | 'maintenance' | 'weight_gain';

export interface UserProfile {
  id: string;
  display_name: string | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal_type: GoalType | null;
  created_at: string;
  updated_at: string;
}

// ─── Goals ─────────────────────────────────────────────────────────────────────

export interface Goals {
  id: string;
  user_id: string;
  target_weight_kg: number | null;
  target_date: string | null;
  daily_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  steps: number;
  updated_at: string;
}

// ─── Diary ─────────────────────────────────────────────────────────────────────

export type MealSection =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'evening_snack'
  | 'dinner';

export interface DiaryEntry {
  id: string;
  user_id: string;
  date: string;
  meal_section: MealSection;
  food_name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_g: number;
  quantity: number;
  created_at: string;
}

// ─── Water ─────────────────────────────────────────────────────────────────────

export interface WaterLog {
  id: string;
  user_id: string;
  date: string;
  amount_ml: number;
  logged_at: string;
}

// ─── Steps ─────────────────────────────────────────────────────────────────────

export interface StepLog {
  id: string;
  user_id: string;
  date: string;
  count: number;
  updated_at: string;
}

// ─── Weight ────────────────────────────────────────────────────────────────────

export interface WeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  logged_at: string;
}

// ─── Food ──────────────────────────────────────────────────────────────────────

export interface FoodItem {
  name: string;
  brand: string | null;
  kcal_per_100g: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  serving_size_g: number | null;
}

// ─── TDEE ──────────────────────────────────────────────────────────────────────

export interface MacroTargets {
  daily_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// ─── App Error ─────────────────────────────────────────────────────────────────

/**
 * Operational error class — used to signal known errors to the global error handler.
 * All thrown errors in route/service code should be of this type.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
