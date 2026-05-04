# Developer Setup Guide

## Prerequisites

- **Bun ≥ 1.0** — [Install Bun](https://bun.sh/docs/installation)
- **Supabase account** — [supabase.com](https://supabase.com) (free tier is sufficient)
- **Node.js ≥ 18** (only needed if you run `tsc` directly; Bun handles TypeScript natively)

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd buildbattle-backend
bun install
```

---

## 2. Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

| Variable | Where to find it |
|---|---|
| `PORT` | Leave as `3000` or change to your preferred port |
| `SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API → service_role secret |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → anon public |
| `SUPABASE_JWT_SECRET` | Supabase dashboard → Settings → API → JWT Settings → JWT Secret |
| `OPEN_FOOD_FACTS_USER_AGENT` | Set to `YourAppName/1.0 (your@email.com)` |

> ⚠️ **Never commit `.env` to version control.** It is listed in `.gitignore`.

---

## 3. Supabase Setup

Follow the full database setup guide:

📄 **[supabase/SETUP.md](./supabase/SETUP.md)**

This covers:
- Creating your Supabase project
- Enabling email auth
- Running all SQL migrations (tables, RLS, trigger)

---

## 4. Run Development Server

```bash
bun run dev
```

This starts the server with `--watch` for hot reload on file changes.
The API will be available at `http://localhost:3000`.

Health check: `GET http://localhost:3000/` should return:
```json
{ "data": { "status": "ok", "service": "Health & Fitness API" }, "error": null }
```

---

## 5. Run Production Server

```bash
bun run start
```

---

## 6. Type Check

Verify there are no TypeScript errors without running the server:

```bash
bun run typecheck
```

---

## Project Structure

```
src/
├── index.ts              # Entry point — starts the HTTP server
├── app.ts                # Express app: middleware + route mounts
├── config/
│   └── supabase.ts       # Supabase client initialisation
├── middleware/
│   ├── auth.ts           # JWT verification via Supabase Auth
│   ├── validate.ts       # Zod request validation middleware
│   └── errorHandler.ts   # Global error handler
├── routes/               # One file per resource
│   ├── auth.ts           # POST /auth/register, /login, /refresh
│   ├── profile.ts        # GET/PUT /profile
│   ├── goals.ts          # GET/PUT /goals
│   ├── food.ts           # GET /food/search, /food/barcode/:code
│   ├── diary.ts          # GET/POST/DELETE /diary
│   ├── water.ts          # GET/POST /water
│   ├── steps.ts          # GET/POST /steps
│   └── progress.ts       # GET /progress/summary, /weight-history, POST /progress/weight
├── services/
│   ├── tdee.ts           # BMR & TDEE calculation (Mifflin-St Jeor)
│   ├── foodApi.ts        # Open Food Facts API integration
│   └── goals.ts          # Auto-generate goal targets from biometrics
├── schemas/
│   └── index.ts          # All Zod validation schemas
└── types/
    └── index.ts          # Shared TypeScript interfaces & AppError class
```

---

## API Response Format

All responses follow a consistent envelope:

```json
// Success
{ "data": { ... }, "error": null }

// Error
{ "data": null, "error": { "message": "...", "code": "..." } }
```

---

## Authentication

Send the Supabase access token as a Bearer token on every authenticated request:

```
Authorization: Bearer <access_token>
```

Tokens are obtained from `POST /auth/login` or `POST /auth/register`.
