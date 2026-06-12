import AppKit
import SwiftUI

// MARK: - Notification names

extension Notification.Name {
    static let popupKeyEvent = Notification.Name("popupKeyEvent")
}

// MARK: - PopupPanel

class PopupPanel: NSPanel {
    override var canBecomeKey: Bool { true }
}

// MARK: - PopupWindowController

class PopupWindowController: NSWindowController {
    private let store: ClipboardStore
    private let pasteSimulator = PasteSimulator()
    private var clickMonitor: Any?
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

        // Notify popup to reset and focus
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            NotificationCenter.default.post(name: .init("paste:quickpaste-focus"), object: nil)
        }

        clickMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in
            guard let self = self, let panel = self.window, panel.isVisible else { return }
            if !panel.frame.contains(NSEvent.mouseLocation) {
                self.hide()
            }
        }
    }

    func hide() {
        if let m = clickMonitor { NSEvent.removeMonitor(m); clickMonitor = nil }
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
