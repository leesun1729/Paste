'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Grid3X3, List, CheckSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { isNativeApp } from '@/lib/nativeBridge';
import { useLocalClipboardStore } from '@/store/localClipboardStore';

export function Header() {
  const { theme, setTheme, viewMode, setViewMode } = useUIStore();
  const localItems = useLocalClipboardStore((s) => s.items);
  const [nativeMode, setNativeMode] = useState(false);
  useEffect(() => { setNativeMode(isNativeApp()); }, []);

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const cycleTheme = () => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark');

  return (
    <header className="sticky top-0 z-30 px-6 py-4">
      <div className="flex items-center gap-3">
        {/* Title */}
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Clipboard History</h1>

        {/* Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <span className={cn('w-1.5 h-1.5 rounded-full', nativeMode ? 'bg-green-500' : 'bg-blue-500')} />
          {localItems.length} items
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <TButton onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </TButton>
          <TButton onClick={cycleTheme}><ThemeIcon className="w-4 h-4" /></TButton>
        </div>
      </div>
    </header>
  );
}

function TButton({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick}
      className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 shadow-sm transition-colors',
        danger && 'text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/20')}>
      {children}
    </motion.button>
  );
}
