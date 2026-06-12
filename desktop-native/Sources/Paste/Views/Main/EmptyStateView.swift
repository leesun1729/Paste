import SwiftUI

struct EmptyStateView: View {
    let filter: ClipboardType?

    var icon: String {
        switch filter {
        case .text:  return "doc.text"
        case .image: return "photo"
        case .code:  return "chevron.left.forwardslash.chevron.right"
        case .url:   return "link"
        case .email: return "envelope"
        case .json:  return "curlybraces"
        case .color: return "paintpalette"
        case nil:    return "clipboard"
        }
    }

    var message: String {
        if let f = filter {
            return "No \(f.rawValue) items yet"
        }
        return "Clipboard is empty"
    }

    var body: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: icon)
                .font(.system(size: 36, weight: .thin))
                .foregroundStyle(.tertiary)
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.tertiary)
            if filter == nil {
                Text("Copy text or images and they'll appear here automatically.")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.primary.opacity(0.25))
            }
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
