import SwiftUI

enum ListStyle { case list, grid }

struct ClipboardListView: View {
    @EnvironmentObject var store: ClipboardStore
    @State private var listStyle: ListStyle = .list
    @State private var searchExpanded = false
    @FocusState private var searchFocused: Bool
    @State private var localQuery = ""

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Clipboard History")
                    .font(.system(size: 18, weight: .semibold))

                Text("\(store.filteredItems.count) items")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(.secondary.opacity(0.12), in: Capsule())

                Spacer()

                // List/Grid toggle
                HStack(spacing: 2) {
                    styleButton(icon: "list.bullet", style: .list)
                    styleButton(icon: "square.grid.2x2", style: .grid)
                }
                .background(.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 8))

                // Search bar
                searchBar
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)

            // Content
            if store.filteredItems.isEmpty {
                EmptyStateView(filter: store.showFavorites ? nil : store.selectedFilter)
            } else {
                if listStyle == .list {
                    listView
                } else {
                    gridView
                }
            }
        }
    }

    // MARK: - List View

    private var listView: some View {
        ScrollView {
            LazyVStack(spacing: 3) {
                ForEach(store.filteredItems) { item in
                    ClipboardItemRow(item: item)
                        .transition(.asymmetric(
                            insertion: .push(from: .top).combined(with: .opacity),
                            removal: .opacity
                        ))
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 16)
            .animation(.spring(response: 0.3, dampingFraction: 0.85), value: store.filteredItems.map(\.id))
        }
    }

    // MARK: - Grid View

    private var gridView: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 160, maximum: 200), spacing: 10)], spacing: 10) {
                ForEach(store.filteredItems) { item in
                    GridItemCard(item: item)
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 16)
            .animation(.spring(response: 0.3, dampingFraction: 0.85), value: store.filteredItems.map(\.id))
        }
    }

    // MARK: - Style Toggle

    @ViewBuilder
    private func styleButton(icon: String, style: ListStyle) -> some View {
        Button(action: { withAnimation(.spring(response: 0.2)) { listStyle = style } }) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .foregroundStyle(listStyle == style ? Color.accentColor : .secondary)
                .frame(width: 28, height: 28)
                .background(
                    listStyle == style ? Color.accentColor.opacity(0.1) : Color.clear,
                    in: RoundedRectangle(cornerRadius: 6)
                )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 6) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)

            if searchExpanded {
                TextField("Filter history...", text: $localQuery)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .focused($searchFocused)
                    .frame(width: 160)
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .opacity
                    ))
                    .onChange(of: localQuery) { val in
                        store.searchQuery = val
                    }

                if !localQuery.isEmpty {
                    Button(action: { localQuery = ""; store.searchQuery = ""; collapseSearch() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(.tertiary)
                    }
                    .buttonStyle(.plain)
                    .transition(.opacity)
                }
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 8))
        .onTapGesture { expandSearch() }
        .animation(.spring(response: 0.25, dampingFraction: 0.85), value: searchExpanded)
        .onChange(of: searchFocused) { focused in
            if !focused && localQuery.isEmpty { collapseSearch() }
        }
    }

    private func expandSearch() {
        searchExpanded = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { searchFocused = true }
    }

    private func collapseSearch() {
        searchFocused = false
        searchExpanded = false
    }
}

// MARK: - Grid Item Card

struct GridItemCard: View {
    @EnvironmentObject var store: ClipboardStore
    let item: ClipboardItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if item.type == .image, let data = item.imageData, let nsImage = NSImage(data: data) {
                Image(nsImage: nsImage)
                    .resizable()
                    .scaledToFill()
                    .frame(height: 100)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            } else {
                Text(item.content)
                    .font(item.type == .code ? .system(size: 11, design: .monospaced) : .system(size: 12))
                    .foregroundStyle(.primary)
                    .lineLimit(4)
                    .frame(height: 100, alignment: .topLeading)
            }

            HStack {
                TypeBadge(type: item.type)
                Spacer()
                RelativeTimeView(date: item.timestamp)
            }
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.primary.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Color.primary.opacity(0.07), lineWidth: 0.5)
                )
        )
        .onTapGesture {
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
}
