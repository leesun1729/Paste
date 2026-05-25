// ==================== Clipboard Types ====================
export type ClipboardContentType =
  | 'text' | 'code' | 'image' | 'url' | 'file'
  | 'color' | 'email' | 'phone' | 'json' | 'html' | 'markdown';

export interface ClipboardMetadata {
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
}

export interface IClipboardItem {
  _id: string;
  userId: string;
  type: ClipboardContentType;
  content: string;
  preview: string;
  title?: string;
  sourceApp?: string;
  sourceUrl?: string;
  language?: string;
  tags: ITag[];
  isFavorite: boolean;
  isPinned: boolean;
  isEncrypted: boolean;
  isSynced: boolean;
  deviceId: string;
  aiSummary?: string;
  aiTags: string[];
  ocrText?: string;
  metadata: ClipboardMetadata;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

// ==================== User Types ====================
export interface IUser {
  _id: string;
  email: string;
  username: string;
  avatar?: string;
  preferences: UserPreferences;
  subscription: SubscriptionType;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
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
}

export type SubscriptionType = 'free' | 'pro' | 'enterprise';

// ==================== Tag Types ====================
export interface ITag {
  _id: string;
  name: string;
  color: string;
  icon?: string;
  userId: string;
  itemCount: number;
  createdAt: string;
}

// ==================== API Types ====================
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IAuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export interface ISyncPayload {
  deviceId: string;
  lastSyncAt: string;
  items: ISyncItem[];
  deletedIds: string[];
}

export interface ISyncItem {
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

// ==================== UI Types ====================
export type SortField = 'createdAt' | 'updatedAt' | 'useCount' | 'charCount';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';
export type ContentFilter = ClipboardContentType | 'all' | 'favorites';
