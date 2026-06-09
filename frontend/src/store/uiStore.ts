import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';
type ViewMode = 'grid' | 'list';
type PanelView = 'main' | 'detail' | 'settings' | 'ai';
export type ContentFilter = 'all' | 'favorites' | 'text' | 'code' | 'url' | 'image' | 'file' | 'email' | 'json';
export type Language = 'en' | 'zh';

interface UIState {
  theme: Theme;
  viewMode: ViewMode;
  sidebarCollapsed: boolean;
  activePanel: PanelView;
  activeFilter: ContentFilter;
  language: Language;
  isQuickPasteOpen: boolean;
  isCommandPaletteOpen: boolean;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActivePanel: (panel: PanelView) => void;
  setActiveFilter: (filter: ContentFilter) => void;
  setLanguage: (lang: Language) => void;
  setQuickPasteOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

function loadLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem('paste-language');
    if (saved === 'zh' || saved === 'en') return saved;
    // Auto-detect from system
    const sysLang = navigator.language || '';
    return sysLang.startsWith('zh') ? 'zh' : 'en';
  } catch { return 'en'; }
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'system',
  viewMode: 'grid',
  sidebarCollapsed: false,
  activePanel: 'main',
  activeFilter: 'all',
  language: loadLanguage(),
  isQuickPasteOpen: false,
  isCommandPaletteOpen: false,

  setTheme: (theme: Theme) => { set({ theme }); applyTheme(theme); },
  toggleTheme: () => {
    const t = useUIStore.getState().theme;
    useUIStore.getState().setTheme(t === 'dark' ? 'light' : 'dark');
  },
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
  setActivePanel: (panel: PanelView) => set({ activePanel: panel }),
  setActiveFilter: (filter: ContentFilter) => set({ activeFilter: filter }),
  setLanguage: (lang: Language) => {
    if (typeof window !== 'undefined') localStorage.setItem('paste-language', lang);
    set({ language: lang });
  },
  setQuickPasteOpen: (open: boolean) => set({ isQuickPasteOpen: open }),
  setCommandPaletteOpen: (open: boolean) => set({ isCommandPaletteOpen: open }),
}));

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme === 'system') {
    root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } else {
    root.classList.add(theme);
  }
}
