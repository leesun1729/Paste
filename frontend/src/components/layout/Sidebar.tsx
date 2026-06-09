'use client';

import { motion } from 'framer-motion';
import { ClipboardList, Star, Code2, Link, Mail, Hash, Braces, ChevronLeft, Settings, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, type ContentFilter } from '@/store/uiStore';
import { useTranslation } from '@/lib/i18n';

const filters: { filter: ContentFilter; labelKey: string; icon: React.ElementType; color: string }[] = [
  { filter: 'all', labelKey: 'all', icon: ClipboardList, color: 'var(--accent)' },
  { filter: 'favorites', labelKey: 'favorites', icon: Star, color: '#F59E0B' },
  { filter: 'text', labelKey: 'text', icon: Hash, color: 'var(--accent)' },
  { filter: 'code', labelKey: 'code', icon: Code2, color: '#34C759' },
  { filter: 'url', labelKey: 'links', icon: Link, color: '#5AC8FA' },
  { filter: 'email', labelKey: 'emails', icon: Mail, color: '#AF52DE' },
  { filter: 'json', labelKey: 'json', icon: Braces, color: '#5AC8FA' },
  { filter: 'image', labelKey: 'images', icon: ImageIcon, color: '#FF2D55' },
];

export function Sidebar() {
  const { activeFilter, setActiveFilter, sidebarCollapsed, toggleSidebar, setActivePanel } = useUIStore();
  const t = useTranslation();

  return (
    <motion.aside initial={false} animate={{ width: sidebarCollapsed ? 54 : 200 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative flex flex-col h-full glass-surface"
      style={{ borderRight: '1px solid var(--border)' }}>

      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        {!sidebarCollapsed && (
          <button onClick={() => setActivePanel('main')} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'var(--accent)' }}>
              <ClipboardList className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-[12px]" style={{ color: 'var(--text-primary)' }}>Paste</span>
          </button>
        )}
        <button onClick={toggleSidebar}
          className={cn('p-1 rounded-md transition-colors', sidebarCollapsed && 'mx-auto')}
          style={{ color: 'var(--text-secondary)' }}>
          <ChevronLeft className={cn('w-3.5 h-3.5 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 px-1.5 py-2 space-y-0.5 overflow-y-auto">
        {!sidebarCollapsed && <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{t('filters')}</p>}
        {filters.map(({ filter, labelKey, icon: Icon, color }) => (
          <button key={filter} onClick={() => { setActiveFilter(filter); setActivePanel('main'); }}
            className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-all duration-100',
              sidebarCollapsed && 'justify-center px-0',
              activeFilter === filter ? 'font-medium' : '')}
            style={activeFilter === filter
              ? { background: 'var(--selection-bg)', color: 'var(--accent)' }
              : { color: 'var(--text-secondary)' }}>
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={activeFilter === filter
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--bg-secondary)' }}>
              <Icon className="w-2.5 h-2.5" style={{ color: activeFilter === filter ? '#fff' : color }} />
            </div>
            {!sidebarCollapsed && <span>{t(labelKey)}</span>}
          </button>
        ))}
      </nav>

      <div className="px-1.5 pb-3">
        <button onClick={() => setActivePanel('settings')}
          className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors',
            sidebarCollapsed && 'justify-center px-0')}
          style={{ color: 'var(--text-secondary)' }}>
          <Settings className="w-3.5 h-3.5 shrink-0" />
          {!sidebarCollapsed && <span>{t('settings')}</span>}
        </button>
      </div>
    </motion.aside>
  );
}
