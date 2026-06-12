import SwiftUI

struct ClipboardItemRow: View {
    @EnvironmentObject var store: ClipboardStore
    let item: ClipboardItem
    @State private var isHovering = false

    var body: some View {
        HStack(spacing: 10) {
            // Type badge
            TypeBadge(type: item.type, size: 32)

            // Content
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(item.type.label)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .tracking(0.3)

                    if item.isPinned {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 9))
                            .foregroundColor(.accentColor)
                    }
                    if item.isFavorite {
                        Image(systemName: "star.fill")
                            .font(.system(size: 9))
                            .foregroundColor(.yellow)
                    }

                    Spacer()

                    RelativeTimeView(date: item.timestamp)
                }

                if item.type == .image, let data = item.imageData, let nsImage = NSImage(data: data) {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxHeight: 80)
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color(.separatorColor), lineWidth: 0.5)
                        )
                } else if item.type == .code {
                    Text(item.preview)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(.secondary)
                        .lineLimit(3)
                        .padding(6)
                        .background(Color(.controlBackgroundColor))
                        .cornerRadius(6)
                } else if item.type == .url {
                    Text(item.content)
                        .font(.system(size: 13))
                        .foregroundColor(.accentColor)
                        .lineLimit(1)
                } else {
                    Text(item.preview)
                        .font(.system(size: 13))
                        .foregroundColor(.primary)
                        .lineLimit(2)
                }

                HStack(spacing: 12) {
                    if item.type == .image {
                        Text(item.imageSizeDescription ?? "")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    } else {
                        Text("\(item.charCount) chars")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }
                    if item.useCount > 1 {
                        Text("Used \(item.useCount)×")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                    }
                    if let name = item.sourceAppName {
                        Text(name)
                            .font(.system(size: 10))
                            .foregroundColor(.secondary.opacity(0.7))
                    }
                }
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
                .fill(Color(.controlBackgroundColor).opacity(isHovering ? 0.8 : 0.4))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color(.separatorColor).opacity(0.3), lineWidth: 0.5)
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
                .foregroundColor(destructive ? .red : (active ? .accentColor : .secondary))
                .frame(width: 24, height: 24)
                .background(Color(.controlBackgroundColor))
                .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
}
