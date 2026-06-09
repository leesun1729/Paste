# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Frontend dev (Next.js, port 3000)
cd /Users/fairy-nn/Paste/frontend && npx next dev -p 3000

# Build Swift desktop app (SPM)
cd /Users/fairy-nn/Paste/desktop-native && swift build -c release
# Binary output: desktop-native/.build/release/Paste

# Backend (optional cloud sync, port 3001)
npx --prefix /Users/fairy-nn/Paste/backend tsx watch /Users/fairy-nn/Paste/backend/src/index.ts

# Check services
curl -s http://localhost:3000          # frontend main page
curl -s http://localhost:3000/popup    # quick-paste popup page
curl -s http://localhost:3001/api/health  # backend

# MongoDB (if using backend)
mongosh paste-clipboard
```

## Architecture

### How clipboard capture works

1. `ClipboardMonitor.swift` polls `NSPasteboard.general.changeCount` every 500ms
2. On change, reads `NSPasteboard.general.string(forType: .string)` and fires `onNewText` callback
3. `AppDelegate.broadcastClipboardText()` serializes the text to JSON, then calls `evaluateJavaScript` on **both** the main WebView and popup WebView, dispatching a `paste:native-clipboard` CustomEvent
4. Frontend `ClipboardMonitor` component listens for `paste:native-clipboard` and calls `addItem()` on `localClipboardStore`
5. Browser dev fallback: `ClipboardMonitor` also polls `navigator.clipboard.readText()` every 500ms — but only when running outside the native app (no `webkit.messageHandlers`)

### How the global shortcut works (Cmd+Shift+V)

1. `AppDelegate.setupEventTap()` creates a `CGEvent.tapCreate` with `.headInsertEventTap` placement
2. The callback `cgEventCallback` (file-level function, not a closure, to satisfy Swift 6 C callback rules) checks for `Cmd+Shift+V` (keyCode 9)
3. When popup is **not** visible and `Cmd+Shift+V` is pressed: calls `togglePopup()` → `openPopup()`, returns `nil` (consumes the event)
4. When popup **is** visible: **all** key events are intercepted and routed to the popup WebView via `evaluateJavaScript`, calling global functions on `window`: `__pasteNavUp`, `__pasteNavDown`, `__pasteConfirm`, `__pasteCancel`, `__pasteTypeChar`, `__pasteDeleteChar`
5. The popup page (`/popup`) exposes these functions in a `useEffect`, linked to React state/refs to avoid stale closures

### How pasting works

1. User presses `Enter` in the popup → `__pasteConfirm()` → frontend calls `pasteAndHide(content)` from `nativeBridge.ts`
2. `nativeBridge.ts` tries 3 paths in order: (a) Swift `pasteBridge.postMessage({action:'pasteAndHide'})` via `WKScriptMessageHandler`, (b) Tauri `invoke('paste_and_hide')`, (c) browser `navigator.clipboard.writeText()`
3. Swift `AppDelegate.userContentController(_:didReceive:)` handles `pasteAndHide` action:
   - Plays "Pop" sound via `NSSound`
   - Calls `PasteSimulator.pasteAndRestore()` which: (a) remembers the previous frontmost app, (b) writes content to NSPasteboard, (c) activates the previous app, (d) posts `CGEvent` Cmd+V keydown/up via `.cghidEventTap`, (e) hides the popup

### Window management (AppKit)

- **Main window**: `NSWindow` 1200x800, `makeKeyAndOrderFront(nil)` on menu bar click. `NSWindowDelegate.windowShouldClose` returns `false` and calls `orderOut(nil)` — close hides, doesn't destroy
- **Popup window**: `NSPanel` 580x420, `styleMask: [.borderless, .nonactivatingPanel]`, `isFloatingPanel = true`, `level = .popUpMenu`, `collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]`. This is what makes it appear above fullscreen apps. Do NOT add `MoveToActiveSpace` — it's mutually exclusive with `CanJoinAllSpaces` and will crash
- **Menu bar**: `NSStatusBar` with "paperclip" SF Symbol. Menu has "Show Paste" (toggles main window) and "Quit Paste"
- Both windows share a `WKProcessPool` so they share localStorage

### Swift ↔ Frontend bridge

Two directions:

**Swift → JS** (`evaluateJavaScript`):
- `__pasteReceiveContent__(json)` — pushes new clipboard content to both WebViews
- `__pasteNavUp/Down/Confirm/Cancel/TypeChar/DeleteChar` — called from CGEvent callback when popup is visible

**JS → Swift** (`WKScriptMessageHandler` with name `pasteBridge`):
- `{action: "pasteAndHide", content}` — paste to previous app and hide popup
- `{action: "hidePopup"}` — hide popup only
- `{action: "copyToClipboard", content}` — write to NSPasteboard only

The bridge is in `nativeBridge.ts` as a unified 3-tier fallback: Swift → Tauri → browser.

### State management

- **localClipboardStore** (`store/localClipboardStore.ts`): Primary state. Local-first with localStorage persistence. Items start empty for SSR safety, `_loadFromStorage()` called in `useEffect`. Deduplication via content hash (last 5 items). Max 500 items, max 100KB per item.
- **uiStore** (`store/uiStore.ts`): Theme (dark/light/system), viewMode (grid/list), sidebarCollapsed, activePanel (main/detail/settings/ai), activeFilter (all/favorites/text/code/url/email/json). Theme is applied via `document.documentElement.classList.add/remove`.

### Frontend routing

- `/` = MainLayout with Sidebar + Header + LocalClipboardList + ClipboardMonitor (invisible background component)
- `/popup` = Standalone quick-paste popup view, loaded by `PopupWindowController` in its own WKWebView. Has `layout.tsx` (`'use client'`) and `page.tsx`. Exposes global `__pasteXxx` functions for CGEvent callback. Uses refs extensively to avoid stale closures.

### macOS-specific quirks

- **WKWebView backdrop-blur**: `backdrop-filter: blur()` renders as solid white/gray on WKWebView. The global CSS has no native-app class applied at the root level (the `html.tauri` class is only set by the inline script checking `window.__TAURI__`, which doesn't exist in Swift WKWebView). If glassmorphism looks broken in the app, this is the root cause — the `.glass-surface` utilities with `backdrop-filter` may need solid fallbacks for the WKWebView context
- **NSPanel + nonactivatingPanel**: The popup panel can't become key, so keyboard events won't reach it. The CGEvent tap works around this by intercepting all keys when visible and forwarding them to the WebView via JS
- **Fullscreen overlay**: Requires `collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]` on the NSPanel. The `popUpMenu` level ensures it's above normal windows
- **Accessibility permission**: Both CGEvent tap (global shortcut) and CGEvent post (paste simulation) require the app to be granted Accessibility permission. After each rebuild/reinstall, the permission must be re-granted in System Settings → Privacy → Accessibility
- **Hydration**: Store initial state is empty; localStorage loaded in `useEffect`. Root `<html>` has `suppressHydrationWarning`

### Backend (optional)

Express + Mongoose on port 3001. JWT auth with access/refresh token rotation. Clipboard endpoints return `{ success, data, pagination }` format. AI endpoints rate-limited separately. Not required for local-only use.
