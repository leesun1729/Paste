'use client';

import { useEffect, useRef } from 'react';
import { useLocalClipboardStore } from '@/store/localClipboardStore';
import { writeClipboard } from '@/lib/nativeBridge';

export function ClipboardMonitor() {
  const { addItem, _loadFromStorage } = useLocalClipboardStore();
  const lastContentRef = useRef('');
  const isActiveRef = useRef(true);

  useEffect(() => { _loadFromStorage(); }, [_loadFromStorage]);

  useEffect(() => {
    isActiveRef.current = true;

    // Listen for Swift native clipboard pushes
    const handleNative = (e: Event) => {
      const text = (e as CustomEvent).detail as string;
      if (!isActiveRef.current || !text || text === lastContentRef.current) return;
      lastContentRef.current = text;
      addItem(text, 'Desktop');
    };
    document.addEventListener('paste:native-clipboard', handleNative);

    // Browser fallback: poll navigator.clipboard
    let browserLast = '';
    const interval = setInterval(async () => {
      if (!isActiveRef.current) return;
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== browserLast) {
          browserLast = text;
          if (text !== lastContentRef.current) {
            lastContentRef.current = text;
            addItem(text, 'Browser');
          }
        }
      } catch { /* clipboard access denied */ }
    }, 500);

    const handleFocus = () => { lastContentRef.current = ''; browserLast = ''; };
    window.addEventListener('focus', handleFocus);

    return () => {
      isActiveRef.current = false;
      document.removeEventListener('paste:native-clipboard', handleNative);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [addItem]);

  return null;
}
