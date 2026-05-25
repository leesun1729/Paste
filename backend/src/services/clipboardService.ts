import crypto from 'crypto';
import { Clipboard, IClipboardDocument, ClipboardContentType } from '../models/Clipboard';
import { Tag } from '../models/Tag';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import mongoose from 'mongoose';

interface CreateClipboardInput {
  content: string;
  type: ClipboardContentType;
  title?: string;
  sourceApp?: string;
  sourceUrl?: string;
  language?: string;
  tags?: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
  deviceId: string;
}

interface SearchParams {
  q?: string;
  type?: string;
  tags?: string;
  isFavorite?: boolean;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export class ClipboardService {
  async create(userId: string, input: CreateClipboardInput) {
    const contentHash = this.hashContent(input.content);

    // Deduplication: check if same content exists recently
    const existing = await Clipboard.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      contentHash,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });

    if (existing) {
      existing.lastUsedAt = new Date();
      existing.useCount += 1;
      await existing.save();
      return existing.toJSON();
    }

    const preview = this.generatePreview(input.content, input.type);
    const metadata = this.extractMetadata(input.content, input.type);

    const clipboard = await Clipboard.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: input.type,
      content: input.content,
      preview,
      title: input.title,
      contentHash,
      sourceApp: input.sourceApp,
      sourceUrl: input.sourceUrl,
      language: input.language,
      tags: [],
      isFavorite: input.isFavorite || false,
      isPinned: input.isPinned || false,
      deviceId: input.deviceId,
      metadata,
      lastUsedAt: new Date(),
      useCount: 1,
    });

    if (input.tags && input.tags.length > 0) {
      await this.assignTags(userId, clipboard._id.toString(), input.tags);
    }

    return clipboard.toJSON();
  }

  async getById(userId: string, id: string) {
    const item = await Clipboard.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    }).populate('tags');

    if (!item) throw new NotFoundError('Clipboard item not found');
    return item.toJSON();
  }

  async list(userId: string, params: SearchParams) {
    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    };

    if (params.type) filter.type = params.type;
    if (params.isFavorite !== undefined) filter.isFavorite = params.isFavorite;
    if (params.startDate || params.endDate) {
      filter.createdAt = {};
      if (params.startDate) (filter.createdAt as Record<string, Date>).$gte = new Date(params.startDate);
      if (params.endDate) (filter.createdAt as Record<string, Date>).$lte = new Date(params.endDate);
    }

    if (params.tags) {
      const tagNames = params.tags.split(',');
      const tags = await Tag.find({ userId: new mongoose.Types.ObjectId(userId), name: { $in: tagNames } });
      filter.tags = { $in: tags.map((t) => t._id) };
    }

    if (params.q) {
      const regex = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { preview: regex },
        { content: regex },
        { title: regex },
        { aiTags: regex },
      ];
    }

    const sortField = params.sort || 'createdAt';
    const sortOrder = params.order === 'asc' ? 1 : -1;
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Clipboard.find(filter)
        .populate('tags')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Clipboard.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(userId: string, id: string, updates: Record<string, unknown>) {
    const item = await Clipboard.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!item) throw new NotFoundError('Clipboard item not found');

    const allowedUpdates = ['title', 'isFavorite', 'isPinned', 'type', 'language'];
    for (const key of Object.keys(updates)) {
      if (allowedUpdates.includes(key)) {
        (item as Record<string, unknown>)[key] = updates[key];
      }
    }

    if (updates.tags) {
      await this.assignTags(userId, id, updates.tags as string[]);
    }

    await item.save();
    return item.toJSON();
  }

  async delete(userId: string, id: string) {
    const item = await Clipboard.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!item) throw new NotFoundError('Clipboard item not found');

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();
  }

  async bulkDelete(userId: string, ids: string[]) {
    await Clipboard.updateMany(
      {
        _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
  }

  async toggleFavorite(userId: string, id: string) {
    const item = await Clipboard.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!item) throw new NotFoundError('Clipboard item not found');

    item.isFavorite = !item.isFavorite;
    await item.save();
    return item.toJSON();
  }

  async getStats(userId: string) {
    const stats = await Clipboard.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isDeleted: false } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const favorites = await Clipboard.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
      isFavorite: true,
    });

    return { total, favorites, byType: stats };
  }

  private async assignTags(userId: string, clipboardId: string, tagNames: string[]) {
    const tagIds: mongoose.Types.ObjectId[] = [];

    for (const name of tagNames) {
      const normalizedName = name.trim().toLowerCase();
      if (!normalizedName) continue;

      let tag = await Tag.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        name: normalizedName,
      });

      if (!tag) {
        tag = await Tag.create({
          name: normalizedName,
          userId: new mongoose.Types.ObjectId(userId),
          color: this.randomColor(),
        });
      }

      tag.itemCount += 1;
      await tag.save();
      tagIds.push(tag._id);
    }

    await Clipboard.findByIdAndUpdate(clipboardId, { $set: { tags: tagIds } });
  }

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content.slice(0, 1000)).digest('hex');
  }

  private generatePreview(content: string, type: ClipboardContentType): string {
    switch (type) {
      case 'url':
        return content.slice(0, 100);
      case 'email':
        return content.slice(0, 80);
      case 'code':
        return content.split('\n').slice(0, 3).join('\n').slice(0, 150);
      case 'json':
        return content.slice(0, 150);
      default:
        return content.replace(/\s+/g, ' ').trim().slice(0, 150);
    }
  }

  private extractMetadata(content: string, type: ClipboardContentType) {
    const lines = content.split('\n');
    const text = content.trim();

    return {
      charCount: text.length,
      wordCount: text ? text.split(/\s+/).length : 0,
      lineCount: lines.length,
    };
  }

  private randomColor(): string {
    const colors = [
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e', '#ef4444', '#f97316',
      '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
      '#3b82f6', '#2563eb', '#7c3aed', '#c026d3',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

export const clipboardService = new ClipboardService();
