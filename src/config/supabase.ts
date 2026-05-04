import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Ensure SUPABASE_URL, ' +
    'SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY are set in .env'
  );
}

/**
 * Service-role Supabase client — bypasses RLS.
 * Use this for all server-side database operations.
 * NEVER expose this to client code.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Anon Supabase client — used only for validating user JWTs.
 */
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
