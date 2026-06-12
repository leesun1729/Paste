'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClipboardMonitor } from '@/components/clipboard/ClipboardMonitor';
import { LocalClipboardList } from '@/components/clipboard/LocalClipboardList';
import { useUIStore, type Language } from '@/store/uiStore';
import { useLocalClipboardStore } from '@/store/localClipboardStore';
import { useTranslation } from '@/lib/i18n';
import { setHotkey as nativeSetHotkey, setLaunchAtLogin } from '@/lib/nativeBridge';

export default function Home() {
  const { activePanel } = useUIStore();

  return (
    <MainLayout>
      <ClipboardMonitor />
      {activePanel === 'settings' ? <SettingsPanel /> : <LocalClipboardList />}
    </MainLayout>
  );
}

function SettingsPanel() {
  const { retentionDays, setRetentionDays, maxItems, setMaxItems, items } = useLocalClipboardStore();
  const { language, setLanguage } = useUIStore();
  const t = useTranslation();

  const [launchEnabled, setLaunchEnabled] = useState(true);
  const [hotkey, setHotkeyState] = useState('cmd+shift+v');
  const [recording, setRecording] = useState(false);

  // Load saved settings
  useEffect(() => {
    try {
      const savedHotkey = localStorage.getItem('paste-hotkey') || 'cmd+shift+v';
      setHotkeyState(savedHotkey);
      const savedLaunch = localStorage.getItem('paste-launch-at-login');
      setLaunchEnabled(savedLaunch !== 'false'); // default: true
    } catch { /* ignore */ }
  }, []);

  const toggleLaunch = useCallback(() => {
    const next = !launchEnabled;
    setLaunchEnabled(next);
    try { localStorage.setItem('paste-launch-at-login', String(next)); } catch { /* ignore */ }
    setLaunchAtLogin(next);
  }, [launchEnabled]);

  const formatHotkey = (hk: string) => {
    return hk.split('+').map(k => {
      const map: Record<string, string> = { cmd: '⌘', shift: '⇧', opt: '⌥', option: '⌥', ctrl: '⌃' };
      return map[k.toLowerCase()] || k.toUpperCase();
    }).join('');
  };

  // Record new shortcut
  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only save when a non-modifier key is pressed
      const modifierKeys = ['Meta', 'Shift', 'Alt', 'Control', 'meta', 'shift', 'alt', 'control'];
      if (modifierKeys.includes(e.key)) return;

      const parts: string[] = [];
      if (e.metaKey) parts.push('cmd');
      if (e.ctrlKey) parts.push('ctrl');
      if (e.altKey) parts.push('opt');
      if (e.shiftKey) parts.push('shift');

      // Map e.key to a consistent name
      let key = e.key.toLowerCase();
      // Special keys
      const specialMap: Record<string, string> = {
        'arrowup': 'up', 'arrowdown': 'down', 'arrowleft': 'left', 'arrowright': 'right',
        ' ': 'space', 'escape': 'escape', 'delete': 'delete', 'backspace': 'delete',
        'enter': 'return', 'return': 'return', 'tab': 'tab',
      };
      key = specialMap[key] || key;

      // Must have at least one modifier + a regular key
      if (parts.length >= 1 && key.length >= 1) {
        parts.push(key);
        const newHotkey = parts.join('+');
        setHotkeyState(newHotkey);
        try { localStorage.setItem('paste-hotkey', newHotkey); } catch { /* ignore */ }
        nativeSetHotkey(newHotkey);
        setRecording(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [recording]);

  const retentionOptions = [
    { days: 7, label: `7 ${t('days')}` },
    { days: 14, label: `14 ${t('days')}` },
    { days: 30, label: `30 ${t('days')}` },
    { days: 90, label: `90 ${t('days')}` },
    { days: 0, label: t('forever') },
  ];

  const maxItemsOptions = [
    { value: 500, label: '500' },
    { value: 1000, label: '1,000' },
    { value: 2000, label: '2,000' },
    { value: 5000, label: '5,000' },
  ];

  const languageOptions: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ];

  return (
    <div className="max-w-xl mx-auto py-8 space-y-5">
      <button onClick={() => useUIStore.getState().setActivePanel('main')}
        className="flex items-center gap-1.5 text-[13px] transition-colors"
        style={{ color: 'var(--text-secondary)' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t('back')}
      </button>
      <div className="rounded-xl p-6 glass-surface" style={{ border: '1px solid var(--border)' }}>
        <h2 className="text-[15px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>{t('settings.title')}</h2>
        <div className="space-y-5">

          {/* Launch at Login */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{t('launch.at.login')}</label>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('launch.at.login.desc')}</p>
            </div>
            <button onClick={toggleLaunch}
              className="relative w-10 h-[22px] rounded-full transition-colors duration-200"
              style={{ background: launchEnabled ? 'var(--accent)' : 'var(--border-strong)' }}>
              <div className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ left: launchEnabled ? '20px' : '2px' }} />
            </button>
          </div>

          {/* Hotkey */}
          <div>
            <label className="block text-[13px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('hotkey')}</label>
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>{t('hotkey.desc')}</p>
            <button onClick={() => setRecording(true)}
              className="px-4 py-2 rounded-md text-[13px] font-mono transition-colors"
              style={recording
                ? { background: 'var(--accent)', color: '#fff', minWidth: '120px' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: '120px' }}>
              {recording ? t('hotkey.recording') : formatHotkey(hotkey)}
            </button>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('theme')}</label>
            <div className="flex gap-1.5">
              {(['light', 'dark', 'system'] as const).map((th) => (
                <button key={th} onClick={() => useUIStore.getState().setTheme(th)}
                  className="px-3.5 py-1.5 rounded-md text-[12px] capitalize transition-colors"
                  style={useUIStore.getState().theme === th
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  {th}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('language')}</label>
            <div className="flex gap-1.5">
              {languageOptions.map((opt) => (
                <button key={opt.value} onClick={() => setLanguage(opt.value)}
                  className="px-3.5 py-1.5 rounded-md text-[12px] transition-colors"
                  style={language === opt.value
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data retention */}
          <div>
            <label className="block text-[13px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('data.retention')}</label>
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>{t('data.retention.desc')}</p>
            <div className="flex flex-wrap gap-1.5">
              {retentionOptions.map((opt) => (
                <button key={opt.days} onClick={() => setRetentionDays(opt.days)}
                  className="px-3.5 py-1.5 rounded-md text-[12px] transition-colors"
                  style={retentionDays === opt.days
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max items */}
          <div>
            <label className="block text-[13px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('max.items')}</label>
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>{t('max.items.desc')}</p>
            <div className="flex flex-wrap gap-1.5">
              {maxItemsOptions.map((opt) => (
                <button key={opt.value} onClick={() => setMaxItems(opt.value)}
                  className="px-3.5 py-1.5 rounded-md text-[12px] transition-colors"
                  style={maxItems === opt.value
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Storage info */}
          <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              <span>{items.length} {t('items.stored')}</span>
              <span>{t('max')} {maxItems.toLocaleString()} {t('items')}</span>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{t('cloud.sync')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
