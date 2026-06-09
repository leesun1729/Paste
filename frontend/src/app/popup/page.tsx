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
    w.__pasteTypeChar = (ch: string) => {
      const s = useLocalClipboardStore.getState();
      s.setSearchQuery(s.searchQuery + ch);
    };
    w.__pasteDeleteChar = () => {
      const s = useLocalClipboardStore.getState();
      if (s.searchQuery.length > 0) s.setSearchQuery(s.searchQuery.slice(0, -1));
    };
  }, [getSortedFromStore]);

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
      if (e.key === 'Enter') {
        const item = sortedRef.current[selectedIdxRef.current];
        if (item) {
          e.preventDefault();
          incrementUse(item.id);
          if (item.type === 'image' && item.imageData) { pasteAndHide(item.content, item.imageData); }
          else { pasteAndHide(item.content); }
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setSelectedIndex, incrementUse]);

  const handlePaste = useCallback((item: LocalClipboardItem) => {
    incrementUse(item.id);
    if (item.type === 'image' && item.imageData) { pasteAndHide(item.content, item.imageData); }
    else { pasteAndHide(item.content); }
  }, [incrementUse]);

  return (
    <>
      <ClipboardMonitor />
      <div className="h-screen flex flex-col select-none overflow-hidden"
        style={{ background: 'var(--bg-primary)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)' }}>

        {/* Spotlight-style search bar */}
        <div className="shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
            <input ref={inputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索剪贴板..." autoComplete="off" spellCheck={false}
              className="flex-1 bg-transparent outline-none text-[15px] font-medium"
              style={{ color: 'var(--text-primary)' }} />
            {items.length > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                {filtered.length}
              </span>
            )}
          </div>
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-none px-3 pb-2">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--bg-secondary)' }}>
                <Copy className="w-7 h-7" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {items.length === 0 ? '还没有复制任何内容' : '没有匹配结果'}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {items.length === 0 ? '复制文字或图片后会自动出现在这里' : '尝试其他关键词'}
              </p>
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
                    onClick={() => handlePaste(item)}
                    className={cn('group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-100',
                      sel ? 'text-white' : '')}
                    style={sel
                      ? { background: 'var(--accent)', borderRadius: 'var(--radius-md)' }
                      : { background: 'transparent' }}
                  >
                    {/* Type icon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={sel
                        ? { background: 'rgba(255,255,255,0.2)' }
                        : { background: cfg.color + '15' }}>
                      <Icon className="w-4 h-4" style={{ color: sel ? '#fff' : cfg.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: sel ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
                          {cfg.label}
                        </span>
                        {item.isPinned && <Pin className="w-2.5 h-2.5" style={{ color: sel ? 'rgba(255,255,255,0.7)' : 'var(--accent)' }} />}
                        {item.isFavorite && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                        <span className="text-[10px] ml-auto shrink-0"
                          style={{ color: sel ? 'rgba(255,255,255,0.5)' : 'var(--text-tertiary)' }}>
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      {item.type === 'image' && item.imageData ? (
                        <div className="mt-1 rounded-md overflow-hidden" style={{ background: sel ? 'rgba(255,255,255,0.1)' : 'var(--bg-secondary)' }}>
                          <img src={`data:image/jpeg;base64,${item.imageData}`}
                            className="max-h-16 w-auto rounded object-contain" loading="lazy" />
                        </div>
                      ) : (
                        <p className={cn('text-[13px] leading-snug line-clamp-2 mt-0.5',
                          sel ? 'text-white' : '')}
                          style={{ color: sel ? '#fff' : 'var(--text-primary)' }}>
                          {truncate(item.preview || item.content, 150)}
                        </p>
                      )}
                    </div>

                    {/* Enter hint */}
                    {sel && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 animate-scale-in"
                        style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                        ↵
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-2.5 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-4">
            <Hint k="↑↓" d="导航" sel={false} />
            <Hint k="↵" d="粘贴" sel={false} />
            <Hint k="esc" d="关闭" sel={false} />
          </div>
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{items.length} 条记录</span>
        </div>
      </div>
    </>
  );
}

function Hint({ k, d }: { k: string; d: string; sel: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
      <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[9px] font-mono font-semibold"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
        {k}
      </kbd>
      {d}
    </span>
  );
}
