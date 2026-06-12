import SwiftUI
import Combine

class ClipboardStore: ObservableObject {
    @Published var items: [ClipboardItem] = []
    @Published var searchQuery: String = ""
    @Published var selectedFilter: ClipboardType? = nil
    @Published var showFavorites: Bool = false
    @Published var selectedItemID: UUID?

    @AppStorage("retentionDays") var retentionDays: Int = 30
    @AppStorage("maxItems") var maxItems: Int = 1000
    @AppStorage("darkMode") var darkMode: Bool = false
    @AppStorage("launchAtLogin") var launchAtLogin: Bool = true
    @AppStorage("hotkey") var hotkey: String = "command+shift+v"

    private let storageKey = "paste-clipboard-items"

    var filteredItems: [ClipboardItem] {
        items
            .filter { selectedFilter == nil || $0.type == selectedFilter }
            .filter { !showFavorites || $0.isFavorite }
            .filter {
                searchQuery.isEmpty ||
                $0.content.localizedCaseInsensitiveContains(searchQuery) ||
                $0.preview.localizedCaseInsensitiveContains(searchQuery)
            }
            .sorted { a, b in
                if a.isPinned != b.isPinned { return a.isPinned }
                return a.timestamp > b.timestamp
            }
    }

    func add(_ item: ClipboardItem) {
        // Dedup by content hash
        if let existing = items.first(where: { $0.content == item.content && $0.type == item.type }) {
            if let idx = items.firstIndex(of: existing) {
                items[idx].timestamp = Date()
                items[idx].useCount += 1
                // Move to top
                let updated = items.remove(at: idx)
                items.insert(updated, at: 0)
            }
        } else {
            items.insert(item, at: 0)
            if items.count > maxItems {
                items = Array(items.prefix(maxItems))
            }
        }
        persist()
    }

    func delete(_ item: ClipboardItem) {
        items.removeAll { $0.id == item.id }
        persist()
    }

    func togglePin(_ item: ClipboardItem) {
        if let i = items.firstIndex(of: item) {
            items[i].isPinned.toggle()
            persist()
        }
    }

    func toggleFavorite(_ item: ClipboardItem) {
        if let i = items.firstIndex(of: item) {
            items[i].isFavorite.toggle()
            persist()
        }
    }

    func incrementUse(_ item: ClipboardItem) {
        if let i = items.firstIndex(of: item) {
            items[i].useCount += 1
            items[i].timestamp = Date()
            persist()
        }
    }

    func applyRetentionPolicy() {
        guard retentionDays > 0 else { return }
        let cutoff = Date().addingTimeInterval(-Double(retentionDays) * 86400)
        items.removeAll { !$0.isPinned && !$0.isFavorite && $0.timestamp < cutoff }
        persist()
    }

    // MARK: - Persistence

    func persist() {
        guard let data = try? JSONEncoder().encode(items) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    func load() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let loaded = try? JSONDecoder().decode([ClipboardItem].self, from: data) else { return }
        items = loaded
    }
}
