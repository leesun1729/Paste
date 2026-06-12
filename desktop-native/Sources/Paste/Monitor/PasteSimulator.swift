import AppKit

class PasteSimulator {
    private var pasteObserver: NSObjectProtocol?

    func paste(_ item: ClipboardItem, previousApp: NSRunningApplication?, hidePanel: @escaping () -> Void) {
        // Write to clipboard
        let pb = NSPasteboard.general
        pb.clearContents()
        if let data = item.imageData, let image = NSImage(data: data) {
            pb.writeObjects([image])
        } else {
            pb.setString(item.content, forType: .string)
        }

        hidePanel()

        // Activate previous app and wait for it
        guard let target = previousApp else {
            simulateCmdV(after: 0.1)
            return
        }
        target.activate(options: .activateIgnoringOtherApps)

        if let obs = pasteObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(obs)
        }

        pasteObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil, queue: .main
        ) { [weak self] notification in
            guard let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication,
                  app.processIdentifier == target.processIdentifier else { return }
            if let obs = self?.pasteObserver {
                NSWorkspace.shared.notificationCenter.removeObserver(obs)
                self?.pasteObserver = nil
            }
            self?.simulateCmdV()
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            if let obs = self?.pasteObserver {
                NSWorkspace.shared.notificationCenter.removeObserver(obs)
                self?.pasteObserver = nil
            }
            self?.simulateCmdV()
        }
    }

    private func simulateCmdV(after delay: Double = 0) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            let src = CGEventSource(stateID: .hidSystemState)
            if let down = CGEvent(keyboardEventSource: src, virtualKey: 0x09, keyDown: true) {
                down.flags = .maskCommand
                down.post(tap: .cghidEventTap)
            }
            if let up = CGEvent(keyboardEventSource: src, virtualKey: 0x09, keyDown: false) {
                up.flags = .maskCommand
                up.post(tap: .cghidEventTap)
            }
        }
    }
}
