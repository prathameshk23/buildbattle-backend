import { ActivityLevel, GoalType, MacroTargets, Sex } from '../types/index.js';

// ─── Activity Multipliers ──────────────────────────────────────────────────────

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

// ─── Goal Adjustments (kcal/day) ──────────────────────────────────────────────

const GOAL_ADJUSTMENTS: Record<GoalType, number> = {
  weight_loss: -500,
  maintenance: 0,
  weight_gain: 500,
};

// ─── BMR Calculation ──────────────────────────────────────────────────────────

/**
 * Calculates Basal Metabolic Rate using the Mifflin-St Jeor equation.
 *
 * @param age - Age in years
 * @param sex - Biological sex ('male' | 'female')
 * @param height_cm - Height in centimetres
 * @param weight_kg - Weight in kilograms
 * @returns BMR in kilocalories per day
 */
export function calculateBMR(
  age: number,
  sex: Sex,
  height_cm: number,
  weight_kg: number
): number {
  // Mifflin-St Jeor equation
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

// ─── TDEE Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates Total Daily Energy Expenditure by multiplying BMR by the
 * activity factor for the given activity level.
 *
 * @param bmr - Basal Metabolic Rate in kcal/day
 * @param activityLevel - User's activity level
 * @returns TDEE in kilocalories per day (rounded to nearest integer)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
}

// ─── Goal Adjustment ──────────────────────────────────────────────────────────

/**
 * Adjusts TDEE based on the user's goal:
 * - Weight loss: −500 kcal/day
 * - Maintenance: unchanged
 * - Weight gain: +500 kcal/day
 *
 * Ensures result is never below 1200 kcal/day (safe minimum).
 *
 * @param tdee - Total Daily Energy Expenditure in kcal/day
 * @param goalType - User's weight goal
 * @returns Adjusted daily calorie target
 */
export function adjustForGoal(tdee: number, goalType: GoalType): number {
  const adjusted = tdee + GOAL_ADJUSTMENTS[goalType];
  return Math.max(adjusted, 1200);
}

// ─── Macro Derivation ─────────────────────────────────────────────────────────

/**
 * Derives default macro targets from a daily calorie goal.
 *
 * Distribution:
 * - Protein: 30% of calories (4 kcal/g)
 * - Carbohydrates: 45% of calories (4 kcal/g)
 * - Fat: 25% of calories (9 kcal/g)
 *
 * @param dailyKcal - Daily calorie target
 * @returns Object containing daily_kcal, protein_g, carbs_g, fat_g
 */
export function deriveMacros(dailyKcal: number): MacroTargets {
  return {
    daily_kcal: Math.round(dailyKcal),
    protein_g: Math.round((dailyKcal * 0.30) / 4),
    carbs_g: Math.round((dailyKcal * 0.45) / 4),
    fat_g: Math.round((dailyKcal * 0.25) / 9),
  };
}
