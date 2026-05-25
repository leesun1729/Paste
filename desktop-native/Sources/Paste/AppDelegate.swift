import AppKit
import WebKit
import CoreGraphics
import Carbon

// MARK: - Key mapping (file-level to avoid Swift 6 C callback capture issues)

private func mapKeyCode(_ keyCode: Int, shift: Bool) -> (key: String, code: String) {
    switch keyCode {
    case 126: return ("ArrowUp", "ArrowUp")
    case 125: return ("ArrowDown", "ArrowDown")
    case 123: return ("ArrowLeft", "ArrowLeft")
    case 124: return ("ArrowRight", "ArrowRight")
    case 36:  return ("Enter", "Enter")
    case 53:  return ("Escape", "Escape")
    case 51:  return ("Backspace", "Backspace")
    case 48:  return ("Tab", "Tab")
    case 49:  return (" ", "Space")
    case 0:   return ("a", "KeyA");   case 1:   return ("s", "KeyS")
    case 2:   return ("d", "KeyD");   case 3:   return ("f", "KeyF")
    case 4:   return ("h", "KeyH");   case 5:   return ("g", "KeyG")
    case 6:   return ("z", "KeyZ");   case 7:   return ("x", "KeyX")
    case 8:   return ("c", "KeyC");   case 9:   return ("v", "KeyV")
    case 11:  return ("b", "KeyB");   case 12:  return ("q", "KeyQ")
    case 13:  return ("w", "KeyW");   case 14:  return ("e", "KeyE")
    case 15:  return ("r", "KeyR");   case 16:  return ("y", "KeyY")
    case 17:  return ("t", "KeyT");   case 32:  return ("u", "KeyU")
    case 34:  return ("i", "KeyI");   case 31:  return ("o", "KeyO")
    case 35:  return ("p", "KeyP");   case 33:  return ("[", "BracketLeft")
    case 30:  return ("]", "BracketRight")
    case 38:  return ("j", "KeyJ");   case 40:  return ("k", "KeyK")
    case 37:  return ("l", "KeyL");   case 41:  return (";", "Semicolon")
    case 39:  return ("'", "Quote")
    case 45:  return ("n", "KeyN");   case 46:  return ("m", "KeyM")
    case 43:  return (",", "Comma");  case 47:  return (".", "Period")
    case 44:  return ("/", "Slash");  case 42:  return ("\\", "Backslash")
    case 18:  return ("1", "Digit1"); case 19:  return ("2", "Digit2")
    case 20:  return ("3", "Digit3"); case 21:  return ("4", "Digit4")
    case 23:  return ("5", "Digit5"); case 22:  return ("6", "Digit6")
    case 26:  return ("7", "Digit7"); case 28:  return ("8", "Digit8")
    case 25:  return ("9", "Digit9"); case 29:  return ("0", "Digit0")
    case 27:  return ("-", "Minus");  case 24:  return ("=", "Equal")
    default:  return ("Unidentified", "")
    }
}

private func cgEventCallback(
    _: CGEventTapProxy, type: CGEventType, event: CGEvent, refcon: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    guard type == .keyDown else { return Unmanaged.passRetained(event) }
    let flags = event.flags
    let isCmd = flags.contains(.maskCommand)
    let isShift = flags.contains(.maskShift)
    let keyCode = Int64(event.getIntegerValueField(.keyboardEventKeycode))

    guard let refcon else { return Unmanaged.passRetained(event) }
    let app = Unmanaged<AppDelegate>.fromOpaque(refcon).takeUnretainedValue()

    // Cmd+Shift+V → toggle popup
    if isCmd && isShift && keyCode == 9 {
        DispatchQueue.main.async { app.togglePopup() }
        return nil
    }

    // Popup visible → route all keys to WebView, consume from original app
    if app.popupIsVisible() {
        let (key, code) = mapKeyCode(Int(keyCode), shift: isShift)
        DispatchQueue.main.async {
            app.routeKeyToPopup(key: key, code: code, keyCode: UInt16(keyCode))
        }
        return nil
    }

    return Unmanaged.passRetained(event)
}

// MARK: - AppDelegate

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler {

    private var statusItem: NSStatusItem!
    private let clipboardMonitor = ClipboardMonitor()
    private let pasteSimulator = PasteSimulator()
    private var previousApp: NSRunningApplication?
    private var eventTap: CFMachPort?

    private var mainWindow: NSWindow?
    private var mainWebView: WKWebView?
    fileprivate var popupWindow: PopupWindowController?
    private let sharedProcessPool = WKProcessPool()

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_: Notification) {
        setupStatusBar()
        setupEventTap()
        startClipboardMonitor()
    }

    // MARK: - Status Bar

    private func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "paperclip", accessibilityDescription: "Paste")
        }

        // Menu (appears on click)
        let menu = NSMenu()
        let showItem = NSMenuItem(title: "Show Paste", action: #selector(statusBarClicked), keyEquivalent: "")
        showItem.target = self
        menu.addItem(showItem)
        menu.addItem(NSMenuItem.separator())
        let quitItem = NSMenuItem(title: "Quit Paste", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)
        statusItem.menu = menu
    }

    @objc private func quitApp() {
        NSApp.terminate(nil)
    }

    @objc private func statusBarClicked() {
        if let win = mainWindow, win.isVisible { win.orderOut(nil) }
        else { openMainWindow() }
    }

    // MARK: - Main

    private func openMainWindow() {
        if mainWindow == nil {
            let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1200, height: 800), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
            win.title = "Paste"; win.center(); win.isReleasedWhenClosed = false; win.delegate = self
            let wv = makeWebView(url: "http://localhost:3000")
            win.contentView = wv; mainWindow = win; mainWebView = wv
        }
        mainWindow?.makeKeyAndOrderFront(nil)
    }

    private func makeWebView(url: String) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.processPool = sharedProcessPool
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        let cc = WKUserContentController()
        cc.add(self, name: "pasteBridge")
        cc.addUserScript(WKUserScript(source: "window.__PASTE_NATIVE__=true;window.__pasteReceiveContent__=function(t){document.dispatchEvent(new CustomEvent('paste:native-clipboard',{detail:t}));};", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = cc
        let wv = WKWebView(frame: .zero, configuration: config)
        wv.autoresizingMask = [.width, .height]
        if let u = URL(string: url) { wv.load(URLRequest(url: u)) }
        return wv
    }

    private func broadcastClipboardText(_ text: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: text, options: .fragmentsAllowed), let json = String(data: data, encoding: .utf8) else { return }
        let script = "if(window.__pasteReceiveContent__){window.__pasteReceiveContent__(\(json));}"
        mainWebView?.evaluateJavaScript(script, completionHandler: nil)
        popupWindow?.webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    // MARK: - Clipboard

    private func startClipboardMonitor() {
        clipboardMonitor.onNewText = { [weak self] text in self?.broadcastClipboardText(text) }
        clipboardMonitor.start()
    }

    // MARK: - CGEvent Tap

    private func setupEventTap() {
        let mask: CGEventMask = (1 << CGEventType.keyDown.rawValue)
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()

        eventTap = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap, options: .defaultTap, eventsOfInterest: mask, callback: cgEventCallback, userInfo: selfPtr)

        if let tap = eventTap {
            let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
            CGEvent.tapEnable(tap: tap, enable: true)
        }
    }

    // MARK: - Sound

    private func playSound(_ name: String) {
        if let sound = NSSound(named: name) { sound.play() }
    }

    // MARK: - Popup

    fileprivate func togglePopup() {
        if popupWindow?.isVisible == true { popupWindow?.hide() }
        else { openPopup(); playSound("Pop") }
    }

    fileprivate func popupIsVisible() -> Bool { popupWindow?.isVisible ?? false }

    fileprivate func routeKeyToPopup(key: String, code: String, keyCode: UInt16) {
        // Wrap JS in a string to avoid interpolation issues
        let kc = Int(keyCode)
        let js: String
        switch kc {
        case 126: js = "window.__pasteNavUp&&__pasteNavUp();void(0)"
        case 125: js = "window.__pasteNavDown&&__pasteNavDown();void(0)"
        case 36:  js = "window.__pasteConfirm&&__pasteConfirm();void(0)"
        case 53:  js = "window.__pasteCancel&&__pasteCancel();void(0)"
        case 51:  js = "window.__pasteDeleteChar&&__pasteDeleteChar();void(0)"
        default:
            if !key.isEmpty, key != "Unidentified" {
                let escaped = key
                    .replacingOccurrences(of: "\\", with: "\\\\")
                    .replacingOccurrences(of: "'", with: "\\'")
                    .replacingOccurrences(of: "\"", with: "\\\"")
                    .replacingOccurrences(of: "\n", with: "\\n")
                js = "window.__pasteTypeChar&&__pasteTypeChar(\"\(escaped)\");void(0)"
            } else {
                return
            }
        }

        popupWindow?.webView?.evaluateJavaScript(js) { result, error in
            if let error {
                print("JS error (kc=\(kc)): \(error.localizedDescription)")
            }
        }
    }

    private func openPopup() {
        previousApp = NSWorkspace.shared.frontmostApplication
        if popupWindow == nil {
            popupWindow = PopupWindowController(url: "http://localhost:3000/popup", processPool: sharedProcessPool)
            // Register the JS → Native bridge on the popup WebView
            if let wv = popupWindow?.webView {
                wv.configuration.userContentController.add(self, name: "pasteBridge")
            }
        }
        popupWindow?.show()
    }

    private func hidePopup() { popupWindow?.hide() }

    // MARK: - WKScriptMessageHandler

    @MainActor func userContentController(_: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        switch action {
        case "pasteAndHide":
            if let content = body["content"] as? String {
                playSound("Pop")
                pasteSimulator.pasteAndRestore(content, previousApp: previousApp) { [weak self] in self?.hidePopup() }
            }
        case "hidePopup": hidePopup()
        case "copyToClipboard":
            if let content = body["content"] as? String { clipboardMonitor.write(content) }
        default: break
        }
    }
}

extension AppDelegate: NSWindowDelegate {
    func windowShouldClose(_ sender: NSWindow) -> Bool { sender.orderOut(nil); return false }
}
