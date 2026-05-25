import mongoose, { Schema, Document } from 'mongoose';

export type ClipboardContentType =
  | 'text' | 'code' | 'image' | 'url' | 'file'
  | 'color' | 'email' | 'phone' | 'json' | 'html' | 'markdown';

export interface IClipboardDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: ClipboardContentType;
  content: string;
  preview: string;
  title?: string;
  contentHash: string;
  sourceApp?: string;
  sourceUrl?: string;
  language?: string;
  tags: mongoose.Types.ObjectId[];
  isFavorite: boolean;
  isPinned: boolean;
  isEncrypted: boolean;
  isSynced: boolean;
  isDeleted: boolean;
  deviceId: string;
  aiSummary?: string;
  aiTags: string[];
  ocrText?: string;
  metadata: {
    fileSize?: number;
    fileName?: string;
    mimeType?: string;
    dimensions?: { width: number; height: number };
    charCount: number;
    wordCount: number;
    lineCount: number;
    encoding?: string;
    appName?: string;
    windowTitle?: string;
  };
  lastUsedAt?: Date;
  useCount: number;
  deletedAt?: Date;
}

const ClipboardSchema = new Schema<IClipboardDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'code', 'image', 'url', 'file', 'color', 'email', 'phone', 'json', 'html', 'markdown'],
      default: 'text',
    },
    content: { type: String, required: true },
    preview: { type: String, default: '' },
    title: { type: String },
    contentHash: { type: String, required: true, index: true },
    sourceApp: { type: String },
    sourceUrl: { type: String },
    language: { type: String },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    isFavorite: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isEncrypted: { type: Boolean, default: false },
    isSynced: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deviceId: { type: String, required: true },
    aiSummary: { type: String },
    aiTags: [{ type: String }],
    ocrText: { type: String },
    metadata: {
      fileSize: { type: Number },
      fileName: { type: String },
      mimeType: { type: String },
      dimensions: {
        width: { type: Number },
        height: { type: Number },
      },
      charCount: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
      lineCount: { type: Number, default: 0 },
      encoding: { type: String },
      appName: { type: String },
      windowTitle: { type: String },
    },
    lastUsedAt: { type: Date },
    useCount: { type: Number, default: 0 },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

ClipboardSchema.index({ userId: 1, createdAt: -1 });
ClipboardSchema.index({ userId: 1, type: 1 });
ClipboardSchema.index({ userId: 1, isFavorite: 1 });
ClipboardSchema.index({ userId: 1, contentHash: 1 }, { unique: false });
ClipboardSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
ClipboardSchema.index(
  { preview: 'text', content: 'text', title: 'text', 'aiTags': 'text' },
  { weights: { title: 10, preview: 5, content: 1, aiTags: 3 } }
);

export const Clipboard = mongoose.model<IClipboardDocument>('Clipboard', ClipboardSchema);
