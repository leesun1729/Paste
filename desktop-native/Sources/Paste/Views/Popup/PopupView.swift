import SwiftUI

struct PopupView: View {
    @EnvironmentObject var store: ClipboardStore
    @State private var query: String = ""
    @FocusState private var searchFocused: Bool
    @State private var selectedIndex: Int = 0

    var filteredItems: [ClipboardItem] {
        store.items
            .filter { query.isEmpty || $0.content.localizedCaseInsensitiveContains(query) || $0.preview.localizedCaseInsensitiveContains(query) }
            .sorted { a, b in
                if a.isPinned != b.isPinned { return a.isPinned }
                return a.timestamp > b.timestamp
            }
    }

    var body: some View {
        ZStack {
            VisualEffectBackground(material: .menu, blendingMode: .behindWindow)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(spacing: 0) {
                // Search
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                    TextField("Search clipboard...", text: $query)
                        .textFieldStyle(.plain)
                        .font(.system(size: 15, weight: .medium))
                        .focused($searchFocused)
                        .onChange(of: query) { _ in selectedIndex = 0 }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

                Divider().opacity(0.3)

                // List
                if filteredItems.isEmpty {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "doc.on.clipboard")
                            .font(.system(size: 28))
                            .foregroundColor(.secondary.opacity(0.4))
                        Text(store.items.isEmpty ? "No content copied yet" : "No matches")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 2) {
                                ForEach(Array(filteredItems.enumerated()), id: \.element.id) { index, item in
                                    PopupItemRow(item: item, isSelected: index == selectedIndex)
                                        .id(item.id)
                                        .onTapGesture {
                                            store.incrementUse(item)
                                            pasteItem(item)
                                        }
                                }
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                        }
                        .onChange(of: selectedIndex) { idx in
                            if idx < filteredItems.count {
                                withAnimation(.easeOut(duration: 0.15)) {
                                    proxy.scrollTo(filteredItems[idx].id, anchor: .center)
                                }
                            }
                        }
                    }
                }

                Divider().opacity(0.3)

                // Footer
                HStack(spacing: 16) {
                    HintBadge(key: "↑↓", label: "Navigate")
                    HintBadge(key: "↵", label: "Paste")
                    HintBadge(key: "esc", label: "Close")
                    Spacer()
                    Text("\(store.items.count) items")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary.opacity(0.6))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
            }
        }
        .onAppear {
            query = ""
            selectedIndex = 0
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                searchFocused = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .init("paste:quickpaste-focus"))) { _ in
            query = ""
            selectedIndex = 0
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                searchFocused = true
            }
        }
    }

    func pasteItem(_ item: ClipboardItem) {
        // This is called from the popup; the actual paste is handled by PopupWindowController
        NotificationCenter.default.post(name: .init("paste:item-selected"), object: item)
    }

    @ViewBuilder
    func HintBadge(key: String, label: String) -> some View {
        HStack(spacing: 4) {
            Text(key)
                .font(.system(size: 10, design: .monospaced))
                .fontWeight(.semibold)
                .padding(.horizontal, 5)
                .padding(.vertical, 3)
                .background(Color(.controlBackgroundColor))
                .cornerRadius(4)
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color(.separatorColor).opacity(0.3), lineWidth: 0.5))
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
        }
    }
}
