import AppKit

enum ClipboardType: String, Codable, CaseIterable, Identifiable {
    case text, code, url, email, json, color, image
    var id: String { rawValue }

    var label: String {
        switch self {
        case .text: return "Text"
        case .code: return "Code"
        case .url: return "URL"
        case .email: return "Email"
        case .json: return "JSON"
        case .color: return "Color"
        case .image: return "Image"
        }
    }

    var iconName: String {
        switch self {
        case .text: return "doc.text"
        case .image: return "photo"
        case .code: return "chevron.left.forwardslash.chevron.right"
        case .url: return "link"
        case .email: return "envelope"
        case .json: return "curlybraces"
        case .color: return "paintpalette"
        }
    }

    var color: NSColor {
        switch self {
        case .text: return .systemIndigo
        case .code: return .systemGreen
        case .url: return .systemBlue
        case .email: return .systemPurple
        case .json: return .systemTeal
        case .color: return .systemYellow
        case .image: return .systemPink
        }
    }
}

struct ClipboardItem: Identifiable, Codable, Equatable, Hashable {
    let id: UUID
    var content: String
    var imageData: Data?
    var type: ClipboardType
    var sourceApp: String?
    var sourceAppName: String?
    var timestamp: Date
    var isPinned: Bool
    var isFavorite: Bool
    var useCount: Int

    var imageSizeDescription: String? {
        guard let data = imageData else { return nil }
        let mb = Double(data.count) / 1_048_576
        return mb >= 1 ? String(format: "%.1f MB", mb) : String(format: "%d KB", data.count / 1024)
    }

    var charCount: Int { content.count }

    var preview: String {
        switch type {
        case .url: return String(content.prefix(100))
        case .email: return String(content.prefix(80))
        case .code: return String(content.split(separator: "\n").prefix(3).joined(separator: "\n").prefix(150))
        default: return String(content.prefix(150))
        }
    }
}
