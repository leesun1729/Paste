import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserDocument extends Document {
  email: string;
  username: string;
  password: string;
  avatar?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    autoSync: boolean;
    syncInterval: number;
    maxHistoryItems: number;
    enableAI: boolean;
    language: string;
    shortcuts: {
      quickPaste: string;
      togglePanel: string;
    };
  };
  subscription: 'free' | 'pro' | 'enterprise';
  refreshTokens: string[];
  devices: { deviceId: string; name: string; lastSyncAt: Date }[];
  lastLoginAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    avatar: { type: String },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      autoSync: { type: Boolean, default: true },
      syncInterval: { type: Number, default: 30 },
      maxHistoryItems: { type: Number, default: 1000 },
      enableAI: { type: Boolean, default: false },
      language: { type: String, default: 'zh-CN' },
      shortcuts: {
        quickPaste: { type: String, default: 'CommandOrControl+Shift+V' },
        togglePanel: { type: String, default: 'CommandOrControl+Shift+C' },
      },
    },
    subscription: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    refreshTokens: [{ type: String }],
    devices: [
      {
        deviceId: { type: String, required: true },
        name: { type: String, default: 'Unknown Device' },
        lastSyncAt: { type: Date, default: Date.now },
      },
    ],
    lastLoginAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.index({ email: 1 });
UserSchema.index({ 'devices.deviceId': 1 });

export const User = mongoose.model<IUserDocument>('User', UserSchema);
