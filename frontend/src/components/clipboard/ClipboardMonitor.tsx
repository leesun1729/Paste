'use client';

import { useEffect, useRef } from 'react';
import { useLocalClipboardStore } from '@/store/localClipboardStore';

const STORAGE_KEY = 'paste-local-items';

export function ClipboardMonitor() {
  const { addItem, addImageItem, _loadFromStorage } = useLocalClipboardStore();
  const lastContentRef = useRef('');
  const isActiveRef = useRef(true);

  useEffect(() => { _loadFromStorage(); }, [_loadFromStorage]);

  // Sync items via Swift native bridge (works across file:// origins)
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    // Receive storage updates from Swift (broadcast from other WebView)
    w.__onNativeStorageUpdate = (key: string, data: unknown) => {
      if (key === STORAGE_KEY && Array.isArray(data)) {
        useLocalClipboardStore.setState({ items: data });
      }
    };
    // Receive storage get response from Swift (initial load)
    w.__onNativeStorageGet = (key: string, data: unknown) => {
      if (key === STORAGE_KEY && Array.isArray(data)) {
        useLocalClipboardStore.setState({ items: data, _loaded: true });
      }
    };
    return () => {
      delete w.__onNativeStorageUpdate;
      delete w.__onNativeStorageGet;
    };
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

    const handleFocus = () => { lastContentRef.current = ''; };
    window.addEventListener('focus', handleFocus);

    return () => {
      isActiveRef.current = false;
      document.removeEventListener('paste:native-clipboard', handleNative);
      window.removeEventListener('focus', handleFocus);
    };
  }, [addItem, addImageItem]);

  return null;
}
