import AppKit
import WebKit

final class PopupWindowController {

    private var panel: KeyablePanel?
    private(set) var webView: WKWebView?
    var isVisible: Bool { panel?.isVisible ?? false }
    private var clickMonitor: Any?
    private var isAnimating = false

    init(path: String, processPool: WKProcessPool) {
        let panel = KeyablePanel(
            contentRect: NSRect(x: 0, y: 0, width: 580, height: 520),
            styleMask: [.borderless],
            backing: .buffered, defer: false
        )
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false

        panel.contentView?.wantsLayer = true
        panel.contentView?.layer?.cornerRadius = 12
        panel.contentView?.layer?.masksToBounds = true

        let config = WKWebViewConfiguration()
        config.processPool = processPool
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        let cc = WKUserContentController()
        cc.addUserScript(WKUserScript(
            source: "window.__PASTE_NATIVE__=true;window.__pasteReceiveContent__=function(t){document.dispatchEvent(new CustomEvent('paste:native-clipboard',{detail:t}));};", injectionTime: .atDocumentStart, forMainFrameOnly: true
        ))
        config.userContentController = cc

        let wv = WKWebView(frame: panel.contentView?.bounds ?? .zero, configuration: config)
        wv.autoresizingMask = [.width, .height]
        wv.setValue(false, forKey: "drawsBackground")

        if let resourceURL = Bundle.main.resourceURL {
            let webDir = resourceURL.appendingPathComponent("web")
            let fileURL = webDir.appendingPathComponent(path)
            wv.loadFileURL(fileURL, allowingReadAccessTo: webDir)
        }

        panel.contentView?.addSubview(wv)
        self.webView = wv
        self.panel = panel
    }

    func show() {
        guard let panel = panel, !isAnimating else { return }
        guard let screen = NSScreen.main ?? NSScreen.screens.first else { return }

        // Remove existing click monitor
        if let monitor = clickMonitor {
            NSEvent.removeMonitor(monitor)
            clickMonitor = nil
        }

        let screenFrame = screen.frame
        let visibleFrame = screen.visibleFrame
        let panelWidth: CGFloat = 580
        let panelHeight: CGFloat = 520

        // Center horizontally, below menu bar with 8pt gap
        let x = screenFrame.origin.x + (screenFrame.width - panelWidth) / 2
        let y = visibleFrame.origin.y + visibleFrame.height - panelHeight - 8

        let endFrame = NSRect(x: x, y: y, width: panelWidth, height: panelHeight)

        NSApp.activate(ignoringOtherApps: true)

        // Show immediately, then animate
        panel.alphaValue = 1
        panel.setFrame(endFrame, display: true, animate: true)
        panel.makeKeyAndOrderFront(nil)

        if let wv = webView {
            panel.makeFirstResponder(wv)
        }

        // Focus input after animation
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            self?.webView?.evaluateJavaScript(
                "var i=document.querySelector('input');if(i)i.focus();document.dispatchEvent(new CustomEvent('paste:quickpaste-focus'));",
                completionHandler: nil
            )
        }

        // Click outside to dismiss
        clickMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { [weak self] _ in
            guard let self = self, self.isVisible, !self.isAnimating else { return }
            let mouseLocation = NSEvent.mouseLocation
            if !panel.frame.contains(mouseLocation) {
                self.hide()
            }
        }
    }

    func hide() {
        guard let panel = panel, isVisible, !isAnimating else { return }

        // Remove click monitor
        if let monitor = clickMonitor {
            NSEvent.removeMonitor(monitor)
            clickMonitor = nil
        }

        isAnimating = true

        // Animate out: slide up and fade
        var endFrame = panel.frame
        endFrame.origin.y += 12

        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.15
            ctx.timingFunction = CAMediaTimingFunction(name: .easeIn)
            panel.animator().alphaValue = 0
        }, completionHandler: { [weak self] in
            self?.panel?.orderOut(nil)
            self?.panel?.alphaValue = 1
            self?.isAnimating = false
        })
    }
}
