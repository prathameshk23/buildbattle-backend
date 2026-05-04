# Supabase Setup Guide

Follow these steps in order to configure your Supabase project for the Health & Fitness API.

---

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose an organisation, set a project name, database password, and region
4. Wait for the project to finish provisioning (~2 minutes)

---

## Step 2 — Enable Email Authentication

1. In your project dashboard, go to **Authentication → Providers**
2. Click **Email**
3. Ensure **Enable Email provider** is toggled **on**
4. (Optional) Disable **Confirm email** for development if you don't want to set up SMTP

---

## Step 3 — Retrieve API Keys

Go to **Settings → API** and copy:

| Variable | Location |
|---|---|
| `SUPABASE_URL` | **Project URL** |
| `SUPABASE_ANON_KEY` | **Project API keys → anon public** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Project API keys → service_role** ⚠️ Keep secret |
| `SUPABASE_JWT_SECRET` | **JWT Settings → JWT Secret** |

Paste these into your `.env` file.

---

## Step 4 — Run SQL Migrations

Open the **SQL Editor** in your Supabase dashboard and run each block below in order.

---

### 4.1 — Create ENUM Types

```sql
-- Meal sections
CREATE TYPE meal_section AS ENUM (
  'breakfast',
  'morning_snack',
  'lunch',
  'evening_snack',
  'dinner'
);

-- Activity levels
CREATE TYPE activity_level AS ENUM (
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active'
);

-- Goal types
CREATE TYPE goal_type AS ENUM (
  'weight_loss',
  'maintenance',
  'weight_gain'
);

-- Biological sex
CREATE TYPE sex AS ENUM ('male', 'female');
```

---

### 4.2 — Create Tables

```sql
-- profiles: one row per user, linked to auth.users
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  age          INTEGER CHECK (age >= 10 AND age <= 120),
  sex          sex,
  height_cm    NUMERIC(5,2) CHECK (height_cm >= 50 AND height_cm <= 300),
  weight_kg    NUMERIC(6,2) CHECK (weight_kg >= 20 AND weight_kg <= 500),
  activity_level activity_level,
  goal_type    goal_type,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- goals: one row per user
CREATE TABLE goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  target_weight_kg NUMERIC(6,2),
  target_date      DATE,
  daily_kcal       INTEGER NOT NULL DEFAULT 2000,
  protein_g        INTEGER NOT NULL DEFAULT 150,
  carbs_g          INTEGER NOT NULL DEFAULT 225,
  fat_g            INTEGER NOT NULL DEFAULT 56,
  water_ml         INTEGER NOT NULL DEFAULT 2500,
  steps            INTEGER NOT NULL DEFAULT 10000,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- diary_entries: food log entries per user per day
CREATE TABLE diary_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  meal_section meal_section NOT NULL,
  food_name    TEXT NOT NULL,
  kcal         NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein_g    NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g      NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_g        NUMERIC(6,2) NOT NULL DEFAULT 0,
  serving_g    NUMERIC(6,2) NOT NULL DEFAULT 100,
  quantity     NUMERIC(6,2) NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- water_logs: individual water intake log entries
CREATE TABLE water_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  amount_ml  INTEGER NOT NULL CHECK (amount_ml > 0),
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- step_logs: one row per user per day (upserted)
CREATE TABLE step_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- weight_logs: weigh-in history
CREATE TABLE weight_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  weight_kg  NUMERIC(6,2) NOT NULL CHECK (weight_kg >= 20 AND weight_kg <= 500),
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 4.3 — Create Indexes

```sql
-- Diary queries by user + date
CREATE INDEX idx_diary_user_date ON diary_entries(user_id, date);

-- Water queries by user + date
CREATE INDEX idx_water_user_date ON water_logs(user_id, date);

-- Step queries by user + date
CREATE INDEX idx_steps_user_date ON step_logs(user_id, date);

-- Weight history ordered by date
CREATE INDEX idx_weight_user_date ON weight_logs(user_id, date);
```

---

### 4.4 — Create Trigger: Auto-Create Profile on Signup

```sql
-- Function that inserts a blank profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
```

---

## Step 5 — Enable Row Level Security (RLS)

Run this to enable RLS on all tables:

```sql
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs   ENABLE ROW LEVEL SECURITY;
```

---

## Step 6 — Create RLS Policies

```sql
-- ── profiles ──────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow the trigger function (SECURITY DEFINER) to insert on registration
CREATE POLICY "Service role can insert profile"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- ── goals ─────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── diary_entries ─────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own diary entries"
  ON diary_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diary entries"
  ON diary_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diary entries"
  ON diary_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ── water_logs ────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own water logs"
  ON water_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water logs"
  ON water_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── step_logs ─────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own step logs"
  ON step_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own step logs"
  ON step_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own step logs"
  ON step_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- ── weight_logs ───────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own weight logs"
  ON weight_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs"
  ON weight_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Verification Checklist

After running all SQL:

- [ ] All 6 tables appear in **Table Editor**
- [ ] RLS badge shows **Enabled** on each table in **Table Editor → RLS**
- [ ] Policies appear under **Authentication → Policies** for each table
- [ ] Trigger `on_auth_user_created` appears under **Database → Triggers**
- [ ] Test registration via the API creates a row in both `profiles` and `goals`
