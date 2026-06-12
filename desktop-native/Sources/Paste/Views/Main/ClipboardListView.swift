import SwiftUI

struct ClipboardListView: View {
    @EnvironmentObject var store: ClipboardStore

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Clipboard History")
                    .font(.system(size: 16, weight: .semibold))

                Text("\(store.filteredItems.count) items")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.controlBackgroundColor))
                    .cornerRadius(6)

                Spacer()

                // Search
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    TextField("Filter history...", text: $store.searchQuery)
                        .textFieldStyle(.plain)
                        .font(.system(size: 13))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color(.controlBackgroundColor))
                .cornerRadius(8)
                .frame(maxWidth: 280)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)

            // List
            if store.filteredItems.isEmpty {
                Spacer()
                VStack(spacing: 12) {
                    Image(systemName: "doc.on.clipboard")
                        .font(.system(size: 40))
                        .foregroundColor(.secondary.opacity(0.4))
                    Text(store.items.isEmpty ? "Clipboard is empty" : "No matches")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.secondary)
                    if store.items.isEmpty {
                        Text("Copy anything on your Mac. It appears here instantly.")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary.opacity(0.7))
                    }
                }
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: 4) {
                        ForEach(store.filteredItems) { item in
                            ClipboardItemRow(item: item)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 20)
                }
            }
        }
    }
}
