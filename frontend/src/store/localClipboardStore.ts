import { create } from 'zustand';
import { detectContentType, generateId } from '@/lib/utils';
import { nativeStorageSave } from '@/lib/nativeBridge';
import type { ClipboardContentType } from '@/types';

export interface LocalClipboardItem {
  id: string;
  type: ClipboardContentType;
  content: string;
  preview: string;
  title?: string;
  sourceApp?: string;
  isFavorite: boolean;
  isPinned: boolean;
  tags: string[];
  metadata: {
    charCount: number;
    wordCount: number;
    lineCount: number;
    imageWidth?: number;
    imageHeight?: number;
  };
  imageData?: string; // base64 JPEG for image items
  createdAt: string;
  lastUsedAt?: string;
  useCount: number;
  syncedToServer: boolean;
}

const STORAGE_KEY = 'paste-local-items';
const RETENTION_KEY = 'paste-retention-days';
const MAX_ITEMS_KEY = 'paste-max-items';
const MAX_CONTENT_LENGTH = 100_000; // 100KB per item
const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_MAX_ITEMS = 500;

// Load max items setting
function loadMaxItems(): number {
  if (typeof window === 'undefined') return DEFAULT_MAX_ITEMS;
  try {
    const raw = localStorage.getItem(MAX_ITEMS_KEY);
    if (!raw) return DEFAULT_MAX_ITEMS;
    const val = parseInt(raw, 10);
    return isNaN(val) || val < 100 ? DEFAULT_MAX_ITEMS : val;
  } catch {
    return DEFAULT_MAX_ITEMS;
  }
}

// Load retention days setting (0 = forever)
function loadRetentionDays(): number {
  if (typeof window === 'undefined') return DEFAULT_RETENTION_DAYS;
  try {
    const raw = localStorage.getItem(RETENTION_KEY);
    if (!raw) return DEFAULT_RETENTION_DAYS;
    const val = parseInt(raw, 10);
    return isNaN(val) ? DEFAULT_RETENTION_DAYS : val;
  } catch {
    return DEFAULT_RETENTION_DAYS;
  }
}

// Load items from localStorage (client only), filtering expired ones
function loadFromStorage(retentionDays: number): LocalClipboardItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: LocalClipboardItem[] = JSON.parse(raw);
    // 0 = forever, skip filtering
    if (retentionDays <= 0) return items;
    // Filter out items older than retention period
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      const itemTime = new Date(item.lastUsedAt || item.createdAt).getTime();
      return itemTime >= cutoff;
    });
  } catch {
    return [];
  }
}

function saveToStorage(items: LocalClipboardItem[], maxItems: number = DEFAULT_MAX_ITEMS) {
  if (typeof window === 'undefined') return;
  const sliced = items.slice(0, maxItems);
  try {
    nativeStorageSave(STORAGE_KEY, sliced);
  } catch {
    const trimmed = sliced.slice(0, Math.floor(maxItems * 0.7));
    nativeStorageSave(STORAGE_KEY, trimmed);
  }
}

function generatePreview(content: string, type: ClipboardContentType): string {
  switch (type) {
    case 'url':
      return content.slice(0, 100);
    case 'email':
      return content.slice(0, 80);
    case 'code':
      return content.split('\n').slice(0, 3).join('\n').slice(0, 150);
    default:
      return content.replace(/\s+/g, ' ').trim().slice(0, 150);
  }
}

function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(content.length, 500); i++) {
    const chr = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return String(hash);
}

interface LocalClipboardState {
  items: LocalClipboardItem[];
  selectedIndex: number;
  searchQuery: string;
  retentionDays: number;
  maxItems: number;
  _loaded: boolean;

  _loadFromStorage: () => void;
  addItem: (content: string, sourceApp?: string) => void;
  addImageItem: (base64: string, width: number, height: number) => void;
  removeItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  togglePin: (id: string) => void;
  clearAll: () => void;
  setSearchQuery: (q: string) => void;
  setSelectedIndex: (i: number) => void;
  setRetentionDays: (days: number) => void;
  setMaxItems: (max: number) => void;
  incrementUse: (id: string) => void;
  markSynced: (id: string) => void;
}

export const useLocalClipboardStore = create<LocalClipboardState>((set, get) => ({
  items: [], // Start empty for SSR safety
  selectedIndex: 0,
  searchQuery: '',
  retentionDays: DEFAULT_RETENTION_DAYS,
  maxItems: DEFAULT_MAX_ITEMS,
  _loaded: false,

  _loadFromStorage: () => {
    if (get()._loaded) return;
    const days = loadRetentionDays();
    const max = loadMaxItems();
    const stored = loadFromStorage(days);
    set({ items: stored, retentionDays: days, maxItems: max, _loaded: true });
  },

  addItem: (content: string, sourceApp?: string) => {
    if (!content.trim()) return;
    // Truncate oversized content
    const trimmed = content.length > MAX_CONTENT_LENGTH
      ? content.slice(0, MAX_CONTENT_LENGTH) + '\n…[truncated]'
      : content;
    const type = detectContentType(trimmed);
    const contentHash = hashContent(trimmed);

    const { items } = get();
    const recent = items.slice(0, 5);
    const duplicate = recent.find((item) => {
      if (item.content === content) return true;
      return hashContent(item.content) === contentHash && item.type === type;
    });

    if (duplicate) {
      const updated = items.map((item) =>
        item.id === duplicate.id
          ? { ...item, lastUsedAt: new Date().toISOString(), useCount: item.useCount + 1 }
          : item
      );
      const reordered = [
        updated.find((i) => i.id === duplicate.id)!,
        ...updated.filter((i) => i.id !== duplicate.id),
      ];
      saveToStorage(reordered);
      set({ items: reordered });
      return;
    }

    const newItem: LocalClipboardItem = {
      id: generateId(),
      type: type as ClipboardContentType,
      content: trimmed,
      preview: generatePreview(trimmed, type as ClipboardContentType),
      sourceApp,
      isFavorite: false,
      isPinned: false,
      tags: [],
      metadata: {
        charCount: trimmed.length,
        wordCount: trimmed.trim() ? trimmed.trim().split(/\s+/).length : 0,
        lineCount: trimmed.split('\n').length,
      },
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      useCount: 1,
      syncedToServer: false,
    };

    const max = get().maxItems;
    const newItems = [newItem, ...items].slice(0, max);
    saveToStorage(newItems, max);
    set({ items: newItems });
  },

  addImageItem: (base64: string, width: number, height: number) => {
    const { items } = get();
    // Dedup by base64 hash (first 200 chars)
    const imgHash = hashContent(base64.slice(0, 200));
    const recent = items.slice(0, 5);
    const duplicate = recent.find((item) => {
      if (item.type !== 'image') return false;
      return item.imageData && hashContent(item.imageData.slice(0, 200)) === imgHash;
    });

    if (duplicate) {
      const updated = items.map((item) =>
        item.id === duplicate.id
          ? { ...item, lastUsedAt: new Date().toISOString(), useCount: item.useCount + 1 }
          : item
      );
      const reordered = [
        updated.find((i) => i.id === duplicate.id)!,
        ...updated.filter((i) => i.id !== duplicate.id),
      ];
      saveToStorage(reordered);
      set({ items: reordered });
      return;
    }

    const newItem: LocalClipboardItem = {
      id: generateId(),
      type: 'image',
      content: `[Image ${width}×${height}]`,
      preview: `Image ${width}×${height}`,
      isFavorite: false,
      isPinned: false,
      tags: [],
      metadata: {
        charCount: 0,
        wordCount: 0,
        lineCount: 0,
        imageWidth: width,
        imageHeight: height,
      },
      imageData: base64,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      useCount: 1,
      syncedToServer: false,
    };

    const max = get().maxItems;
    const newItems = [newItem, ...items].slice(0, max);
    saveToStorage(newItems, max);
    set({ items: newItems });
  },

  removeItem: (id: string) => {
    const newItems = get().items.filter((i) => i.id !== id);
    saveToStorage(newItems);
    set({ items: newItems });
  },

  toggleFavorite: (id: string) => {
    const newItems = get().items.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveToStorage(newItems);
    set({ items: newItems });
  },

  togglePin: (id: string) => {
    const newItems = get().items.map((item) =>
      item.id === id ? { ...item, isPinned: !item.isPinned } : item
    );
    saveToStorage(newItems);
    set({ items: newItems });
  },

  clearAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ items: [], selectedIndex: 0 });
  },

  setSearchQuery: (q: string) => set({ searchQuery: q, selectedIndex: 0 }),
  setSelectedIndex: (i: number) => set({ selectedIndex: i }),

  setRetentionDays: (days: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RETENTION_KEY, String(days));
    }
    // Re-filter items with new retention period (0 = forever, skip filtering)
    const currentItems = get().items;
    let filtered = currentItems;
    if (days > 0) {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      filtered = currentItems.filter((item) => {
        const itemTime = new Date(item.lastUsedAt || item.createdAt).getTime();
        return itemTime >= cutoff;
      });
    }
    saveToStorage(filtered);
    set({ retentionDays: days, items: filtered });
  },

  setMaxItems: (max: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MAX_ITEMS_KEY, String(max));
    }
    const currentItems = get().items;
    const trimmed = currentItems.slice(0, max);
    saveToStorage(trimmed);
    set({ maxItems: max, items: trimmed });
  },

  incrementUse: (id: string) => {
    const newItems = get().items.map((item) =>
      item.id === id
        ? { ...item, lastUsedAt: new Date().toISOString(), useCount: item.useCount + 1 }
        : item
    );
    saveToStorage(newItems);
    set({ items: newItems });
  },

  markSynced: (id: string) => {
    const newItems = get().items.map((item) =>
      item.id === id ? { ...item, syncedToServer: true } : item
    );
    saveToStorage(newItems);
    set({ items: newItems });
  },
}));
