import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { z, ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ValidationError(messages);
      }
      throw error;
    }
  };
}

// Common validation schemas
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => parseInt(v || '1', 10)),
    limit: z.string().optional().transform((v) => Math.min(parseInt(v || '20', 10), 100)),
    sort: z.string().optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export const searchSchema = paginationSchema.extend({
  query: paginationSchema.shape.query.extend({
    q: z.string().optional(),
    type: z.string().optional(),
    tags: z.string().optional(),
    isFavorite: z.string().optional().transform((v) => v === 'true'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const clipboardCreateSchema = z.object({
  body: z.object({
    content: z.string().min(1),
    type: z.enum(['text', 'code', 'image', 'url', 'file', 'color', 'email', 'phone', 'json', 'html', 'markdown']).default('text'),
    title: z.string().optional(),
    sourceApp: z.string().optional(),
    sourceUrl: z.string().optional(),
    language: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isFavorite: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    deviceId: z.string().min(1),
  }),
});

export const clipboardUpdateSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isFavorite: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    type: z.string().optional(),
    language: z.string().optional(),
  }),
});
