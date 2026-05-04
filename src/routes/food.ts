import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { FoodSearchSchema } from '../schemas/index.js';
import { searchByName, lookupBarcode } from '../services/foodApi.js';
import { AppError } from '../types/index.js';

const router = Router();

router.use(authenticate);

// ─── GET /food/search?q= ──────────────────────────────────────────────────────

router.get(
  '/search',
  validate(FoodSearchSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = String(req.query.q);
      const results = await searchByName(q);
      res.json({ data: results, error: null });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /food/barcode/:barcode ───────────────────────────────────────────────

router.get('/barcode/:barcode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barcode = String(req.params.barcode);

    if (!barcode || !/^\d{8,14}$/.test(barcode)) {
      throw new AppError(
        'Invalid barcode format — must be 8–14 digits',
        400,
        'INVALID_BARCODE'
      );
    }

    const product = await lookupBarcode(barcode);

    if (!product) {
      throw new AppError('Product not found for this barcode', 404, 'PRODUCT_NOT_FOUND');
    }

    res.json({ data: product, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
