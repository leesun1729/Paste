import AppKit
import WebKit

final class PopupWindowController {

    private var panel: KeyablePanel?
    private(set) var webView: WKWebView?
    var isVisible: Bool { panel?.isVisible ?? false }

    init(url: String, processPool: WKProcessPool) {
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
        panel.center()
        panel.isReleasedWhenClosed = false
        panel.hidesOnDeactivate = false

        panel.contentView?.wantsLayer = true
        panel.contentView?.layer?.cornerRadius = 18
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
        if let u = URL(string: url) { wv.load(URLRequest(url: u)) }

        panel.contentView?.addSubview(wv)
        self.webView = wv
        self.panel = panel
    }

    func show() {
        panel?.center()
        panel?.level = .floating
        panel?.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        NSApp.activate(ignoringOtherApps: true)
        panel?.makeKeyAndOrderFront(nil)
        // Make WebView first responder for keyboard events
        if let wv = webView {
            panel?.makeFirstResponder(wv)
        }
        // Reset state but DON'T auto-focus input (navigation mode by default)
        webView?.evaluateJavaScript(
            "document.dispatchEvent(new CustomEvent('paste:quickpaste-focus'));",
            completionHandler: nil
        )
    }

    func hide() {
        panel?.orderOut(nil)
    }
}
