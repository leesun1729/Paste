import SwiftUI

struct ClipboardItemRow: View {
    @EnvironmentObject var store: ClipboardStore
    let item: ClipboardItem
    @State private var isHovering = false

    private var isSelected: Bool { store.selectedItemID == item.id }

    var body: some View {
        HStack(spacing: 10) {
            // Type icon — no background, just the icon
            Image(systemName: item.type.iconName)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Color(item.type.color).opacity(0.7))
                .frame(width: 32, height: 32)

            // Content
            VStack(alignment: .leading, spacing: 4) {
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
                    } else {
                        Text("\(item.charCount) chars")
                    }
                    if let name = item.sourceAppName {
                        Text(name)
                    }
                    if item.useCount > 1 {
                        Text("Used \(item.useCount)×")
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
                .foregroundStyle(.tertiary)
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
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isSelected ? Color.accentColor.opacity(0.1) : Color.primary.opacity(0.04))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(
                    isSelected ? Color.accentColor.opacity(0.3) : Color.primary.opacity(0.08),
                    lineWidth: 0.5
                )
        )
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

// MARK: - Content Preview

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
                        .strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.5)
                )
        } else if item.type == .code {
            Text(item.preview)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.secondary)
                .lineLimit(2)
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
