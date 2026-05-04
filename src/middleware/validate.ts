import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Factory that returns an Express middleware validating a specific part
 * of the request against a Zod schema.
 *
 * @param schema - The Zod schema to validate against
 * @param part - Which part of the request to validate ('body' | 'query' | 'params')
 * @returns Express middleware function
 */
export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const formatted = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        data: null,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: formatted,
        },
      });
      return;
    }

    // Replace request part with parsed (and coerced) data
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };
}
