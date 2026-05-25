# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Backend (cd backend && npm run dev, uses tsx watch, port 3001)
npx --prefix /Users/fairy-nn/Paste/backend tsx watch /Users/fairy-nn/Paste/backend/src/index.ts

# Frontend dev (Next.js, port 3000)
npx next dev -p 3000  # run from /Users/fairy-nn/Paste/frontend

# Desktop app (Tauri, connects to existing frontend on :3000)
source ~/.cargo/env && cd /Users/fairy-nn/Paste/desktop && cargo tauri dev

# Verify Rust compiles
source ~/.cargo/env && cargo build --manifest-path /Users/fairy-nn/Paste/desktop/src-tauri/Cargo.toml

# Check services
curl -s http://localhost:3000     # frontend main page
curl -s http://localhost:3000/popup  # quick-paste popup page
curl -s http://localhost:3001/api/health  # backend

# MongoDB
mongosh paste-clipboard
```

## Architecture

### How clipboard capture works (Tauri path)

1. Rust `arboard` reads system clipboard every 500ms in `clipboard_monitor.rs`
2. On change, emits `clipboard-changed` Tauri event
3. Frontend `ClipboardMonitor` calls `onClipboardChange()` from `lib/tauri.ts`
4. `tauri.ts` checks `window.__TAURI__.core.invoke` (Tauri 2 `withGlobalTauri: true` injects this) and polls `get_clipboard_content` Rust command via IPC
5. Captured content goes to `localClipboardStore` (Zustand + localStorage)

### How global shortcut works

1. Tauri registers `Cmd+Shift+V` via `tauri-plugin-global-shortcut` in `main.rs`
2. Handler calls `show_popup_and_remember_app` which: remembers frontmost app (via `osascript`), shows the quick-paste Tauri window (580x420, frameless, alwaysOnTop), and dispatches `paste:quickpaste-focus` CustomEvent
3. Frontend `/popup` page receives focus event, resets search + index
4. User presses Enter → frontend calls Rust `paste_and_hide` command: writes clipboard via `arboard`, hides popup, activates previous app via `osascript`, simulates `Cmd+V` via `osascript keystroke`
5. `PASTING` atomic flag prevents global shortcut from re-intercepting the simulated `Cmd+V`

### Window management (Tauri)

- **main window**: 1200×800, starts hidden, close button hides to tray (not quit). `on_window_event` intercepts `CloseRequested` and calls `api.prevent_close()` + `hide()`. Tray left-click toggles visibility.
- **quick-paste window**: 580×420, frameless, `alwaysOnTop`, `skipTaskbar`, no close/minimize buttons. On macOS, `elevate_popup_window` sets NSWindow level to 101 and `CanJoinAllSpaces | FullScreenAuxiliary` collection behavior so it appears above fullscreen apps. Called on first `show()`.

### State management

- **localClipboardStore** (`store/localClipboardStore.ts`): Primary state. Local-first with localStorage persistence. Items start empty for SSR safety, `_loadFromStorage()` called in `useEffect`. Deduplication via content hash (last 5 items). Max 500 items.
- **authStore**: JWT tokens in localStorage, `refreshAuth()` called on app mount.
- **clipboardStore**: Server-side clipboard data (secondary, for cloud sync).
- **uiStore**: Theme, viewMode, sidebar, activePanel.

### Frontend routing

- `/` = MainLayout with Sidebar + Header + LocalClipboardList + QuickPaste floating button + ClipboardMonitor (invisible)
- `/popup` = Standalone quick-paste popup view (used by Tauri's quick-paste window). Has its own `layout.tsx` (`'use client'`) and `page.tsx`. Uses global `keydown` listener with refs to avoid stale closures.
- `/auth/login`, `/auth/register` = Auth pages

### Tauri ↔ Frontend bridge (`lib/tauri.ts`)

No npm package imports — uses `window.__TAURI__.core.invoke` directly (Tauri 2 structure). `onClipboardChange()` tries Tauri IPC first, falls back to `navigator.clipboard.readText()` polling for browser dev. `isTauri()` checks for `__TAURI__` global.

### macOS-specific quirks

- **WKWebView CSS**: `backdrop-blur` doesn't render well. Global CSS has `html.tauri * { backdrop-filter: none !important }` and replaces `bg-white/70` etc. with opaque colors. Tauri detection happens via inline script in root `layout.tsx` checking `window.__TAURI__ || window.__TAURI_INTERNALS__`.
- **Global shortcuts + keystroke simulation**: Both need Accessibility permission (System Settings → Privacy → Accessibility → Terminal).
- **Fullscreen overlay**: NSWindow level set to 101 + `FullScreenAuxiliary` collection behavior.
- **Hydration**: Store initial state is empty; localStorage loaded in `useEffect`. Root `<html>` has `suppressHydrationWarning`.

### Backend

Express + Mongoose on port 3001. JWT auth with access/refresh token rotation. Clipboard endpoints return `{ success, data, pagination }` format — frontend reads `res.data` for the array. AI endpoints rate-limited separately.
