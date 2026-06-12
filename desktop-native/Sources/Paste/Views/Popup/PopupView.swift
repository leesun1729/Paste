import SwiftUI

struct PopupView: View {
    @EnvironmentObject var store: ClipboardStore
    @FocusState private var searchFocused: Bool

    var filteredItems: [ClipboardItem] {
        store.popupFilteredItems
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
                    TextField("Search clipboard...", text: $store.popupQuery)
                        .textFieldStyle(.plain)
                        .font(.system(size: 15, weight: .medium))
                        .focused($searchFocused)
                        .onChange(of: store.popupQuery) { _ in store.popupSelectedIndex = 0 }
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
                                    PopupItemRow(item: item, isSelected: index == store.popupSelectedIndex)
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
                        .onChange(of: store.popupSelectedIndex) { idx in
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
            store.popupQuery = ""
            store.popupSelectedIndex = 0
        }
        .onReceive(NotificationCenter.default.publisher(for: .init("paste:quickpaste-focus"))) { _ in
            store.popupQuery = ""
            store.popupSelectedIndex = 0
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                searchFocused = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .popupKeyEvent)) { notification in
            guard let userInfo = notification.userInfo else { return }
            let keyCode = userInfo["keyCode"] as? Int ?? 0

            switch keyCode {
            case 126: // Arrow Up
                store.popupSelectedIndex = max(0, store.popupSelectedIndex - 1)
            case 125: // Arrow Down
                store.popupSelectedIndex = min(filteredItems.count - 1, store.popupSelectedIndex + 1)
            case 36: // Enter
                if store.popupSelectedIndex < filteredItems.count {
                    let item = filteredItems[store.popupSelectedIndex]
                    store.incrementUse(item)
                    pasteItem(item)
                }
            case 53: // Escape
                NotificationCenter.default.post(name: .init("popup:dismiss"), object: nil)
            default:
                break
            }
        }
    }

    func pasteItem(_ item: ClipboardItem) {
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
