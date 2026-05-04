import { Goals, UserProfile } from '../types/index.js';
import { calculateBMR, calculateTDEE, adjustForGoal, deriveMacros } from './tdee.js';

/**
 * Generates a complete Goals object for a user based on their profile biometrics.
 *
 * Falls back to safe defaults for users with incomplete profiles.
 * Called on registration and whenever a user updates their profile.
 *
 * @param profile - The user's complete profile (may have null biometric fields)
 * @returns A partial Goals object (without id, user_id, updated_at) ready for DB upsert
 */
export function generateGoals(
  profile: UserProfile
): Omit<Goals, 'id' | 'user_id' | 'updated_at'> {
  const DEFAULT_KCAL = 2000;
  const DEFAULT_WATER_ML = 2500;
  const DEFAULT_STEPS = 10000;

  // If biometrics are incomplete, return safe defaults
  if (
    profile.age === null ||
    profile.sex === null ||
    profile.height_cm === null ||
    profile.weight_kg === null ||
    profile.activity_level === null ||
    profile.goal_type === null
  ) {
    const macros = deriveMacros(DEFAULT_KCAL);
    return {
      target_weight_kg: null,
      target_date: null,
      ...macros,
      water_ml: DEFAULT_WATER_ML,
      steps: DEFAULT_STEPS,
    };
  }

  // Calculate personalised targets
  const bmr = calculateBMR(profile.age, profile.sex, profile.height_cm, profile.weight_kg);
  const tdee = calculateTDEE(bmr, profile.activity_level);
  const adjustedKcal = adjustForGoal(tdee, profile.goal_type);
  const macros = deriveMacros(adjustedKcal);

  // Water target: 35 ml per kg of body weight (minimum 2000 ml)
  const water_ml = Math.max(Math.round(profile.weight_kg * 35), 2000);

  return {
    target_weight_kg: null,
    target_date: null,
    ...macros,
    water_ml,
    steps: DEFAULT_STEPS,
  };
}
