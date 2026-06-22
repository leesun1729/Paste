import SwiftUI
import ServiceManagement

struct SettingsView: View {
    @EnvironmentObject var store: ClipboardStore
    @Binding var showSettings: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Header with back button
            HStack {
                Button(action: { showSettings = false }) {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 12, weight: .medium))
                        Text("Back")
                            .font(.system(size: 13))
                    }
                    .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)

                Text("Settings")
                    .font(.system(size: 16, weight: .semibold))
                    .padding(.leading, 8)

                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)

            Divider()

            ScrollView {
                VStack(spacing: 20) {
                    // General
                    SettingsSection(title: "General") {
                        SettingsToggle(title: "Launch at Login", description: "Start Paste automatically when you log in.", isOn: $store.launchAtLogin)
                            .onChange(of: store.launchAtLogin) { enabled in
                                if #available(macOS 13, *) {
                                    if enabled { try? SMAppService.mainApp.register() }
                                    else { try? SMAppService.mainApp.unregister() }
                                }
                            }

                        SettingsToggle(title: "Dark Mode", description: "Use dark appearance.", isOn: $store.darkMode)
                            .onChange(of: store.darkMode) { dark in
                                NSApp.appearance = dark ? NSAppearance(named: .darkAqua) : NSAppearance(named: .aqua)
                            }
                    }

                    // Data
                    SettingsSection(title: "Data") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Data Retention")
                                .font(.system(size: 13, weight: .medium))
                            Text("Items older than this period will be automatically removed.")
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)

                            HStack(spacing: 6) {
                                ForEach([7, 14, 30, 90], id: \.self) { days in
                                    RetentionButton(label: "\(days) days", days: days)
                                }
                                RetentionButton(label: "Forever", days: Int.max)
                            }
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Max Items")
                                .font(.system(size: 13, weight: .medium))
                            Text("Maximum number of clipboard records to keep.")
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)

                            HStack(spacing: 6) {
                                ForEach([500, 1000, 2000, 5000], id: \.self) { max in
                                    MaxItemsButton(value: max)
                                }
                            }
                        }

                        Button("Clean Expired Data", role: .destructive) {
                            store.applyRetentionPolicy()
                        }
                        .font(.system(size: 12))
                    }

                    // Danger Zone
                    SettingsSection(title: "Danger Zone") {
                        VStack(alignment: .leading, spacing: 12) {
                            Button("Clear All Data", role: .destructive) {
                                store.items = []
                                store.persist()
                            }
                            .font(.system(size: 12))

                            Button("Uninstall Paste") {
                                uninstallApp()
                            }
                            .font(.system(size: 12))
                            .foregroundColor(.red)
                        }
                    }

                    // Quit
                    VStack(spacing: 8) {
                        Button(action: { NSApp.terminate(nil) }) {
                            Text("Quit Paste")
                                .font(.system(size: 13, weight: .medium))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(Color.red)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                        .buttonStyle(.plain)

                        Text("Close the application completely.")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 8)
                }
                .padding(20)
            }
        }
        .background(VisualEffectBackground(material: .sidebar, blendingMode: .behindWindow))
    }

    @ViewBuilder
    func SettingsSection(title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.secondary)
                .textCase(.uppercase)
                .tracking(0.5)
            content()
        }
        .padding(16)
        .background(Color(.controlBackgroundColor).opacity(0.5))
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(.separatorColor).opacity(0.3), lineWidth: 0.5))
    }

    @ViewBuilder
    func SettingsToggle(title: String, description: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                Text(description)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
        .toggleStyle(.switch)
    }

    @ViewBuilder
    func RetentionButton(label: String, days: Int) -> some View {
        Button(action: { store.retentionDays = days }) {
            Text(label)
                .font(.system(size: 12))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(store.retentionDays == days ? Color.accentColor : Color(.controlBackgroundColor))
                .foregroundColor(store.retentionDays == days ? .white : .secondary)
                .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }

    func uninstallApp() {
        let alert = NSAlert()
        alert.messageText = "Uninstall Paste"
        alert.informativeText = "This will clear all data and move Paste to Trash. You can reinstall later."
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Uninstall")
        alert.addButton(withTitle: "Cancel")

        if alert.runModal() == .alertFirstButtonReturn {
            // Clear all data
            let bundleID = Bundle.main.bundleIdentifier ?? "com.paste.clipboard"
            UserDefaults.standard.removePersistentDomain(forName: bundleID)
            UserDefaults.standard.synchronize()

            // Move to Trash
            let appPath = Bundle.main.bundleURL
            NSWorkspace.shared.recycle(appURLs: [appPath]) { _, _ in
                DispatchQueue.main.async { NSApp.terminate(nil) }
            }
        }
    }

    @ViewBuilder
    func MaxItemsButton(value: Int) -> some View {
        Button(action: { store.maxItems = value }) {
            Text("\(value)")
                .font(.system(size: 12))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(store.maxItems == value ? Color.accentColor : Color(.controlBackgroundColor))
                .foregroundColor(store.maxItems == value ? .white : .secondary)
                .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
}
