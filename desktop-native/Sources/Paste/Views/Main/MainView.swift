import SwiftUI

struct MainView: View {
    @EnvironmentObject var store: ClipboardStore
    @State private var showSettings = false

    var body: some View {
        HStack(spacing: 0) {
            // Sidebar with deeper material
            SidebarView(showSettings: $showSettings)
                .frame(width: 200)
                .background(VisualEffectBackground(material: .sidebar, blendingMode: .behindWindow))

            Divider()

            // Content area
            if showSettings {
                SettingsView(showSettings: $showSettings)
            } else {
                ClipboardListView()
            }
        }
        .background(VisualEffectBackground(material: .windowBackground, blendingMode: .behindWindow))
        .ignoresSafeArea()
    }
}
