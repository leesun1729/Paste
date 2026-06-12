import AppKit
import WebKit
import CoreGraphics
import Carbon
import ServiceManagement

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

/// Map keyCode to actual character, respecting Shift for letters and symbols
private func mapCharForKeyCode(_ keyCode: Int, shift: Bool) -> String {
    // Letters
    let letters: [Int: String] = [
        0:"a",1:"s",2:"d",3:"f",4:"h",5:"g",6:"z",7:"x",8:"c",9:"v",
        11:"b",12:"q",13:"w",14:"e",15:"r",16:"y",17:"t",32:"u",34:"i",
        31:"o",35:"p",38:"j",40:"k",37:"l",45:"n",46:"m"
    ]
    if let l = letters[keyCode] { return shift ? l.uppercased() : l }

    // Numbers and their Shift symbols
    let numbers: [Int: (normal: String, shifted: String)] = [
        18:("1","!"),19:("2","@"),20:("3","#"),21:("4","$"),23:("5","%"),
        22:("6","^"),26:("7","&"),28:("8","*"),25:("9","("),29:("0",")")
    ]
    if let n = numbers[keyCode] { return shift ? n.shifted : n.normal }

    // Symbol keys and their Shift variants
    let symbols: [Int: (normal: String, shifted: String)] = [
        27:("-","_"),24:("=","+"),
        33:("[","{"),30:("]","}"),
        42:("\\","|"),
        41:(";",":"),39:("'","\""),
        43:(",","<"),47:(".",">"),44:("/","?")
    ]
    if let s = symbols[keyCode] { return shift ? s.shifted : s.normal }

    // Space
    if keyCode == 49 { return " " }

    return ""
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

    // Read custom hotkey from UserDefaults (default: Cmd+Shift+V)
    let hotkey = UserDefaults.standard.string(forKey: "hotkey") ?? "cmd+shift+v"
    let parts = hotkey.lowercased().split(separator: "+").map(String.init)
    let expectCmd = parts.contains("cmd")
    let expectShift = parts.contains("shift")
    let expectOpt = parts.contains("opt") || parts.contains("option")
    let expectKey = parts.last ?? "v"

    let keyMap: [String: Int64] = [
        "a":0,"s":1,"d":2,"f":3,"h":4,"g":5,"z":6,"x":7,"c":8,"v":9,
        "b":11,"q":12,"w":13,"e":14,"r":15,"y":16,"t":17,"u":32,"i":34,
        "o":31,"p":35,"j":38,"k":40,"l":41,"n":45,"m":46,
        "1":18,"2":19,"3":20,"4":21,"5":23,"6":22,"7":26,"8":28,"9":25,"0":29,
        "space":49,"delete":51,"escape":53,"return":36,"tab":48
    ]
    let expectedKeyCode = keyMap[expectKey] ?? 9

    let matchCmd = expectCmd == isCmd
    let matchShift = expectShift == isShift
    let matchOpt = expectOpt == flags.contains(.maskAlternate)
    let matchKey = keyCode == expectedKeyCode

    if matchCmd && matchShift && matchOpt && matchKey {
        DispatchQueue.main.async { app.togglePopup() }
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
        checkAccessibilityPermission()
        startClipboardMonitor()
    }

    // MARK: - Accessibility Permission

    private func checkAccessibilityPermission() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): false] as CFDictionary
        let trusted = AXIsProcessTrustedWithOptions(options)
        if trusted {
            setupEventTap()
        } else {
            showAccessibilityAlert()
        }
    }

    private func showAccessibilityAlert() {
        let alert = NSAlert()
        alert.messageText = "需要辅助功能权限"
        alert.informativeText = "Paste 需要辅助功能权限来监听全局快捷键 ⌘⇧V。\n\n请在「系统设置 → 隐私与安全性 → 辅助功能」中开启 Paste。"
        alert.alertStyle = .warning
        alert.addButton(withTitle: "打开系统设置")
        alert.addButton(withTitle: "稍后")

        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
            NSWorkspace.shared.open(url)
            pollAccessibilityPermission()
        }
    }

    private func pollAccessibilityPermission() {
        var count = 0
        Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] timer in
            count += 1
            if AXIsProcessTrustedWithOptions(nil) {
                timer.invalidate()
                self?.setupEventTap()
            } else if count >= 60 {
                timer.invalidate()
            }
        }
    }

    // MARK: - Main Menu (shows "Paste" in menu bar without dock icon)

    private func setupMainMenu() {
        let mainMenu = NSMenu()

        // App menu — this is what makes "Paste" appear in the menu bar
        let appMenu = NSMenu()

        let hideItem = NSMenuItem(title: "Hide Paste", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        hideItem.target = NSApp
        appMenu.addItem(hideItem)

        let hideOthersItem = NSMenuItem(title: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthersItem.keyEquivalentModifierMask = [.command, .option]
        hideOthersItem.target = NSApp
        appMenu.addItem(hideOthersItem)

        let showAllItem = NSMenuItem(title: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        showAllItem.target = NSApp
        appMenu.addItem(showAllItem)
        appMenu.addItem(NSMenuItem.separator())
        let quitItem = NSMenuItem(title: "Quit Paste", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        quitItem.target = NSApp
        appMenu.addItem(quitItem)
        let appMenuItem = NSMenuItem()
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        NSApp.mainMenu = mainMenu
    }

    // MARK: - Status Bar

    private func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            if let icon = NSImage(named: "StatusBarIcon") {
                icon.isTemplate = true
                button.image = icon
            } else {
                button.image = NSImage(systemSymbolName: "paperclip", accessibilityDescription: "Paste")
            }
            button.action = #selector(statusBarClicked)
            button.target = self
        }
        // No menu — click icon directly toggles main panel
    }

    @objc private func statusBarClicked() {
        if let win = mainWindow, win.isVisible {
            win.orderOut(nil)
            NSApp.setActivationPolicy(.accessory)
        } else { openMainWindow() }
    }

    // MARK: - Main

    private func openMainWindow() {
        if mainWindow == nil {
            let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1200, height: 800),
                styleMask: [.borderless],
                backing: .buffered, defer: false)
            win.isOpaque = false
            win.backgroundColor = .clear
            win.isMovableByWindowBackground = true
            win.center(); win.isReleasedWhenClosed = false; win.delegate = self
            win.contentView?.wantsLayer = true
            win.contentView?.layer?.cornerRadius = 12
            win.contentView?.layer?.masksToBounds = true
            let wv = makeWebView(path: "index.html")
            win.contentView = wv; mainWindow = win; mainWebView = wv
        }
        NSApp.setActivationPolicy(.regular)
        mainWindow?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func makeWebView(path: String) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.processPool = sharedProcessPool
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        let cc = WKUserContentController()
        cc.add(self, name: "pasteBridge")
        cc.add(self, name: "storage")
        cc.add(self, name: "settings")
        cc.addUserScript(WKUserScript(source: "window.__PASTE_NATIVE__=true;window.__pasteReceiveContent__=function(t){document.dispatchEvent(new CustomEvent('paste:native-clipboard',{detail:t}));};", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = cc
        let wv = WKWebView(frame: .zero, configuration: config)
        wv.autoresizingMask = [.width, .height]
        loadLocalPage(webView: wv, path: path)
        return wv
    }

    private func loadLocalPage(webView: WKWebView, path: String) {
        guard let resourceURL = Bundle.main.resourceURL else { return }
        let webDir = resourceURL.appendingPathComponent("web")
        let fileURL = webDir.appendingPathComponent(path)
        webView.loadFileURL(fileURL, allowingReadAccessTo: webDir)
    }

    private func broadcastClipboardText(_ text: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: text, options: .fragmentsAllowed), let json = String(data: data, encoding: .utf8) else { return }
        let script = "if(window.__pasteReceiveContent__){window.__pasteReceiveContent__(\(json));}"
        mainWebView?.evaluateJavaScript(script, completionHandler: nil)
        popupWindow?.webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    private func broadcastClipboardImage(_ base64: String, width: Int, height: Int) {
        let payload: [String: Any] = ["type": "image", "data": base64, "width": width, "height": height]
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
              let json = String(data: data, encoding: .utf8) else { return }
        let escaped = json.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
        let script = "if(window.__pasteReceiveContent__){window.__pasteReceiveContent__(JSON.parse('\(escaped)'));}"
        mainWebView?.evaluateJavaScript(script, completionHandler: nil)
        popupWindow?.webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    // MARK: - Clipboard

    private func startClipboardMonitor() {
        clipboardMonitor.onNewText = { [weak self] text in self?.broadcastClipboardText(text) }
        clipboardMonitor.onNewImage = { [weak self] base64, width, height in
            self?.broadcastClipboardImage(base64, width: width, height: height)
        }
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

    // MARK: - Launch at Login

    private func setLaunchAtLogin(_ enabled: Bool) {
        if #available(macOS 13.0, *) {
            do {
                if enabled {
                    try SMAppService.mainApp.register()
                } else {
                    try SMAppService.mainApp.unregister()
                }
            } catch {
                print("Launch at login error: \(error)")
            }
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

    fileprivate func routeKeyToPopup(keyCode: UInt16, shift: Bool) {
        let kc = Int(keyCode)
        let js: String

        switch kc {
        case 126: js = "window.__pasteNavUp&&__pasteNavUp();void(0)"
        case 125: js = "window.__pasteNavDown&&__pasteNavDown();void(0)"
        case 36:  js = "window.__pasteConfirm&&__pasteConfirm();void(0)"
        case 53:  js = "window.__pasteCancel&&__pasteCancel();void(0)"
        case 51:  js = "window.__pasteDeleteChar&&__pasteDeleteChar();void(0)"
        default:
            let key = mapCharForKeyCode(kc, shift: shift)
            if key.isEmpty { return }
            let escaped = key
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "'", with: "\\'")
                .replacingOccurrences(of: "\n", with: "\\n")
            js = "window.__pasteTypeChar&&__pasteTypeChar('\(escaped)');void(0)"
        }

        popupWindow?.webView?.evaluateJavaScript(js) { _, error in
            if let error { print("JS error (kc=\(kc)): \(error.localizedDescription)") }
        }
    }

    private func openPopup() {
        previousApp = NSWorkspace.shared.frontmostApplication
        if popupWindow == nil {
            popupWindow = PopupWindowController(path: "popup/index.html", processPool: sharedProcessPool)
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
            let isImage = body["isImage"] as? Bool ?? false
            if isImage, let imageData = body["imageData"] as? String {
                playSound("Pop")
                clipboardMonitor.suppressNextChange = true
                pasteSimulator.pasteImageAndRestore(imageData, previousApp: previousApp) { [weak self] in self?.hidePopup() }
            } else if let content = body["content"] as? String {
                playSound("Pop")
                clipboardMonitor.suppressNextChange = true
                pasteSimulator.pasteAndRestore(content, previousApp: previousApp) { [weak self] in self?.hidePopup() }
            }
        case "hidePopup": hidePopup()
        case "copyToClipboard":
            let isImage = body["isImage"] as? Bool ?? false
            if isImage, let imageData = body["imageData"] as? String {
                clipboardMonitor.writeImage(imageData)
            } else if let content = body["content"] as? String {
                clipboardMonitor.write(content)
            }
        case "storage":
            if let key = body["key"] as? String, let value = body["value"] as? String {
                UserDefaults.standard.set(value, forKey: "paste_\(key)")
                broadcastStorageUpdate(key: key, value: value)
            }
        case "getStorage":
            if let key = body["key"] as? String {
                let value = UserDefaults.standard.string(forKey: "paste_\(key)") ?? "null"
                let escaped = value.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
                let js = "window.__onNativeStorageGet && window.__onNativeStorageGet('\(key)', JSON.parse('\(escaped)'))"
                message.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        case "setHotkey":
            if let key = body["hotkey"] as? String {
                UserDefaults.standard.set(key, forKey: "hotkey")
            }
        case "setLaunchAtLogin":
            if let enabled = body["enabled"] as? Bool {
                setLaunchAtLogin(enabled)
            }
        default: break
        }
    }

    private func broadcastStorageUpdate(key: String, value: String) {
        let escaped = value.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
        let js = "window.__onNativeStorageUpdate && window.__onNativeStorageUpdate('\(key)', JSON.parse('\(escaped)'))"
        mainWebView?.evaluateJavaScript(js, completionHandler: nil)
        popupWindow?.webView?.evaluateJavaScript(js, completionHandler: nil)
    }
}

extension AppDelegate: NSWindowDelegate {
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        sender.orderOut(nil)
        NSApp.setActivationPolicy(.accessory)
        return false
    }
}
