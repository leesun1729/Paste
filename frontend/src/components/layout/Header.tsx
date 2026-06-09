'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Grid3X3, List } from 'lucide-react';
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
    <header className="sticky top-0 z-30 px-5 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Clipboard History</h1>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          <span className={cn('w-1.5 h-1.5 rounded-full', nativeMode ? 'bg-green-500' : 'bg-blue-500')} />
          {localItems.length} items
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <TButton onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <Grid3X3 className="w-3.5 h-3.5" />}
          </TButton>
          <TButton onClick={cycleTheme}><ThemeIcon className="w-3.5 h-3.5" /></TButton>
        </div>
      </div>
    </header>
  );
}

function TButton({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick}
      className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-colors')}
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        color: danger ? '#FF3B30' : 'var(--text-secondary)',
      }}>
      {children}
    </motion.button>
  );
}
