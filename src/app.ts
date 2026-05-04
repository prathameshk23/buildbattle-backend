import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import goalsRouter from './routes/goals.js';
import foodRouter from './routes/food.js';
import diaryRouter from './routes/diary.js';
import waterRouter from './routes/water.js';
import stepsRouter from './routes/steps.js';
import progressRouter from './routes/progress.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '12mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ data: { status: 'ok', service: 'Health & Fitness API' }, error: null });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/goals', goalsRouter);
app.use('/food', foodRouter);
app.use('/diary', diaryRouter);
app.use('/water', waterRouter);
app.use('/steps', stepsRouter);
app.use('/progress', progressRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ data: null, error: { message: 'Route not found', code: 'NOT_FOUND' } });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
