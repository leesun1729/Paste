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

    return Unmanaged.passRetained(event)
}
