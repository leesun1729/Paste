// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Paste",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "Paste",
            path: "Sources/Paste",
            resources: [
                .copy("Resources/AppIcon.icns"),
                .copy("Resources/AppIcon.png"),
                .copy("Resources/StatusBarIcon.png"),
            ]
        ),
    ]
)
