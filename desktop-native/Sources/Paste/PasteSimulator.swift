import AppKit
import Carbon

final class PasteSimulator {

    private var pasteObserver: NSObjectProtocol?

    /// Write text to clipboard, hide popup, activate previous app, then simulate Cmd+V
    func pasteAndRestore(
        _ content: String,
        previousApp: NSRunningApplication?,
        completion: @escaping () -> Void
    ) {
        // 1. Write to system clipboard
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.setString(content, forType: .string)

        // 2. Hide popup
        completion()

        // 3. Activate previous app and wait for it to become active
        activateAndPaste(target: previousApp)
    }

    /// Write image to clipboard, hide popup, activate previous app, then simulate Cmd+V
    func pasteImageAndRestore(
        _ base64: String,
        previousApp: NSRunningApplication?,
        completion: @escaping () -> Void
    ) {
        guard let data = Data(base64Encoded: base64),
              let image = NSImage(data: data) else {
            completion()
            return
        }

        // 1. Write image to system clipboard
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.writeObjects([image])

        // 2. Hide popup
        completion()

        // 3. Activate previous app and wait for it to become active
        activateAndPaste(target: previousApp)
    }

    /// Activate target app, wait for activation notification, then simulate Cmd+V
    private func activateAndPaste(target: NSRunningApplication?) {
        guard let target = target else {
            simulateCmdV()
            return
        }

        // Activate the target app
        target.activate()

        // Remove any previous observer
        if let obs = pasteObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(obs)
            pasteObserver = nil
        }

        // Listen for the target app to become active
        pasteObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self = self else { return }
            guard let activated = notification.userInfo?[NSWorkspace.applicationUserInfoKey]
                    as? NSRunningApplication,
                  activated.processIdentifier == target.processIdentifier else { return }

            // Target app is now active — remove observer and paste
            if let obs = self.pasteObserver {
                NSWorkspace.shared.notificationCenter.removeObserver(obs)
                self.pasteObserver = nil
            }
            self.simulateCmdV()
        }

        // Timeout fallback: if notification doesn't arrive within 0.3s, paste anyway
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            guard let self = self else { return }
            if let obs = self.pasteObserver {
                NSWorkspace.shared.notificationCenter.removeObserver(obs)
                self.pasteObserver = nil
            }
            self.simulateCmdV()
        }
    }

    private func simulateCmdV() {
        let source = CGEventSource(stateID: .hidSystemState)
        let vKey: CGKeyCode = 9 // kVK_ANSI_V
        let cmdFlag = CGEventFlags.maskCommand

        if let down = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: true) {
            down.flags = cmdFlag
            down.post(tap: .cghidEventTap)
        }
        if let up = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: false) {
            up.flags = cmdFlag
            up.post(tap: .cghidEventTap)
        }
    }
}
