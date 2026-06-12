'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="main-container flex h-screen overflow-hidden">
      <div className="titlebar" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg-secondary)' }}>
        <Header />
        <main className="flex-1 overflow-y-auto px-5 pb-5">
          {children}
        </main>
      </div>
    </div>
  );
}
