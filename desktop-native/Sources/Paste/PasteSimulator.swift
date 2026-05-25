import AppKit
import Carbon

final class PasteSimulator {

    /// Write to clipboard, activate previous app, simulate Cmd+V
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

        // 3. Activate previous app
        if let app = previousApp {
            app.activate()
        }

        // 4. Small delay for focus switch
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
            self.simulateCmdV()
        }
    }

    private func simulateCmdV() {
        let source = CGEventSource(stateID: .hidSystemState)

        let vKey: CGKeyCode = 9 // kVK_ANSI_V
        let cmdFlag = CGEventFlags.maskCommand

        // Key down
        if let down = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: true) {
            down.flags = cmdFlag
            down.post(tap: .cghidEventTap)
        }

        // Key up
        if let up = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: false) {
            up.flags = cmdFlag
            up.post(tap: .cghidEventTap)
        }
    }
}
