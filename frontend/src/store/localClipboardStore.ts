import { create } from 'zustand';
import { detectContentType, generateId } from '@/lib/utils';
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
  };
  createdAt: string;
  lastUsedAt?: string;
  useCount: number;
  syncedToServer: boolean;
}

const STORAGE_KEY = 'paste-local-items';
const MAX_ITEMS = 500;
const MAX_CONTENT_LENGTH = 100_000; // 100KB per item

// Load items from localStorage (client only)
function loadFromStorage(): LocalClipboardItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: LocalClipboardItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    const trimmed = items.slice(0, Math.floor(MAX_ITEMS * 0.7));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
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
  _loaded: boolean;

  _loadFromStorage: () => void;
  addItem: (content: string, sourceApp?: string) => void;
  removeItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  togglePin: (id: string) => void;
  clearAll: () => void;
  setSearchQuery: (q: string) => void;
  setSelectedIndex: (i: number) => void;
  incrementUse: (id: string) => void;
  markSynced: (id: string) => void;
}

export const useLocalClipboardStore = create<LocalClipboardState>((set, get) => ({
  items: [], // Start empty for SSR safety
  selectedIndex: 0,
  searchQuery: '',
  _loaded: false,

  _loadFromStorage: () => {
    if (get()._loaded) return;
    const stored = loadFromStorage();
    set({ items: stored, _loaded: true });
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
      type,
      content: trimmed,
      preview: generatePreview(trimmed, type),
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

    const newItems = [newItem, ...items].slice(0, MAX_ITEMS);
    saveToStorage(newItems);
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
