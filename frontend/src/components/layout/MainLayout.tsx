'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      {/* Titlebar drag region — transparent, for window dragging */}
      <div className="titlebar" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto px-5 pb-5">
          {children}
        </main>
      </div>
    </div>
  );
}
