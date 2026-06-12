import SwiftUI

struct MainView: View {
    @EnvironmentObject var store: ClipboardStore
    @State private var showSettings = false

    var body: some View {
        HStack(spacing: 0) {
            SidebarView(showSettings: $showSettings)
                .frame(width: 200)

            Divider()

            if showSettings {
                SettingsView(showSettings: $showSettings)
            } else {
                ClipboardListView()
            }
        }
        .background(VisualEffectBackground(material: .sidebar, blendingMode: .behindWindow))
        .ignoresSafeArea()
    }
}
