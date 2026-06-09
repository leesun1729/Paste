'use client';

import { useEffect, useRef } from 'react';
import { useLocalClipboardStore } from '@/store/localClipboardStore';
import { writeClipboard } from '@/lib/nativeBridge';

export function ClipboardMonitor() {
  const { addItem, addImageItem, _loadFromStorage } = useLocalClipboardStore();
  const lastContentRef = useRef('');
  const isActiveRef = useRef(true);

  useEffect(() => { _loadFromStorage(); }, [_loadFromStorage]);

  // Sync items when another WebView (main/popup) modifies localStorage
  useEffect(() => {
    const STORAGE_KEY = 'paste-local-items';
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const items = JSON.parse(e.newValue);
          useLocalClipboardStore.setState({ items });
        } catch { /* ignore parse errors */ }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    isActiveRef.current = true;

    // Listen for Swift native clipboard pushes (text or image)
    const handleNative = (e: Event) => {
      if (!isActiveRef.current) return;
      const detail = (e as CustomEvent).detail;

      // Image: {type: "image", data: "base64...", width, height}
      if (detail && typeof detail === 'object' && detail.type === 'image') {
        const { data, width, height } = detail;
        if (data) addImageItem(data, width || 0, height || 0);
        return;
      }

      // Text: plain string
      const text = typeof detail === 'string' ? detail : '';
      if (!text || text === lastContentRef.current) return;
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
  }, [addItem, addImageItem]);

  return null;
}
