'use client';

// Unified bridge: Swift WKWebView → Tauri → Browser fallback

type PasteAction = {
    action: 'pasteAndHide' | 'hidePopup' | 'copyToClipboard';
    content?: string;
    imageData?: string;
    isImage?: boolean;
};

function swiftPost(action: PasteAction) {
    const w = window as unknown as Record<string, unknown>;
    const handler = (w.webkit as Record<string, unknown> | undefined)
        ?.messageHandlers as Record<string, unknown> | undefined;
    const bridge = handler?.pasteBridge as { postMessage: (msg: unknown) => void } | undefined;
    if (bridge) {
        bridge.postMessage(action);
        return true;
    }
    return false;
}

function tauriInvoke(): ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null {
    const w = window as unknown as Record<string, unknown>;
    const tauri = w.__TAURI__ as Record<string, unknown> | null;
    return (tauri?.core as Record<string, unknown> | null)?.invoke as
        ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null;
}

export async function pasteAndHide(content: string, imageData?: string): Promise<void> {
    // Swift WKWebView
    if (imageData) {
        if (swiftPost({ action: 'pasteAndHide', imageData, isImage: true })) return;
    } else {
        if (swiftPost({ action: 'pasteAndHide', content })) return;
    }

    // Tauri
    const invoke = tauriInvoke();
    if (invoke) {
        try {
            await invoke('paste_and_hide', { content });
            return;
        } catch { /* fall through */ }
    }

    // Browser fallback
    await navigator.clipboard.writeText(content);
}

export async function hidePopup(): Promise<void> {
    if (swiftPost({ action: 'hidePopup' })) return;

    const invoke = tauriInvoke();
    if (invoke) {
        try { await invoke('hide_popup'); } catch { /* ignore */ }
    }
}

export async function writeClipboard(content: string, imageData?: string): Promise<void> {
    if (imageData) {
        if (swiftPost({ action: 'copyToClipboard', imageData, isImage: true })) return;
    } else {
        if (swiftPost({ action: 'copyToClipboard', content })) return;
    }

    const invoke = tauriInvoke();
    if (invoke) {
        try { await invoke('write_to_clipboard', { content }); return; } catch { /* fall through */ }
    }

    await navigator.clipboard.writeText(content);
}

export function isNativeApp(): boolean {
    const w = window as unknown as Record<string, unknown>;
    return !!(
        (w.webkit as Record<string, unknown> | undefined)
            ?.messageHandlers as Record<string, unknown> | undefined
    )?.pasteBridge || !!w.__TAURI__;
}
