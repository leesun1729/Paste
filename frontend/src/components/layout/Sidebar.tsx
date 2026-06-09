'use client';

import { motion } from 'framer-motion';
import { ClipboardList, Star, Code2, Link, Mail, Hash, Braces, ChevronLeft, Settings, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, type ContentFilter } from '@/store/uiStore';

const filters: { filter: ContentFilter; label: string; icon: React.ElementType; color: string }[] = [
  { filter: 'all', label: 'All', icon: ClipboardList, color: '#6366f1' },
  { filter: 'favorites', label: 'Favorites', icon: Star, color: '#f59e0b' },
  { filter: 'text', label: 'Text', icon: Hash, color: '#6366f1' },
  { filter: 'code', label: 'Code', icon: Code2, color: '#22c55e' },
  { filter: 'url', label: 'Links', icon: Link, color: '#3b82f6' },
  { filter: 'email', label: 'Emails', icon: Mail, color: '#8b5cf6' },
  { filter: 'json', label: 'JSON', icon: Braces, color: '#06b6d4' },
  { filter: 'image', label: 'Images', icon: ImageIcon, color: '#ec4899' },
];

export function Sidebar() {
  const { activeFilter, setActiveFilter, sidebarCollapsed, toggleSidebar, setActivePanel } = useUIStore();

  return (
    <motion.aside initial={false} animate={{ width: sidebarCollapsed ? 60 : 220 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200/50 dark:border-zinc-800">

      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {!sidebarCollapsed && (
          <button onClick={() => setActivePanel('main')} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm shadow-indigo-500/25">
              <ClipboardList className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[13px] text-zinc-900 dark:text-zinc-100">Paste</span>
          </button>
        )}
        <button onClick={toggleSidebar}
          className={cn('p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors', sidebarCollapsed && 'mx-auto')}>
          <ChevronLeft className={cn('w-4 h-4 text-zinc-400 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Filters</p>}
        {filters.map(({ filter, label, icon: Icon, color }) => (
          <button key={filter} onClick={() => { setActiveFilter(filter); setActivePanel('main'); }}
            className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-all duration-150',
              sidebarCollapsed && 'justify-center px-0',
              activeFilter === filter ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50')}>
            <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
              activeFilter === filter ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/25' : 'bg-zinc-100 dark:bg-zinc-800')}>
              <Icon className="w-3 h-3" style={{ color: activeFilter === filter ? '#fff' : color }} />
            </div>
            {!sidebarCollapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <div className="px-2 pb-4">
        <button onClick={() => setActivePanel('settings')}
          className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
            sidebarCollapsed && 'justify-center px-0')}>
          <Settings className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span>Settings</span>}
        </button>
      </div>
    </motion.aside>
  );
}