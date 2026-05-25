import { Request, Response } from 'express';
import { clipboardService } from '../services/clipboardService';
import { encryptionService } from '../services/encryptionService';
import { asyncHandler } from '../middleware/errorHandler';

export const clipboardController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { content, type, title, sourceApp, sourceUrl, language, tags, isFavorite, isPinned, deviceId } = req.body;

    const { content: processedContent, isEncrypted } = encryptionService.encryptIfSensitive(content);

    const item = await clipboardService.create(userId, {
      content: processedContent,
      type: type || 'text',
      title,
      sourceApp,
      sourceUrl,
      language,
      tags,
      isFavorite,
      isPinned,
      deviceId: deviceId || 'web',
    });

    res.status(201).json({ success: true, data: { ...item, isEncrypted } });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const params = {
      q: req.query.q as string,
      type: req.query.type as string,
      tags: req.query.tags as string,
      isFavorite: req.query.isFavorite === 'true',
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: parseInt(req.query.page as string || '1', 10),
      limit: parseInt(req.query.limit as string || '20', 10),
      sort: (req.query.sort as string) || 'createdAt',
      order: (req.query.order as 'asc' | 'desc') || 'desc',
    };

    const result = await clipboardService.list(userId, params);
    res.json({ success: true, data: result.items, pagination: result.pagination });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const item = await clipboardService.getById(userId, req.params.id);
    res.json({ success: true, data: item });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const item = await clipboardService.update(userId, req.params.id, req.body);
    res.json({ success: true, data: item });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    await clipboardService.delete(userId, req.params.id);
    res.json({ success: true, message: 'Deleted successfully' });
  }),

  bulkDelete: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    await clipboardService.bulkDelete(userId, req.body.ids);
    res.json({ success: true, message: 'Items deleted' });
  }),

  toggleFavorite: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const item = await clipboardService.toggleFavorite(userId, req.params.id);
    res.json({ success: true, data: item });
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const stats = await clipboardService.getStats(userId);
    res.json({ success: true, data: stats });
  }),
};
