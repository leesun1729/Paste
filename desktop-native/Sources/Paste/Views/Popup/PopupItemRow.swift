import SwiftUI

struct PopupItemRow: View {
    let item: ClipboardItem
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 10) {
            // Type icon
            Image(systemName: iconName)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(isSelected ? Color.accentColor : Color(item.type.color).opacity(0.7))
                .frame(width: 28, height: 28)

            // Content
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(item.type.rawValue.uppercased())
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(isSelected ? Color.accentColor : Color(item.type.color))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(
                            (isSelected ? Color.accentColor.opacity(0.12) : Color(item.type.color).opacity(0.12)),
                            in: Capsule()
                        )

                    if item.isPinned {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 8))
                            .foregroundStyle(.orange)
                    }
                    if item.isFavorite {
                        Image(systemName: "star.fill")
                            .font(.system(size: 8))
                            .foregroundStyle(.yellow)
                    }

                    Spacer()

                    RelativeTimeView(date: item.timestamp)
                        .foregroundStyle(.secondary)
                }

                if item.type == .image, let data = item.imageData, let nsImage = NSImage(data: data) {
                    Image(nsImage: nsImage)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.5)
                        )
                } else {
                    Text(item.preview)
                        .font(.system(size: 13))
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                }

                // Metadata
                HStack(spacing: 8) {
                    if item.type == .image {
                        Text(item.imageSizeDescription ?? "")
                    } else {
                        Text("\(item.charCount) chars")
                    }
                    if let name = item.sourceAppName {
                        Text(name)
                    }
                }
                .font(.system(size: 10))
                .foregroundStyle(.secondary.opacity(0.6))
            }

            if isSelected {
                Text("↵")
                    .font(.system(size: 10, weight: .semibold))
                    .padding(.horizontal, 5)
                    .padding(.vertical, 3)
                    .background(Color.accentColor.opacity(0.12))
                    .cornerRadius(4)
                    .foregroundStyle(Color.accentColor)
            }
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isSelected ? Color.accentColor.opacity(0.08) : Color.clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(
                    isSelected ? Color.accentColor.opacity(0.2) : Color.clear,
                    lineWidth: 0.5
                )
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
