import SwiftUI

struct TypeBadge: View {
    let type: ClipboardType
    var size: CGFloat = 28

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.25)
                .fill(Color(type.color).opacity(0.15))
            Image(systemName: iconName)
                .font(.system(size: size * 0.45, weight: .medium))
                .foregroundColor(Color(type.color))
        }
        .frame(width: size, height: size)
    }

    private var iconName: String {
        switch type {
        case .text: return "doc.text"
        case .code: return "chevron.left.forwardslash.chevron.right"
        case .url: return "link"
        case .email: return "envelope"
        case .json: return "curlybraces"
        case .color: return "paintpalette"
        case .image: return "photo"
        }
    }
}
