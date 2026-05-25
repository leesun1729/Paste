import mongoose, { Schema, Document } from 'mongoose';

export interface ITagDocument extends Document {
  name: string;
  color: string;
  icon?: string;
  userId: mongoose.Types.ObjectId;
  itemCount: number;
}

const TagSchema = new Schema<ITagDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      default: '#6366f1',
      validate: /^#[0-9A-Fa-f]{6}$/,
    },
    icon: { type: String },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    itemCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TagSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Tag = mongoose.model<ITagDocument>('Tag', TagSchema);
