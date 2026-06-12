import SwiftUI

struct ClipboardItemRow: View {
    @EnvironmentObject var store: ClipboardStore
    let item: ClipboardItem
    @State private var isHovered = false
    @State private var isPressed = false

    private var isSelected: Bool { store.selectedItemID == item.id }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // Card content
            cardContent
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
                .scaleEffect(isPressed ? 0.98 : 1.0)
                .animation(.spring(response: 0.15, dampingFraction: 0.7), value: isPressed)

            // Pin/favorite badge — top right corner
            if item.isPinned || item.isFavorite {
                HStack(spacing: 4) {
                    if item.isFavorite {
                        Image(systemName: "star.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(.yellow)
                    }
                    if item.isPinned {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(.orange)
                    }
                }
                .padding(8)
            }

            // Hover action buttons — top right, appear on hover
            if isHovered {
                HStack(spacing: 4) {
                    SmallActionBtn(icon: "doc.on.doc") { copyItem() }
                    SmallActionBtn(icon: item.isFavorite ? "star.fill" : "star") { store.toggleFavorite(item) }
                    SmallActionBtn(icon: item.isPinned ? "pin.fill" : "pin") { store.togglePin(item) }
                    SmallActionBtn(icon: "trash", destructive: true) { store.delete(item) }
                }
                .padding(6)
                .transition(.opacity)
            }
        }
        .onHover { isHovered = $0 }
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
        .onTapGesture { copyItem() }
        .contextMenu {
            Button("Copy") { copyItem() }
            Button(item.isPinned ? "Unpin" : "Pin") { store.togglePin(item) }
            Button(item.isFavorite ? "Unfavorite" : "Favorite") { store.toggleFavorite(item) }
            Divider()
            Button("Delete", role: .destructive) { store.delete(item) }
        }
    }

    // MARK: - Card Content

    private var cardContent: some View {
        HStack(spacing: 10) {
            // Type icon
            Image(systemName: item.type.iconName)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Color(item.type.color).opacity(0.7))
                .frame(width: 32, height: 32)

            // Content
            VStack(alignment: .leading, spacing: 4) {
                // Row 1: type badge + time (hidden on hover to avoid overlap with action buttons)
                HStack {
                    TypeBadge(type: item.type)
                    Spacer()
                    if !isHovered {
                        RelativeTimeView(date: item.timestamp)
                            .transition(.opacity)
                    }
                }

                // Row 2: content preview
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

                // Row 3: metadata
                HStack(spacing: 8) {
                    if item.type == .image {
                        Text(item.imageSizeDescription ?? "")
                    } else {
                        Text("\(item.charCount) chars")
                    }
                    if let name = item.sourceAppName { Text(name) }
                    if item.useCount > 1 { Text("Used \(item.useCount)×") }
                }
                .font(.system(size: 11))
                .foregroundStyle(.tertiary)
            }
        }
        .padding(12)
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
}

// MARK: - Small Action Button (inline hover)

struct SmallActionBtn: View {
    let icon: String
    var destructive: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(destructive ? .red : .secondary)
                .frame(width: 22, height: 22)
                .background(.ultraThinMaterial)
                .cornerRadius(5)
        }
        .buttonStyle(.plain)
    }
}
