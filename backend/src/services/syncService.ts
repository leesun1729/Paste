import { Clipboard } from '../models/Clipboard';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import mongoose from 'mongoose';

interface SyncItem {
  localId: string;
  serverId?: string;
  type: string;
  content: string;
  preview: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  action: 'create' | 'update' | 'delete';
}

export class SyncService {
  async sync(userId: string, deviceId: string, lastSyncAt: string, items: SyncItem[], deletedIds: string[]) {
    const results: SyncItem[] = [];
    const conflicts: Array<{ localItem: SyncItem; serverItem: SyncItem; resolution: string }> = [];

    // Handle deleted items
    if (deletedIds.length > 0) {
      await Clipboard.updateMany(
        {
          userId: new mongoose.Types.ObjectId(userId),
          _id: { $in: deletedIds.map((id) => new mongoose.Types.ObjectId(id)).filter((id) => mongoose.Types.ObjectId.isValid(id)) },
        },
        { $set: { isDeleted: true, deletedAt: new Date(), isSynced: true } }
      );
    }

    // Handle create/update items
    for (const item of items) {
      try {
        switch (item.action) {
          case 'create': {
            const created = await Clipboard.create({
              userId: new mongoose.Types.ObjectId(userId),
              type: item.type,
              content: item.content,
              preview: item.preview,
              title: item.metadata?.fileName as string,
              contentHash: this.hashContent(item.content),
              tags: [],
              isFavorite: item.isFavorite,
              isPinned: item.isPinned,
              isSynced: true,
              deviceId,
              metadata: item.metadata as Record<string, unknown>,
            });
            results.push({ ...item, serverId: created._id.toString(), action: 'create' });
            break;
          }
          case 'update': {
            if (item.serverId) {
              const updated = await Clipboard.findOneAndUpdate(
                {
                  _id: item.serverId,
                  userId: new mongoose.Types.ObjectId(userId),
                },
                {
                  $set: {
                    content: item.content,
                    preview: item.preview,
                    isFavorite: item.isFavorite,
                    isPinned: item.isPinned,
                    isSynced: true,
                    updatedAt: new Date(item.updatedAt),
                  },
                },
                { new: true }
              );
              if (updated) {
                results.push({ ...item, serverId: updated._id.toString(), action: 'update' });
              }
            }
            break;
          }
          case 'delete': {
            if (item.serverId) {
              await Clipboard.findOneAndUpdate(
                {
                  _id: item.serverId,
                  userId: new mongoose.Types.ObjectId(userId),
                },
                { $set: { isDeleted: true, deletedAt: new Date(), isSynced: true } }
              );
            }
            results.push(item);
            break;
          }
        }
      } catch (error) {
        conflicts.push({
          localItem: item,
          serverItem: item,
          resolution: 'keep_local',
        });
      }
    }

    // Get server changes since last sync
    const serverChanges = await Clipboard.find({
      userId: new mongoose.Types.ObjectId(userId),
      updatedAt: { $gt: new Date(lastSyncAt) },
      isSynced: false,
    }).lean();

    for (const change of serverChanges) {
      await Clipboard.findByIdAndUpdate(change._id, { $set: { isSynced: true } });
    }

    const serverItems: SyncItem[] = serverChanges.map((item) => ({
      localId: '',
      serverId: item._id.toString(),
      type: item.type,
      content: item.content,
      preview: item.preview,
      tags: item.tags.map((t: mongoose.Types.ObjectId) => t.toString()),
      isFavorite: item.isFavorite || false,
      isPinned: item.isPinned || false,
      metadata: item.metadata as Record<string, unknown>,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      action: 'create' as const,
    }));

    // Update device sync time
    await User.findOneAndUpdate(
      { _id: userId, 'devices.deviceId': deviceId },
      { $set: { 'devices.$.lastSyncAt': new Date() } }
    );

    return {
      success: true,
      items: [...results, ...serverItems],
      conflicts,
      serverTime: new Date().toISOString(),
    };
  }

  private hashContent(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content.slice(0, 1000)).digest('hex');
  }
}

export const syncService = new SyncService();
