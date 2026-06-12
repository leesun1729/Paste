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
                    .padding(.horizontal, 12)
                    .padding(.top, 16)
                    .padding(.bottom, 6)

                FilterRow(label: "All", icon: "list.clipboard", color: .accentColor, filter: nil)
                FilterRow(label: "Favorites", icon: "star.fill", color: .yellow, filter: nil, isFavorite: true)
                FilterRow(label: "Text", icon: "doc.text", color: .blue, filter: .text)
                FilterRow(label: "Code", icon: "chevron.left.forwardslash.chevron.right", color: .green, filter: .code)
                FilterRow(label: "Links", icon: "link", color: .orange, filter: .url)
                FilterRow(label: "Emails", icon: "envelope", color: .pink, filter: .email)
                FilterRow(label: "JSON", icon: "curlybraces", color: .yellow, filter: .json)
                FilterRow(label: "Images", icon: "photo", color: .purple, filter: .image)
            }
            .padding(.horizontal, 6)

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
    func FilterRow(label: String, icon: String, color: Color, filter: ClipboardType?, isFavorite: Bool = false) -> some View {
        let isActive: Bool = {
            if isFavorite { return false }
            return store.selectedFilter == filter && !showSettings
        }()

        Button(action: {
            showSettings = false
            store.selectedFilter = filter
        }) {
            Label(label, systemImage: icon)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(isActive ? Color.accentColor : .primary)
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    isActive ? Color.accentColor.opacity(0.12) : Color.clear,
                    in: RoundedRectangle(cornerRadius: 7)
                )
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 6)
    }
}
