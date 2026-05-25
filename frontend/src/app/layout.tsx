import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Paste - Modern Clipboard Manager',
  description: 'A beautiful, modern clipboard manager with cloud sync and AI features',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme || theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.add(theme);
                  // Detect Tauri for CSS fixes
                  if (window.__TAURI__ || window.__TAURI_INTERNALS__) {
                    document.documentElement.classList.add('tauri');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '14px',
              background: 'rgba(30, 30, 30, 0.85)',
              color: '#fff',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '13px',
              padding: '10px 16px',
            },
          }}
        />
      </body>
    </html>
  );
}
