import AppKit

final class ClipboardMonitor {

    var onNewText: ((String) -> Void)?
    var onNewImage: ((String, Int, Int) -> Void)?  // base64 JPEG, width, height

    private var lastChangeCount: Int = 0
    private var lastText: String = ""
    private var lastImageHash: Int = 0
    private var timer: Timer?
    var suppressNextChange: Bool = false

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

    func writeImage(_ base64: String) {
        guard let data = Data(base64Encoded: base64),
              let image = NSImage(data: data) else { return }
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.writeObjects([image])
    }

    private func poll() {
        let current = NSPasteboard.general.changeCount
        guard current != lastChangeCount else { return }
        lastChangeCount = current

        // Skip if this change was triggered by our own paste action
        if suppressNextChange {
            suppressNextChange = false
            return
        }

        let pb = NSPasteboard.general

        // Check for image first (screenshots, copied images)
        if let tiffData = pb.data(forType: .tiff) {
            let hash = tiffData.hashValue
            guard hash != lastImageHash else { return }
            lastImageHash = hash
            lastText = ""  // reset text tracker

            guard let image = NSImage(data: tiffData) else { return }
            let rep = image.representations.first
            let width = rep?.pixelsWide ?? Int(image.size.width)
            let height = rep?.pixelsHigh ?? Int(image.size.height)

            // Convert to JPEG for smaller size (quality 0.6)
            if let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) {
                let bitmapRep = NSBitmapImageRep(cgImage: cgImage)
                if let jpegData = bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: 0.6]) {
                    let base64 = jpegData.base64EncodedString()
                    onNewImage?(base64, width, height)
                    return
                }
            }
        }

        // Check for text
        if let text = pb.string(forType: .string), !text.isEmpty, text != lastText {
            lastText = text
            lastImageHash = 0  // reset image tracker
            onNewText?(text)
        }
    }
}
