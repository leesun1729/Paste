import SwiftUI

struct SidebarView: View {
    @EnvironmentObject var store: ClipboardStore
    @Binding var showSettings: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Logo
            HStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.accentColor)
                    Image(systemName: "list.clipboard")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white)
                }
                .frame(width: 24, height: 24)

                Text("Paste")
                    .font(.system(size: 13, weight: .semibold))
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)
            .padding(.bottom, 8)

            // Filters
            VStack(alignment: .leading, spacing: 2) {
                Text("FILTERS")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.tertiary)
                    .kerning(1.2)
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 4)

                FilterRow(label: "All", icon: "list.clipboard", color: .accentColor, filter: nil,
                          count: store.items.count)
                FilterRow(label: "Favorites", icon: "star.fill", color: .yellow, filter: nil, isFavorite: true,
                          count: store.items.filter { $0.isFavorite }.count)
                FilterRow(label: "Text", icon: "doc.text", color: .blue, filter: .text,
                          count: store.items.filter { $0.type == .text }.count)
                FilterRow(label: "Code", icon: "chevron.left.forwardslash.chevron.right", color: .green, filter: .code,
                          count: store.items.filter { $0.type == .code }.count)
                FilterRow(label: "Links", icon: "link", color: .orange, filter: .url,
                          count: store.items.filter { $0.type == .url }.count)
                FilterRow(label: "Emails", icon: "envelope", color: .pink, filter: .email,
                          count: store.items.filter { $0.type == .email }.count)
                FilterRow(label: "JSON", icon: "curlybraces", color: .yellow, filter: .json,
                          count: store.items.filter { $0.type == .json }.count)
                FilterRow(label: "Images", icon: "photo", color: .purple, filter: .image,
                          count: store.items.filter { $0.type == .image }.count)
            }

            Spacer()

            // Settings
            Divider()
            Button(action: { showSettings.toggle() }) {
                Label("Settings", systemImage: "gear")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(showSettings ? Color.accentColor : .primary)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        showSettings ? Color.accentColor.opacity(0.12) : Color.clear,
                        in: RoundedRectangle(cornerRadius: 7)
                    )
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 6)
            .padding(.bottom, 12)
        }
    }

    @ViewBuilder
    func FilterRow(label: String, icon: String, color: Color, filter: ClipboardType?,
                   isFavorite: Bool = false, count: Int = 0) -> some View {
        let isActive: Bool = {
            if showSettings { return false }
            if isFavorite { return store.showFavorites }
            return store.selectedFilter == filter && !store.showFavorites
        }()

        Button(action: {
            showSettings = false
            if isFavorite {
                store.showFavorites = true
                store.selectedFilter = nil
            } else {
                store.showFavorites = false
                store.selectedFilter = filter
            }
        }) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .foregroundStyle(isActive ? Color.accentColor : .secondary)
                    .frame(width: 18)

                Text(label)
                    .font(.system(size: 13, weight: isActive ? .medium : .regular))
                    .foregroundStyle(isActive ? Color.accentColor : .primary)

                Spacer()

                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                isActive ? Color.accentColor.opacity(0.12) : Color.clear,
                in: RoundedRectangle(cornerRadius: 7)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 6)
    }
}
