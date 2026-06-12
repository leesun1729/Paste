import SwiftUI

struct TypeBadge: View {
    let type: ClipboardType

    var color: Color {
        switch type {
        case .text:  return .blue
        case .image: return .purple
        case .code:  return .green
        case .url:   return .orange
        case .email: return .pink
        case .json:  return .yellow
        case .color: return .teal
        }
    }

    var body: some View {
        Text(type.rawValue.uppercased())
            .font(.system(size: 9, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.12), in: Capsule())
    }
}
