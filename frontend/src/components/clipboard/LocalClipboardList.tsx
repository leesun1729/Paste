'use client';

import { useState, useCallback, useMemo } from 'react';
import { Star, Trash2, Pin, Copy, Search, Clock, Hash, Code2, Link, Mail, Braces, Palette } from 'lucide-react';
import { cn, formatDate, truncate } from '@/lib/utils';
import { CONTENT_TYPE_CONFIG } from '@/lib/constants';
import { useLocalClipboardStore, type LocalClipboardItem } from '@/store/localClipboardStore';
import { useToast } from '@/hooks/useToast';
import { writeClipboard } from '@/lib/nativeBridge';
import { useUIStore } from '@/store/uiStore';
import { useDebounce } from '@/hooks/useDebounce';

const PAGE = 50;
const typeIcons: Record<string, React.ElementType> = {
  text: Hash, code: Code2, url: Link, email: Mail, json: Braces, color: Palette, markdown: Hash, html: Code2, phone: Hash,
};

export function LocalClipboardList() {
  const { items, removeItem, toggleFavorite, togglePin, incrementUse } = useLocalClipboardStore();
  const { activeFilter, viewMode } = useUIStore();
  const toast = useToast();
  const [visible, setVisible] = useState(PAGE);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 150);

  const filtered = useMemo(() => items.filter((item) => {
    if (activeFilter === 'favorites') return item.isFavorite;
    if (activeFilter !== 'all' && item.type !== activeFilter) return false;
    if (debouncedSearch) { const q = debouncedSearch.toLowerCase(); return item.content.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q); }
    return true;
  }), [items, activeFilter, debouncedSearch]);

  const pinned = filtered.filter((i) => i.isPinned);
  const rest = filtered.filter((i) => !i.isPinned);
  const shown = [...pinned, ...rest].slice(0, visible);

  const copyItem = useCallback(async (item: LocalClipboardItem) => {
    await writeClipboard(item.content); incrementUse(item.id); toast.success('Copied');
  }, [incrementUse, toast]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fade-in-up">
        <div className="w-24 h-24 rounded-3xl bg-white dark:bg-zinc-800/80 shadow-elevated flex items-center justify-center mb-8">
          <Copy className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-3 tracking-tight">Clipboard is empty</h2>
        <p className="text-[13px] text-zinc-500 leading-relaxed mb-6">Copy anything on your Mac. It appears here instantly.</p>
        <div className="bg-white dark:bg-zinc-800/80 rounded-2xl px-5 py-3 ring-1 ring-indigo-500/20 shadow-card">
          <kbd className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">⌘ ⇧ V</kbd>
          <span className="text-[13px] text-indigo-500 dark:text-indigo-400 ml-2">Quick paste anywhere</span>
        </div>
      </div>
    );
  }

  const gridClass = viewMode === 'list' ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3';

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2.5 flex-1 px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 ring-1 ring-zinc-200/50 dark:ring-zinc-700/50 shadow-soft transition-all focus-within:ring-2 focus-within:ring-indigo-500/30">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setVisible(PAGE); }}
            placeholder="Filter history..." className="flex-1 bg-transparent outline-none text-[13px] font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400" />
          {search && <button onClick={() => setSearch('')} className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600">Clear</button>}
        </div>
        <span className="text-xs font-semibold text-zinc-400 tabular-nums whitespace-nowrap">{filtered.length} items</span>
      </div>

      {pinned.length > 0 && (
        <div className="mb-5">
          <h3 className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 ml-1"><Pin className="w-3 h-3" /> Pinned</h3>
          <div className={gridClass}>
            {shown.filter((i) => i.isPinned).map((item, i) => (
              <Card key={item.id} item={item} i={i} copyItem={copyItem} removeItem={removeItem} toggleFavorite={toggleFavorite} togglePin={togglePin} toast={toast} />
            ))}
          </div>
        </div>
      )}

      <div>
        {pinned.length > 0 && <h3 className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 mt-5 ml-1"><Clock className="w-3 h-3" /> Recent</h3>}
        <div className={gridClass}>
          {shown.filter((i) => !i.isPinned).map((item, i) => (
            <Card key={item.id} item={item} i={i} copyItem={copyItem} removeItem={removeItem} toggleFavorite={toggleFavorite} togglePin={togglePin} toast={toast} />
          ))}
        </div>
      </div>

      {visible < filtered.length && (
        <div className="text-center mt-10 animate-fade-in">
          <button onClick={() => setVisible((p) => p + PAGE)}
            className="px-8 py-3 rounded-2xl bg-white dark:bg-zinc-800/80 ring-1 ring-zinc-200/50 dark:ring-zinc-700/50 shadow-card text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            Show more
          </button>
        </div>
      )}
      <div className="h-16" />
    </div>
  );
}

function Card({ item, i, copyItem, removeItem, toggleFavorite, togglePin, toast }: {
  item: LocalClipboardItem; i: number; copyItem: (item: LocalClipboardItem) => void;
  removeItem: (id: string) => void; toggleFavorite: (id: string) => void; togglePin: (id: string) => void;
  toast: ReturnType<typeof useToast>;
}) {
  const cfg = CONTENT_TYPE_CONFIG[item.type] || CONTENT_TYPE_CONFIG.text;
  const Icon = typeIcons[item.type] || Hash;

  return (
    <div onClick={() => copyItem(item)}
      className={cn('group relative p-4 rounded-2xl bg-white dark:bg-zinc-800/80 ring-1 ring-zinc-200/50 dark:ring-zinc-700/50 shadow-card hover:shadow-elevated hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer',
        item.isPinned && 'ring-indigo-500/20')}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-soft transition-transform group-hover:scale-105" style={{ backgroundColor: cfg.color + '18' }}>
          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{cfg.label}</span>
            {item.isPinned && <Pin className="w-2.5 h-2.5 text-indigo-400 fill-indigo-400" />}
            {item.isFavorite && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
            <span className="text-[10px] text-zinc-400 ml-auto tabular-nums">{formatDate(item.createdAt)}</span>
          </div>
          {item.type === 'code' ? (
            <pre className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 leading-relaxed max-h-16 overflow-hidden rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 p-2.5"><code>{truncate(item.content, 200)}</code></pre>
          ) : item.type === 'url' ? (
            <p className="text-[13px] text-indigo-600 dark:text-indigo-400 font-medium truncate">{item.content}</p>
          ) : item.type === 'color' ? (
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md ring-1 ring-zinc-200/50" style={{ backgroundColor: item.content }} /><span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">{item.content}</span></div>
          ) : (
            <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2">{item.preview || item.content}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-400">
            <span>{item.metadata.charCount.toLocaleString()} chars</span>
            {item.useCount > 1 && <span>Used {item.useCount}×</span>}
          </div>
        </div>
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <ABtn onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleFavorite(item.id); }} active={item.isFavorite}><Star className="w-3 h-3" /></ABtn>
        <ABtn onClick={(e: React.MouseEvent) => { e.stopPropagation(); togglePin(item.id); }} active={item.isPinned}><Pin className="w-3 h-3" /></ABtn>
        <ABtn onClick={(e: React.MouseEvent) => { e.stopPropagation(); copyItem(item); }}><Copy className="w-3 h-3" /></ABtn>
        <ABtn onClick={(e: React.MouseEvent) => { e.stopPropagation(); removeItem(item.id); toast.success('Deleted'); }}><Trash2 className="w-3 h-3" /></ABtn>
      </div>
    </div>
  );
}

function ABtn({ children, onClick, active }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      className={cn('p-1.5 rounded-lg bg-white dark:bg-zinc-800/80 ring-1 ring-zinc-200/50 dark:ring-zinc-700/50 shadow-soft hover:shadow-card active:scale-90 transition-all duration-150',
        active && 'text-indigo-500 ring-indigo-500/20')}>
      {children}
    </button>
  );
}
