import AppKit
import SwiftUI
import ServiceManagement

class AppDelegate: NSObject, NSApplicationDelegate {
    let store = ClipboardStore()
    var mainWindowController: MainWindowController?
    var popupWindowController: PopupWindowController?
    var clipboardMonitor: ClipboardMonitor?
    var statusItem: NSStatusItem?
    var eventTap: CFMachPort?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        store.load()
        store.applyRetentionPolicy()

        // Apply dark mode
        if store.darkMode {
            NSApp.appearance = NSAppearance(named: .darkAqua)
        }

        clipboardMonitor = ClipboardMonitor(store: store)
        clipboardMonitor?.start()

        setupStatusBar()
        checkAccessibilityPermission()
        setupLaunchAtLogin()
    }

    // MARK: - Status Bar

    private func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem?.button {
            if let icon = NSImage(named: "StatusBarIcon") {
                icon.isTemplate = true
                button.image = icon
            } else {
                button.image = NSImage(systemSymbolName: "paperclip", accessibilityDescription: "Paste")
            }
            button.action = #selector(statusBarClicked)
            button.target = self
        }
    }

    @objc private func statusBarClicked() {
        if let win = mainWindowController?.window, win.isVisible {
            hideMainWindow()
        } else {
            showMainWindow()
        }
    }

    // MARK: - Main Window

    func showMainWindow() {
        if mainWindowController == nil {
            mainWindowController = MainWindowController(store: store)
        }
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        mainWindowController?.showWindow(nil)
    }

    func hideMainWindow() {
        mainWindowController?.window?.orderOut(nil)
        NSApp.setActivationPolicy(.accessory)
    }

    // MARK: - Popup

    func togglePopup() {
        if popupWindowController?.window?.isVisible == true {
            popupWindowController?.hide()
        } else {
            if popupWindowController == nil {
                popupWindowController = PopupWindowController(store: store)
            }
            popupWindowController?.show()
        }
    }

    // MARK: - CGEvent Tap

    func checkAccessibilityPermission() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): false] as CFDictionary
        if AXIsProcessTrustedWithOptions(options) {
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
                Task { @MainActor in self?.setupEventTap() }
            } else if count >= 60 {
                timer.invalidate()
            }
        }
    }

    private func setupEventTap() {
        let mask: CGEventMask = (1 << CGEventType.keyDown.rawValue)
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()

        eventTap = CGEvent.tapCreate(
            tap: .cgSessionEventTap, place: .headInsertEventTap,
            options: .defaultTap, eventsOfInterest: mask,
            callback: cgEventCallback, userInfo: selfPtr
        )

        if let tap = eventTap {
            let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
            CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
            CGEvent.tapEnable(tap: tap, enable: true)
        }
    }

    // MARK: - Launch at Login

    private func setupLaunchAtLogin() {
        if #available(macOS 13, *), store.launchAtLogin {
            try? SMAppService.mainApp.register()
        }
    }
}

// MARK: - Key mapping

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

// MARK: - CGEvent Callback (file-level for C callback rules)

private func cgEventCallback(
    _: CGEventTapProxy, type: CGEventType, event: CGEvent, refcon: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    guard type == .keyDown else { return Unmanaged.passRetained(event) }
    let flags = event.flags
    let keyCode = Int64(event.getIntegerValueField(.keyboardEventKeycode))

    guard let refcon else { return Unmanaged.passRetained(event) }
    let appDelegate = Unmanaged<AppDelegate>.fromOpaque(refcon).takeUnretainedValue()

    // Read hotkey from UserDefaults directly (avoid actor isolation)
    let hotkey = UserDefaults.standard.string(forKey: "hotkey") ?? "command+shift+v"
    let parts = hotkey.lowercased().split(separator: "+").map(String.init)
    let expectCmd = parts.contains("cmd")
    let expectShift = parts.contains("shift")
    let expectOpt = parts.contains("opt")
    let keyMap: [String: Int64] = [
        "a":0,"s":1,"d":2,"f":3,"h":4,"g":5,"z":6,"x":7,"c":8,"v":9,
        "b":11,"q":12,"w":13,"e":14,"r":15,"y":16,"t":17,"u":32,"i":34,
        "o":31,"p":35,"j":38,"k":40,"l":41,"n":45,"m":46,
        "1":18,"2":19,"3":20,"4":21,"5":23,"6":22,"7":26,"8":28,"9":25,"0":29,
        "space":49,"delete":51,"escape":53,"return":36,"tab":48
    ]
    let expectedKeyCode = keyMap[parts.last ?? "v"] ?? 9

    let matchCmd = expectCmd == flags.contains(.maskCommand)
    let matchShift = expectShift == flags.contains(.maskShift)
    let matchOpt = expectOpt == flags.contains(.maskAlternate)
    let matchKey = keyCode == expectedKeyCode

    if matchCmd && matchShift && matchOpt && matchKey {
        DispatchQueue.main.async { appDelegate.togglePopup() }
        return nil
    }

    // Popup visible → route ALL keys to SwiftUI via notification
    if appDelegate.popupWindowController?.window?.isVisible == true {
        let kc = Int(keyCode)
        let isShift = flags.contains(.maskShift)

        // Special keys → post notification for list navigation
        let specialKeys: Set<Int> = [126, 125, 36, 53] // ↑ ↓ Enter Escape
        if specialKeys.contains(kc) {
            NotificationCenter.default.post(name: .popupKeyEvent, object: nil, userInfo: [
                "keyCode": kc
            ])
            return nil // consume
        }

        // Character keys → post notification for text input
        let (rawKey, _) = mapKeyCode(kc, shift: isShift)
        if !rawKey.isEmpty && rawKey != "Unidentified" {
            let key = isShift && rawKey.count == 1 && rawKey.first?.isLetter == true
                ? rawKey.uppercased() : rawKey
            NotificationCenter.default.post(name: .popupKeyEvent, object: nil, userInfo: [
                "keyCode": kc,
                "char": key
            ])
            return nil // consume
        }

        // Backspace
        if kc == 51 {
            NotificationCenter.default.post(name: .popupKeyEvent, object: nil, userInfo: [
                "keyCode": kc,
                "char": "\u{8}"
            ])
            return nil
        }

        return nil // consume all other keys when popup is visible
    }

    return Unmanaged.passRetained(event)
}
