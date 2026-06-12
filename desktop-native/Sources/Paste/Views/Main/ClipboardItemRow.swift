import SwiftUI

struct ClipboardItemRow: View {
    @EnvironmentObject var store: ClipboardStore
    let item: ClipboardItem
    @State private var isHovering = false

    var body: some View {
        HStack(spacing: 12) {
            // Type badge icon
            TypeBadgeIcon(type: item.type, size: 32)

            // Content
            VStack(alignment: .leading, spacing: 6) {
                // Row 1: type badge + time
                HStack {
                    TypeBadge(type: item.type)
                    Spacer()
                    RelativeTimeView(date: item.timestamp)
                }

                // Row 2: content preview
                ContentPreview(item: item)

                // Row 3: metadata
                HStack(spacing: 8) {
                    if item.type == .image {
                        Text(item.imageSizeDescription ?? "")
                            .foregroundStyle(.tertiary)
                    } else {
                        Text("\(item.charCount) chars")
                            .foregroundStyle(.tertiary)
                    }
                    if let name = item.sourceAppName {
                        Text(name)
                            .foregroundStyle(.tertiary)
                    }
                    if item.useCount > 1 {
                        Text("Used \(item.useCount)×")
                            .foregroundStyle(.tertiary)
                    }
                    if item.isPinned {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(.orange)
                    }
                    if item.isFavorite {
                        Image(systemName: "star.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(.yellow)
                    }
                }
                .font(.system(size: 11))
            }

            // Hover actions
            if isHovering {
                HStack(spacing: 4) {
                    ActionButton(icon: item.isFavorite ? "star.fill" : "star", active: item.isFavorite) {
                        store.toggleFavorite(item)
                    }
                    ActionButton(icon: item.isPinned ? "pin.fill" : "pin", active: item.isPinned) {
                        store.togglePin(item)
                    }
                    ActionButton(icon: "doc.on.doc") {
                        copyItem()
                    }
                    ActionButton(icon: "trash", destructive: true) {
                        store.delete(item)
                    }
                }
                .transition(.opacity)
            }
        }
        .padding(14)
        .background(
            Group {
                if isSelected {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.accentColor.opacity(0.15))
                } else {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(.ultraThinMaterial)
                }
            }
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(
                    isSelected ? Color.accentColor.opacity(0.4) : Color.primary.opacity(0.06),
                    lineWidth: 1
                )
        )
        .shadow(color: .black.opacity(0.04), radius: 4, x: 0, y: 2)
        .onHover { isHovering = $0 }
        .onTapGesture { copyItem() }
        .contextMenu {
            Button("Copy") { copyItem() }
            Button(item.isPinned ? "Unpin" : "Pin") { store.togglePin(item) }
            Button(item.isFavorite ? "Unfavorite" : "Favorite") { store.toggleFavorite(item) }
            Divider()
            Button("Delete", role: .destructive) { store.delete(item) }
        }
    }

    private var isSelected: Bool {
        store.selectedItemID == item.id
    }

    private func copyItem() {
        let pb = NSPasteboard.general
        pb.clearContents()
        if let data = item.imageData, let image = NSImage(data: data) {
            pb.writeObjects([image])
        } else {
            pb.setString(item.content, forType: .string)
        }
        store.incrementUse(item)
    }

    @ViewBuilder
    func ActionButton(icon: String, active: Bool = false, destructive: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(destructive ? .red : (active ? .accentColor : .secondary))
                .frame(width: 24, height: 24)
                .background(.ultraThinMaterial)
                .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Content Preview (extracted to help compiler type-check)

struct ContentPreview: View {
    let item: ClipboardItem

    var body: some View {
        if item.type == .image, let data = item.imageData, let nsImage = NSImage(data: data) {
            Image(nsImage: nsImage)
                .resizable()
                .scaledToFill()
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                )
        } else if item.type == .code {
            Text(item.preview)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(.secondary)
                .lineLimit(3)
                .padding(8)
                .background(Color(.controlBackgroundColor).opacity(0.6))
                .cornerRadius(8)
        } else if item.type == .url {
            Text(item.content)
                .font(.system(size: 13))
                .foregroundStyle(.blue)
                .lineLimit(1)
        } else {
            Text(item.preview)
                .font(.system(size: 13))
                .foregroundStyle(.primary)
                .lineLimit(2)
        }
    }
}

// MARK: - Type Badge Icon (circle with icon)

struct TypeBadgeIcon: View {
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
