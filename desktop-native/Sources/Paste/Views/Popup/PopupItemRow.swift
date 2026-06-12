import SwiftUI

struct PopupItemRow: View {
    let item: ClipboardItem
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 10) {
            // Type icon
            ZStack {
                RoundedRectangle(cornerRadius: 6)
                    .fill(isSelected ? Color.white.opacity(0.2) : Color(item.type.color).opacity(0.12))
                Image(systemName: iconName)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(isSelected ? .white : Color(item.type.color))
            }
            .frame(width: 28, height: 28)

            // Content
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(item.type.label)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(isSelected ? .white.opacity(0.7) : .secondary)
                        .textCase(.uppercase)
                        .tracking(0.3)

                    if item.isPinned {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 8))
                            .foregroundColor(isSelected ? .white.opacity(0.7) : .accentColor)
                    }
                    if item.isFavorite {
                        Image(systemName: "star.fill")
                            .font(.system(size: 8))
                            .foregroundColor(.yellow)
                    }

                    Spacer()

                    RelativeTimeView(date: item.timestamp)
                        .foregroundColor(isSelected ? .white.opacity(0.5) : .secondary)
                }

                if item.type == .image, let data = item.imageData, let nsImage = NSImage(data: data) {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxHeight: 60)
                        .cornerRadius(6)
                } else {
                    Text(item.preview)
                        .font(.system(size: 13))
                        .foregroundColor(isSelected ? .white : .primary)
                        .lineLimit(2)
                }
            }

            if isSelected {
                Text("↵")
                    .font(.system(size: 10, weight: .semibold))
                    .padding(.horizontal, 5)
                    .padding(.vertical, 3)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(4)
                    .foregroundColor(.white)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isSelected ? Color.accentColor : Color.clear)
        )
        .contentShape(Rectangle())
    }

    private var iconName: String {
        switch item.type {
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
