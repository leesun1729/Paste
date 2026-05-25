'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { ClipboardMonitor } from '@/components/clipboard/ClipboardMonitor';
import { LocalClipboardList } from '@/components/clipboard/LocalClipboardList';
import { QuickPaste } from '@/components/clipboard/QuickPaste';
import { useUIStore } from '@/store/uiStore';

export default function Home() {
  const { activePanel } = useUIStore();

  return (
    <MainLayout>
      <ClipboardMonitor />
      {activePanel === 'settings' ? <SettingsPanel /> : <LocalClipboardList />}
      <QuickPaste />
    </MainLayout>
  );
}

function SettingsPanel() {
  return (
    <div className="max-w-xl mx-auto py-12 space-y-6">
      <div className="rounded-2xl bg-white dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 p-8 shadow-sm">
        <h2 className="text-lg font-bold mb-6">Settings</h2>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Theme</label>
          <div className="flex gap-2">
            {['light', 'dark', 'system'].map((t) => (
              <button key={t} onClick={() => useUIStore.getState().setTheme(t as 'light' | 'dark' | 'system')}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm capitalize hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">{t}</button>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-400 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
          Data stored locally. Cloud sync coming soon.
        </p>
      </div>
    </div>
  );
}
