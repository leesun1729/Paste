import AppKit
import SwiftUI

// MARK: - Notification names

extension Notification.Name {
    static let popupKeyEvent = Notification.Name("popupKeyEvent")
}

// MARK: - PopupPanel

class PopupPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

// MARK: - PopupWindowController

class PopupWindowController: NSWindowController {
    private let store: ClipboardStore
    private let pasteSimulator = PasteSimulator()
    private var clickMonitor: Any?
    private var keyMonitor: Any?
    var previousApp: NSRunningApplication?

    required init?(coder: NSCoder) { fatalError() }

    init(store: ClipboardStore) {
        self.store = store

        let panel = PopupPanel(
            contentRect: NSRect(x: 0, y: 0, width: 580, height: 520),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.isMovable = false
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false

        let hostingView = NSHostingView(rootView: PopupView().environmentObject(store))
        hostingView.wantsLayer = true
        hostingView.layer?.cornerRadius = 12
        hostingView.layer?.masksToBounds = true
        panel.contentView = hostingView

        super.init(window: panel)

        NotificationCenter.default.addObserver(
            self, selector: #selector(handlePasteRequest(_:)),
            name: .init("paste:item-selected"), object: nil
        )
        NotificationCenter.default.addObserver(
            self, selector: #selector(handleDismiss),
            name: .init("popup:dismiss"), object: nil
        )
    }

    func show() {
        guard let screen = NSScreen.main ?? NSScreen.screens.first else { return }
        guard let panel = window else { return }

        previousApp = NSWorkspace.shared.frontmostApplication

        let w: CGFloat = 580
        let h: CGFloat = 520
        let x = screen.frame.origin.x + (screen.frame.width - w) / 2
        let y = screen.visibleFrame.origin.y + screen.visibleFrame.height - h - 8

        let endFrame = NSRect(x: x, y: y, width: w, height: h)
        var startFrame = endFrame
        startFrame.origin.y += 12

        panel.setFrame(startFrame, display: false)
        panel.alphaValue = 0
        panel.orderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.2
            ctx.timingFunction = CAMediaTimingFunction(name: .easeOut)
            panel.animator().setFrame(endFrame, display: true)
            panel.animator().alphaValue = 1
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            panel.makeKey()
        }

        // Notify popup to reset
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            NotificationCenter.default.post(name: .init("paste:quickpaste-focus"), object: nil)
        }

        // Local key monitor — only intercept special keys, let character input pass through
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard let self = self, self.window?.isVisible == true else { return event }
            let kc = event.keyCode
            // Only intercept arrow keys, Enter, Escape
            if kc == 126 || kc == 125 || kc == 36 || kc == 53 {
                return self.handleKey(event) ? nil : event
            }
            return event // Let TextField handle all other keys
        }

        // Click outside to dismiss
        clickMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in
            guard let self = self, let panel = self.window, panel.isVisible else { return }
            if !panel.frame.contains(NSEvent.mouseLocation) {
                self.hide()
            }
        }
    }

    func hide() {
        if let m = clickMonitor { NSEvent.removeMonitor(m); clickMonitor = nil }
        if let m = keyMonitor { NSEvent.removeMonitor(m); keyMonitor = nil }
        guard let panel = window else { return }

        var endFrame = panel.frame
        endFrame.origin.y += 12

        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.15
            ctx.timingFunction = CAMediaTimingFunction(name: .easeIn)
            panel.animator().alphaValue = 0
        }, completionHandler: { [weak self] in
            self?.window?.orderOut(nil)
            self?.window?.alphaValue = 1
        })
    }

    // MARK: - Key handling

    private func handleKey(_ event: NSEvent) -> Bool {
        let kc = Int(event.keyCode)

        switch kc {
        case 126: // Arrow Up
            store.popupSelectedIndex = max(0, store.popupSelectedIndex - 1)
            return true
        case 125: // Arrow Down
            let items = store.popupFilteredItems
            store.popupSelectedIndex = min(items.count - 1, store.popupSelectedIndex + 1)
            return true
        case 36: // Enter — paste selected item
            pasteSelectedItem()
            return true
        case 53: // Escape
            hide()
            return true
        default:
            return false // Let TextField handle character input
        }
    }

    private func pasteSelectedItem() {
        let items = store.popupFilteredItems
        let idx = store.popupSelectedIndex
        guard idx >= 0, idx < items.count else { return }
        let item = items[idx]
        store.incrementUse(item)
        pasteSimulator.paste(item, previousApp: previousApp) { [weak self] in
            self?.hide()
        }
    }

    @objc private func handlePasteRequest(_ notification: Notification) {
        guard let item = notification.object as? ClipboardItem else { return }
        pasteSimulator.paste(item, previousApp: previousApp) { [weak self] in
            self?.hide()
        }
    }

    @objc private func handleDismiss() {
        hide()
    }
}
