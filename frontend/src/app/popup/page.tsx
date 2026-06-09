'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Search, Copy, Star, Pin, Hash, Code2, Link, Mail, Braces, Palette, ImageIcon } from 'lucide-react';
import { cn, formatDate, truncate } from '@/lib/utils';
import { CONTENT_TYPE_CONFIG } from '@/lib/constants';
import { useLocalClipboardStore, type LocalClipboardItem } from '@/store/localClipboardStore';
import { ClipboardMonitor } from '@/components/clipboard/ClipboardMonitor';
import { pasteAndHide, hidePopup } from '@/lib/nativeBridge';

const typeIcons: Record<string, React.ElementType> = {
  text: Hash, code: Code2, url: Link, email: Mail, json: Braces, color: Palette, markdown: Hash, html: Code2, phone: Hash, image: ImageIcon,
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

  const getSortedFromStore = useCallback(() => {
    const s = useLocalClipboardStore.getState();
    const f = s.items.filter((i: LocalClipboardItem) => !s.searchQuery || i.content.toLowerCase().includes(s.searchQuery.toLowerCase()));
    return [...f].sort((a: LocalClipboardItem, b: LocalClipboardItem) => {
      if (a.isPinned && !b.isPinned) return -1; if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.lastUsedAt || b.createdAt).getTime() - new Date(a.lastUsedAt || a.createdAt).getTime();
    });
  }, []);

  // Global functions for Swift CGEvent tap bridge
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__pasteNavUp = () => {
      const s = useLocalClipboardStore.getState();
      s.setSelectedIndex(Math.max(s.selectedIndex - 1, 0));
    };
    w.__pasteNavDown = () => {
      const s = useLocalClipboardStore.getState();
      s.setSelectedIndex(Math.min(s.selectedIndex + 1, s.items.length - 1));
    };
    w.__pasteConfirm = () => {
      const s = useLocalClipboardStore.getState();
      const o = getSortedFromStore();
      const item = o[s.selectedIndex];
      if (item) {
        s.incrementUse(item.id);
        if (item.type === 'image' && item.imageData) { pasteAndHide(item.content, item.imageData); }
        else { pasteAndHide(item.content); }
      }
    };
    w.__pasteCancel = () => hidePopup();
  }, [getSortedFromStore]);

  useEffect(() => {
    const reset = () => { setSearchQuery(''); setSelectedIndex(0); };
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
      if (e.key === 'Enter') {
        const item = sortedRef.current[selectedIdxRef.current];
        if (item) {
          e.preventDefault();
          incrementUse(item.id);
          if (item.type === 'image' && item.imageData) { pasteAndHide(item.content, item.imageData); }
          else { pasteAndHide(item.content); }
        }
        return;
      }
      // When input is NOT focused: character keys update search directly
      const inp = inputRef.current;
      if (inp && document.activeElement !== inp) {
        if (e.key === 'Backspace') {
          e.preventDefault();
          const q = useLocalClipboardStore.getState().searchQuery;
          if (q.length > 0) setSearchQuery(q.slice(0, -1));
        } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          const q = useLocalClipboardStore.getState().searchQuery;
          setSearchQuery(q + e.key);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setSelectedIndex, incrementUse, setSearchQuery]);

  const handlePaste = useCallback((item: LocalClipboardItem) => {
    incrementUse(item.id);
    if (item.type === 'image' && item.imageData) { pasteAndHide(item.content, item.imageData); }
    else { pasteAndHide(item.content); }
  }, [incrementUse]);

  return (
    <>
      <ClipboardMonitor />
      <div className="h-screen flex flex-col select-none overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        {/* Header */}
        <header className="shrink-0 px-5 pt-4 pb-2.5">
          <div className="flex items-center gap-2.5 mb-3">
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Quick Paste</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {items.length}
            </div>
          </div>
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 ring-1 ring-zinc-200/50 dark:ring-zinc-700/50 transition-all focus-within:ring-2 focus-within:ring-indigo-500/30">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input ref={inputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clipboard..." autoComplete="off" spellCheck={false}
              className="flex-1 bg-transparent outline-none text-[13px] font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400" />
          </div>
        </header>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-none px-5 pb-1.5">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800/80 shadow-card flex items-center justify-center mb-5">
                <Copy className="w-7 h-7 text-zinc-300 dark:text-zinc-600" />
              </div>
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1.5 tracking-tight">{items.length === 0 ? 'Clipboard is empty' : 'No matches'}</h2>
              {items.length === 0 && <p className="text-[11px] text-zinc-500">Copy anything to get started</p>}
            </div>
          ) : (
            <div className="space-y-1.5 stagger">
              {sorted.map((item, i) => {
                const cfg = CONTENT_TYPE_CONFIG[item.type] || CONTENT_TYPE_CONFIG.text;
                const Icon = typeIcons[item.type] || Hash;
                const sel = i === selectedIndex;
                return (
                  <div key={item.id} data-index={i}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => handlePaste(item)}
                    className={cn('group relative p-3 rounded-xl cursor-pointer transition-all duration-150',
                      sel
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 shadow-elevated ring-2 ring-indigo-500/40'
                        : 'bg-white dark:bg-zinc-800/80 ring-1 ring-zinc-200/50 dark:ring-zinc-700/50 shadow-card hover:shadow-elevated active:scale-[0.995]',
                      item.isPinned && 'ring-indigo-500/20')}>
                    <div className="flex items-start gap-2.5">
                      {/* Type badge */}
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-soft transition-transform group-hover:scale-105"
                        style={{ backgroundColor: cfg.color + '18' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Label row: type + badges + time + enter indicator */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{cfg.label}</span>
                          {item.isPinned && <Pin className="w-2 h-2 text-indigo-400 fill-indigo-400" />}
                          {item.isFavorite && <Star className="w-2 h-2 text-amber-400 fill-amber-400" />}
                          <span className="text-[9px] text-zinc-400 ml-auto tabular-nums shrink-0">{formatDate(item.createdAt)}</span>
                          {sel && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 animate-scale-in shrink-0">↵</span>
                          )}
                        </div>
                        {/* Content body */}
                        {item.type === 'image' && item.imageData ? (
                          <div className="mt-0.5 rounded-lg overflow-hidden bg-zinc-50/80 dark:bg-zinc-900/60 p-0.5">
                            <img src={`data:image/jpeg;base64,${item.imageData}`} alt={`Image ${item.metadata.imageWidth}×${item.metadata.imageHeight}`}
                              className="max-h-20 w-auto rounded object-contain" loading="lazy" />
                          </div>
                        ) : item.type === 'code' ? (
                          <pre className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 leading-relaxed max-h-12 overflow-hidden rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 p-2"><code>{truncate(item.preview || item.content, 150)}</code></pre>
                        ) : item.type === 'url' ? (
                          <p className="text-[12px] text-indigo-600 dark:text-indigo-400 font-medium truncate">{item.content}</p>
                        ) : item.type === 'color' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded ring-1 ring-zinc-200/50" style={{ backgroundColor: item.content }} />
                            <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">{item.content}</span>
                          </div>
                        ) : (
                          <p className="text-[12px] text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-2">{truncate(item.preview || item.content, 120)}</p>
                        )}
                        {/* Metadata */}
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-400">
                          {item.type === 'image' && item.imageData ? (
                            <span>{(item.imageData.length * 3 / 4 / 1024 / 1024).toFixed(2)} MB</span>
                          ) : (
                            <span>{item.metadata.charCount.toLocaleString()} chars</span>
                          )}
                          {item.useCount > 1 && <span>Used {item.useCount}×</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-2.5 border-t border-zinc-200/50 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hint k="↑↓" d="Navigate" />
            <Hint k="↵" d="Paste" />
            <Hint k="Esc" d="Close" />
          </div>
          <span className="text-[9px] text-zinc-400 font-medium">{items.length} items</span>
        </div>
      </div>
    </>
  );
}

function Hint({ k, d }: { k: string; d: string }) {
  return (
    <span className="flex items-center gap-1 text-[9px] text-zinc-400">
      <span className="flex items-center justify-center w-4 h-4 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 shadow-soft">{k}</span>
      {d}
    </span>
  );
}