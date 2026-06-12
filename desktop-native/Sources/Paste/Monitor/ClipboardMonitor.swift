import AppKit

class ClipboardMonitor {
    private let store: ClipboardStore
    private var timer: Timer?
    private var lastChangeCount = NSPasteboard.general.changeCount
    var suppressNextChange = false

    init(store: ClipboardStore) { self.store = store }

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkPasteboard()
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    private func checkPasteboard() {
        let pb = NSPasteboard.general
        guard pb.changeCount != lastChangeCount else { return }
        lastChangeCount = pb.changeCount

        if suppressNextChange { suppressNextChange = false; return }

        let frontApp = NSWorkspace.shared.frontmostApplication
        let bundleID = frontApp?.bundleIdentifier ?? ""

        // Image check
        if let image = pb.readObjects(forClasses: [NSImage.self])?.first as? NSImage,
           let tiffData = image.tiffRepresentation {
            let jpegData = NSBitmapImageRep(data: tiffData)?
                .representation(using: .jpeg, properties: [.compressionFactor: 0.7])
            let item = ClipboardItem(
                id: UUID(), content: "", imageData: jpegData ?? tiffData,
                type: .image, sourceApp: bundleID,
                sourceAppName: frontApp?.localizedName,
                timestamp: Date(), isPinned: false, isFavorite: false, useCount: 1
            )
            DispatchQueue.main.async { self.store.add(item) }
            return
        }

        // Text check
        guard let text = pb.string(forType: .string), !text.isEmpty else { return }
        let type = detectType(text)
        let item = ClipboardItem(
            id: UUID(), content: text, imageData: nil,
            type: type, sourceApp: bundleID,
            sourceAppName: frontApp?.localizedName,
            timestamp: Date(), isPinned: false, isFavorite: false, useCount: 1
        )
        DispatchQueue.main.async { self.store.add(item) }
    }

    func writeText(_ text: String) {
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.setString(text, forType: .string)
    }

    func writeImage(_ data: Data) {
        guard let image = NSImage(data: data) else { return }
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.writeObjects([image])
    }

    private func detectType(_ text: String) -> ClipboardType {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") { return .url }
        if trimmed.contains("@") && trimmed.contains(".") && !trimmed.contains(" ") { return .email }
        if (try? JSONSerialization.jsonObject(with: Data(trimmed.utf8))) != nil { return .json }
        if trimmed.hasPrefix("#") && (trimmed.count == 4 || trimmed.count == 7) { return .color }
        let codeSignals = ["{", "func ", "class ", "import ", "var ", "let ", "def ", "=>", "];", ");"]
        if codeSignals.contains(where: trimmed.contains) && trimmed.split(separator: "\n").count > 1 { return .code }
        return .text
    }
}
