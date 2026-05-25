import { Request, Response } from 'express';
import { syncService } from '../services/syncService';
import { asyncHandler } from '../middleware/errorHandler';

export const syncController = {
  sync: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { deviceId, lastSyncAt, items, deletedIds } = req.body;

    const result = await syncService.sync(
      userId,
      deviceId || 'unknown',
      lastSyncAt || new Date(0).toISOString(),
      items || [],
      deletedIds || []
    );

    res.json({ success: true, data: result });
  }),
};
