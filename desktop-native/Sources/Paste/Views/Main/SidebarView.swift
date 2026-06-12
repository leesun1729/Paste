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
                Text("Filters")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)
                    .tracking(0.5)
                    .padding(.horizontal, 12)
                    .padding(.bottom, 6)

                FilterButton(label: "All", icon: "list.clipboard", color: .accentColor, filter: nil)
                FilterButton(label: "Favorites", icon: "star.fill", color: .yellow, filter: nil, isFavorite: true)
                FilterButton(label: "Text", icon: "doc.text", color: Color(.systemIndigo), filter: .text)
                FilterButton(label: "Code", icon: "chevron.left.forwardslash.chevron.right", color: .green, filter: .code)
                FilterButton(label: "Links", icon: "link", color: .blue, filter: .url)
                FilterButton(label: "Emails", icon: "envelope", color: .purple, filter: .email)
                FilterButton(label: "JSON", icon: "curlybraces", color: .teal, filter: .json)
                FilterButton(label: "Images", icon: "photo", color: .pink, filter: .image)
            }
            .padding(.horizontal, 6)

            Spacer()

            // Settings
            Divider()
            Button(action: { showSettings.toggle() }) {
                HStack(spacing: 8) {
                    Image(systemName: "gear")
                        .font(.system(size: 13))
                        .frame(width: 20)
                    Text("Settings")
                        .font(.system(size: 13))
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundColor(showSettings ? .accentColor : .secondary)
            .background(showSettings ? Color.accentColor.opacity(0.1) : Color.clear)
            .cornerRadius(6)
            .padding(.horizontal, 6)
            .padding(.bottom, 12)
        }
    }

    @ViewBuilder
    func FilterButton(label: String, icon: String, color: Color, filter: ClipboardType?, isFavorite: Bool = false) -> some View {
        let isActive: Bool = {
            if isFavorite { return store.selectedFilter == nil && showSettings == false && false } // TODO
            return store.selectedFilter == filter && !showSettings
        }()

        Button(action: {
            showSettings = false
            store.selectedFilter = filter
        }) {
            HStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(isActive ? Color.accentColor : Color(.controlBackgroundColor))
                    Image(systemName: icon)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(isActive ? .white : color)
                }
                .frame(width: 20, height: 20)

                Text(label)
                    .font(.system(size: 13))
                Spacer()
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .foregroundColor(isActive ? .accentColor : .secondary)
        .background(isActive ? Color.accentColor.opacity(0.1) : Color.clear)
        .cornerRadius(6)
    }
}
