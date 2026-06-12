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
            Group {
                if item.type == .image {
                    imageCard
                } else {
                    textCard
                }
            }
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
        }
        .overlay(alignment: .trailing) {
            // Hover action buttons — slide in from right
            if isHovered {
                HStack(spacing: 6) {
                    ActionButton(icon: "doc.on.doc", tint: .blue) { copyItem() }
                    ActionButton(icon: item.isFavorite ? "star.fill" : "star", tint: .yellow) {
                        store.toggleFavorite(item)
                    }
                    ActionButton(icon: "trash", tint: .red) { store.delete(item) }
                }
                .padding(.trailing, 12)
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .opacity
                ))
            }
        }
        .padding(.trailing, isHovered ? 110 : 0)
        .animation(.spring(response: 0.2, dampingFraction: 0.8), value: isHovered)
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

    // MARK: - Image Card (wide preview)

    private var imageCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                TypeBadge(type: .image)
                Spacer()
                RelativeTimeView(date: item.timestamp)
            }

            if let data = item.imageData, let nsImage = NSImage(data: data) {
                Image(nsImage: nsImage)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity)
                    .frame(height: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .strokeBorder(Color.primary.opacity(0.06), lineWidth: 0.5)
                    )
            }

            HStack(spacing: 8) {
                Text(item.imageSizeDescription ?? "")
                if let app = item.sourceAppName { Text(app) }
                if item.useCount > 1 { Text("Used \(item.useCount)×") }
            }
            .font(.system(size: 11))
            .foregroundStyle(.tertiary)
        }
        .padding(14)
    }

    // MARK: - Text Card (with color bar)

    private var textCard: some View {
        HStack(spacing: 0) {
            // Left color bar
            RoundedRectangle(cornerRadius: 2)
                .fill(Color(item.type.color).opacity(0.6))
                .frame(width: 3)
                .padding(.vertical, 10)
                .padding(.leading, 12)
                .padding(.trailing, 10)

            // Content
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    TypeBadge(type: item.type)
                    Spacer()
                    RelativeTimeView(date: item.timestamp)
                }

                if item.type == .code {
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

                HStack(spacing: 8) {
                    Text("\(item.charCount) chars")
                    if let name = item.sourceAppName { Text(name) }
                    if item.useCount > 1 { Text("Used \(item.useCount)×") }
                }
                .font(.system(size: 11))
                .foregroundStyle(.tertiary)
            }
            .padding(.vertical, 12)
            .padding(.trailing, 14)
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
}

// MARK: - Action Button

struct ActionButton: View {
    let icon: String
    let tint: Color
    let action: () -> Void
    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(tint)
                .frame(width: 28, height: 28)
                .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 7))
                .overlay(
                    RoundedRectangle(cornerRadius: 7)
                        .strokeBorder(tint.opacity(0.15), lineWidth: 0.5)
                )
        }
        .buttonStyle(.plain)
        .scaleEffect(isPressed ? 0.92 : 1.0)
        .animation(.spring(response: 0.15), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}
