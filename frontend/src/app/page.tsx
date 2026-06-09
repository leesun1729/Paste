'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { ClipboardMonitor } from '@/components/clipboard/ClipboardMonitor';
import { LocalClipboardList } from '@/components/clipboard/LocalClipboardList';
import { QuickPaste } from '@/components/clipboard/QuickPaste';
import { useUIStore } from '@/store/uiStore';
import { useLocalClipboardStore } from '@/store/localClipboardStore';

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
  const { retentionDays, setRetentionDays, maxItems, setMaxItems, items } = useLocalClipboardStore();

  const retentionOptions = [
    { days: 7, label: '7 days' },
    { days: 14, label: '14 days' },
    { days: 30, label: '30 days' },
    { days: 90, label: '90 days' },
    { days: 0, label: 'Forever' },
  ];

  const maxItemsOptions = [
    { value: 500, label: '500' },
    { value: 1000, label: '1,000' },
    { value: 2000, label: '2,000' },
    { value: 5000, label: '5,000' },
  ];

  return (
    <div className="max-w-xl mx-auto py-12 space-y-6">
      <div className="rounded-2xl bg-white dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 p-8 shadow-sm">
        <h2 className="text-lg font-bold mb-6">Settings</h2>
        <div className="space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Theme</label>
            <div className="flex gap-2">
              {['light', 'dark', 'system'].map((t) => (
                <button key={t} onClick={() => useUIStore.getState().setTheme(t as 'light' | 'dark' | 'system')}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm capitalize hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">{t}</button>
              ))}
            </div>
          </div>

          {/* Data retention */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Data Retention</label>
            <p className="text-xs text-zinc-400 mb-3">Items older than this period will be automatically removed.</p>
            <div className="flex flex-wrap gap-2">
              {retentionOptions.map((opt) => (
                <button key={opt.days} onClick={() => setRetentionDays(opt.days)}
                  className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                    retentionDays === opt.days
                      ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/25'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Max items */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Max Items</label>
            <p className="text-xs text-zinc-400 mb-3">Maximum number of clipboard records to keep.</p>
            <div className="flex flex-wrap gap-2">
              {maxItemsOptions.map((opt) => (
                <button key={opt.value} onClick={() => setMaxItems(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                    maxItems === opt.value
                      ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/25'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Storage info */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>{items.length} items stored locally</span>
              <span>Max {maxItems.toLocaleString()} items</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Cloud sync coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
