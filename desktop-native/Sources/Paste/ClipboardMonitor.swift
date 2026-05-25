import AppKit

final class ClipboardMonitor {

    var onNewText: ((String) -> Void)?

    private var lastChangeCount: Int = 0
    private var lastText: String = ""
    private var timer: Timer?

    func start() {
        lastChangeCount = NSPasteboard.general.changeCount
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.poll()
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    func write(_ text: String) {
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.setString(text, forType: .string)
    }

    private func poll() {
        let current = NSPasteboard.general.changeCount
        guard current != lastChangeCount else { return }
        lastChangeCount = current

        guard let text = NSPasteboard.general.string(forType: .string),
              !text.isEmpty,
              text != lastText else { return }

        lastText = text
        onNewText?(text)
    }
}
