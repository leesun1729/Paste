'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { ClipboardMonitor } from '@/components/clipboard/ClipboardMonitor';
import { LocalClipboardList } from '@/components/clipboard/LocalClipboardList';
import { useUIStore, type Language } from '@/store/uiStore';
import { useLocalClipboardStore } from '@/store/localClipboardStore';
import { useTranslation } from '@/lib/i18n';

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
