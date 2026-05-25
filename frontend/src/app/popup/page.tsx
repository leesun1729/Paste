'use client';

import { useEffect, useRef } from 'react';
import { Search, Copy, Star, Pin, Hash, Code2, Link, Mail, Braces, Palette } from 'lucide-react';
import { cn, formatDate, truncate } from '@/lib/utils';
import { CONTENT_TYPE_CONFIG } from '@/lib/constants';
import { useLocalClipboardStore, type LocalClipboardItem } from '@/store/localClipboardStore';
import { ClipboardMonitor } from '@/components/clipboard/ClipboardMonitor';
import { pasteAndHide, hidePopup } from '@/lib/nativeBridge';

const typeIcons: Record<string, React.ElementType> = {
  text: Hash, code: Code2, url: Link, email: Mail, json: Braces, color: Palette, markdown: Hash, html: Code2, phone: Hash,
};

export default function PopupView() {
  const { items, searchQuery, selectedIndex, setSearchQuery, setSelectedIndex, incrementUse } = useLocalClipboardStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sortedRef = useRef<LocalClipboardItem[]>([]);
  const selectedIdxRef = useRef(0);

  const filtered = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.content.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastUsedAt || b.createdAt).getTime() - new Date(a.lastUsedAt || a.createdAt).getTime();
  });

  sortedRef.current = sorted;
  selectedIdxRef.current = selectedIndex;

  // Store subscription for Swift bridge
  const storeRef = useRef(useLocalClipboardStore.getState());
  useEffect(() => useLocalClipboardStore.subscribe((s) => { storeRef.current = s; }), []);

  // Global functions for Swift
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__pasteNavUp = () => { const s = storeRef.current; s.setSelectedIndex(Math.max(s.selectedIndex - 1, 0)); };
    w.__pasteNavDown = () => { const s = storeRef.current; s.setSelectedIndex(Math.min(s.selectedIndex + 1, s.items.length - 1)); };
    w.__pasteConfirm = () => {
      const s = storeRef.current;
      const f = s.items.filter((i: LocalClipboardItem) => !s.searchQuery || i.content.toLowerCase().includes(s.searchQuery.toLowerCase()));
      const o = [...f].sort((a: LocalClipboardItem, b: LocalClipboardItem) => {
        if (a.isPinned && !b.isPinned) return -1; if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.lastUsedAt || b.createdAt).getTime() - new Date(a.lastUsedAt || a.createdAt).getTime();
      });
      const item = o[s.selectedIndex];
      if (item) { s.incrementUse(item.id); pasteAndHide(item.content); }
    };
    w.__pasteCancel = () => hidePopup();
    w.__pasteTypeChar = (ch: string) => { const s = storeRef.current; s.setSearchQuery(s.searchQuery + ch); s.setSelectedIndex(0); };
    w.__pasteDeleteChar = () => { const s = storeRef.current; if (s.searchQuery.length > 0) { s.setSearchQuery(s.searchQuery.slice(0, -1)); s.setSelectedIndex(0); } };
  }, []);

  useEffect(() => {
    const reset = () => { setSearchQuery(''); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 50); };
    reset();
    document.addEventListener('paste:quickpaste-focus', reset);
    return () => document.removeEventListener('paste:quickpaste-focus', reset);
  }, [setSearchQuery, setSelectedIndex]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); hidePopup(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(Math.min(selectedIdxRef.current + 1, sortedRef.current.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(Math.max(selectedIdxRef.current - 1, 0)); return; }
      if (e.key === 'Enter') { const item = sortedRef.current[selectedIdxRef.current]; if (item) { e.preventDefault(); incrementUse(item.id); pasteAndHide(item.content); } }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setSelectedIndex, incrementUse]);

  return (
    <>
      <ClipboardMonitor />
      <div className="h-screen flex flex-col select-none overflow-hidden rounded-[18px]">
        {/* Glass header */}
        <div className="shrink-0 glass-surface border-b border-zinc-200/40 dark:border-zinc-700/40 px-4 py-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl glass-input ring-1 ring-zinc-200/50 dark:ring-zinc-700/50 transition-all focus-within:ring-2 focus-within:ring-indigo-500/40">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input ref={inputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clipboard..." autoComplete="off" spellCheck={false}
              className="flex-1 bg-transparent outline-none text-[13px] font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400" />
          </div>
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-none px-3 py-2 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 shadow-soft">
                <Copy className="w-6 h-6 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-[13px] font-medium text-zinc-400">{items.length === 0 ? 'Clipboard is empty' : 'No matches'}</p>
              {items.length === 0 && <p className="text-xs text-zinc-400 mt-1">Copy anything to get started</p>}
            </div>
          ) : (
            <div className="space-y-0.5 stagger">
              {sorted.map((item, i) => {
                const cfg = CONTENT_TYPE_CONFIG[item.type] || CONTENT_TYPE_CONFIG.text;
                const Icon = typeIcons[item.type] || Hash;
                const sel = i === selectedIndex;
                return (
                  <div key={item.id} data-index={i}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => { incrementUse(item.id); pasteAndHide(item.content); }}
                    className={cn('group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150',
                      sel
                        ? 'bg-indigo-500/10 dark:bg-indigo-500/15 shadow-sm ring-1 ring-indigo-500/20'
                        : 'hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60')}>
                    {/* Type badge */}
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200',
                      sel ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25 scale-105' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400')}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{cfg.label}</span>
                        {item.isPinned && <Pin className="w-2.5 h-2.5 text-indigo-400 fill-indigo-400 animate-scale-in" />}
                        {item.isFavorite && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                      </div>
                      <p className={cn('text-[13px] leading-snug mt-0.5 line-clamp-2 transition-colors', sel ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400')}>
                        {truncate(item.preview || item.content, 140)}
                      </p>
                    </div>
                    {/* Meta */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-zinc-400 tabular-nums">{formatDate(item.createdAt)}</span>
                      {sel && <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 animate-scale-in">↵</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 glass-surface border-t border-zinc-200/40 dark:border-zinc-700/40 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Hint k="↑↓" d="Navigate" />
            <Hint k="↵" d="Paste" />
            <Hint k="Esc" d="Close" />
          </div>
          <span className="text-[10px] text-zinc-400">{items.length} items</span>
        </div>
      </div>
    </>
  );
}

function Hint({ k, d }: { k: string; d: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-zinc-200/60 dark:bg-zinc-700/60 text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 shadow-soft">{k}</span>
      {d}
    </span>
  );
}
