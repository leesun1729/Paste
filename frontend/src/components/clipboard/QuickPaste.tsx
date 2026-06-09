'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Copy, Star, Pin, Trash2, Command } from 'lucide-react';
import { cn, formatDate, truncate } from '@/lib/utils';
import { CONTENT_TYPE_CONFIG } from '@/lib/constants';
import { useLocalClipboardStore, type LocalClipboardItem } from '@/store/localClipboardStore';
import { useToast } from '@/hooks/useToast';
import { writeClipboard } from '@/lib/nativeBridge';

// Listen for global shortcut: Tauri eval fires CustomEvent, browser uses keydown
function useGlobalQuickPaste(onTrigger: () => void) {
  useEffect(() => {
    // Tauri: Rust eval dispatches this CustomEvent
    const handleCustom = () => onTrigger();
    document.addEventListener('paste:quickpaste', handleCustom);

    // Browser fallback: Cmd/Ctrl+Shift+V
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        onTrigger();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('paste:quickpaste', handleCustom);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onTrigger]);
}

export function QuickPaste() {
  const {
    items,
    searchQuery,
    selectedIndex,
    addItem,
    removeItem,
    toggleFavorite,
    togglePin,
    setSearchQuery,
    setSelectedIndex,
    incrementUse,
  } = useLocalClipboardStore();

  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Listen for global shortcut (Tauri CustomEvent or browser keydown)
  const handleToggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);
  useGlobalQuickPaste(handleToggleOpen);

  // Filter items by search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.content.toLowerCase().includes(q) ||
      item.preview.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      (item.title && item.title.toLowerCase().includes(q))
    );
  });

  // Pinned items first, then by lastUsedAt
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastUsedAt || b.createdAt).getTime() -
           new Date(a.lastUsedAt || a.createdAt).getTime();
  });

  // Close on Escape, open with shortcut
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setSearchQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, setSelectedIndex, setSearchQuery]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, isOpen]);

  const pasteItem = useCallback(
    async (item: LocalClipboardItem) => {
      try {
        await writeClipboard(item.content);
        incrementUse(item.id);
        setIsOpen(false);
        toast.success('Pasted!');
      } catch {
        toast.error('Failed to paste');
      }
    },
    [incrementUse, toast]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, sortedItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (sortedItems[selectedIndex]) {
            pasteItem(sortedItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [sortedItems, selectedIndex, pasteItem, setSelectedIndex]
  );

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              'fixed bottom-6 right-6 z-50',
              'flex items-center gap-2 px-4 py-3',
              'rounded-2xl',
              'bg-white/85 dark:bg-zinc-800/85',
              'backdrop-blur-2xl',
              'border border-white/20 dark:border-zinc-700/30',
              'shadow-glass-lg',
              'text-sm font-medium text-zinc-700 dark:text-zinc-300',
              'hover:shadow-xl hover:scale-105',
              'transition-all duration-200'
            )}
          >
            <Command className="w-4 h-4 text-accent" />
            <span className="hidden sm:inline">Quick Paste</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-700 text-[10px] text-zinc-400 font-mono">
              ⌘⇧V
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quick Paste Panel */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className={cn(
                'relative w-full max-w-xl',
                'rounded-3xl',
                'bg-white/90 dark:bg-zinc-800/90',
                'backdrop-blur-2xl',
                'border border-white/20 dark:border-zinc-700/30',
                'shadow-glass-lg',
                'overflow-hidden',
                'max-h-[70vh] flex flex-col'
              )}
            >
              {/* Search bar */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-700/50 shrink-0">
                <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search clipboard history..."
                  autoComplete="off"
                  spellCheck={false}
                  className={cn(
                    'flex-1 bg-transparent outline-none text-sm',
                    'text-zinc-900 dark:text-zinc-100',
                    'placeholder:text-zinc-400'
                  )}
                />
                <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-700 text-[10px] text-zinc-400 font-mono shrink-0">
                  ESC
                </kbd>
              </div>

              {/* Item list */}
              <div ref={listRef} className="flex-1 overflow-y-auto">
                {sortedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Copy className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
                    <p className="text-sm text-zinc-400 mb-1">
                      {searchQuery ? 'No matching items' : 'No clipboard history yet'}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {searchQuery
                        ? 'Try a different search term'
                        : 'Copy something — Paste will capture it automatically'}
                    </p>
                  </div>
                ) : (
                  sortedItems.map((item, index) => {
                    const config = CONTENT_TYPE_CONFIG[item.type] || CONTENT_TYPE_CONFIG.text;
                    const isSelected = index === selectedIndex;

                    return (
                      <div
                        key={item.id}
                        data-index={index}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => pasteItem(item)}
                        className={cn(
                          'flex items-start gap-3 px-5 py-3',
                          'cursor-pointer transition-colors',
                          'border-b border-zinc-50 dark:border-zinc-800/50 last:border-0',
                          isSelected
                            ? 'bg-accent/10 border-l-[3px] border-l-accent'
                            : 'border-l-[3px] border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                        )}
                      >
                        {/* Type icon */}
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white mt-0.5 shrink-0"
                          style={{ backgroundColor: config.color }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                              {config.label}
                            </span>
                            {item.isPinned && <Pin className="w-2.5 h-2.5 text-accent fill-accent" />}
                            {item.isFavorite && (
                              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                            )}
                          </div>
                          <p className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-relaxed">
                            {truncate(item.preview || item.content, 150)}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-zinc-400">
                              {formatDate(item.createdAt)}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {item.metadata.charCount.toLocaleString()} chars
                            </span>
                            {item.useCount > 1 && (
                              <span className="text-[10px] text-zinc-400">
                                Used {item.useCount}x
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          >
                            <Star
                              className={cn(
                                'w-3 h-3',
                                item.isFavorite
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-zinc-300 hover:text-zinc-500'
                              )}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(item.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3 text-zinc-300 hover:text-red-400" />
                          </button>
                        </div>

                        {/* Enter indicator */}
                        {isSelected && (
                          <div className="flex items-center gap-1 shrink-0">
                            <kbd className="px-1.5 py-0.5 rounded-md bg-accent/10 text-[10px] text-accent font-mono font-medium">
                              ↵
                            </kbd>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-center gap-5 px-5 py-2.5 border-t border-zinc-100 dark:border-zinc-700/50 shrink-0">
                <HintKey keys="↑↓" label="Navigate" />
                <HintKey keys="↵" label="Paste" />
                <HintKey keys="ESC" label="Close" />
                <span className="text-[10px] text-zinc-400">
                  {items.length} items saved locally
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function HintKey({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
      <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-700 text-[10px] font-mono">
        {keys}
      </kbd>
      {label}
    </span>
  );
}
