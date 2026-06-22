import AppKit
import SwiftUI

class MainWindow: NSWindow {
    override var canBecomeKey: Bool { true }
}

class MainWindowController: NSWindowController {
    convenience init(store: ClipboardStore) {
        let window = MainWindow(
            contentRect: NSRect(x: 0, y: 0, width: 960, height: 680),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        window.isMovableByWindowBackground = true
        window.backgroundColor = .clear
        window.isOpaque = false
        window.hasShadow = true
        window.minSize = NSSize(width: 700, height: 400)
        window.center()

        let hostingView = NSHostingView(rootView: MainView().environmentObject(store))
        hostingView.frame = window.contentView!.bounds
        hostingView.autoresizingMask = [.width, .height]
        hostingView.wantsLayer = true
        hostingView.layer?.cornerRadius = 12
        hostingView.layer?.masksToBounds = true
        window.contentView = hostingView

        self.init(window: window)
    }
}
