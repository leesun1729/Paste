import AppKit
import SwiftUI

class MainWindowController: NSWindowController {
    convenience init(store: ClipboardStore) {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 960, height: 680),
            styleMask: [.fullSizeContentView, .titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.isMovableByWindowBackground = true
        window.backgroundColor = .clear
        window.minSize = NSSize(width: 700, height: 400)
        window.center()

        let hostingView = NSHostingView(rootView: MainView().environmentObject(store))
        hostingView.frame = window.contentView!.bounds
        hostingView.autoresizingMask = [.width, .height]
        window.contentView = hostingView

        self.init(window: window)
    }
}
