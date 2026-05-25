// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Paste",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "Paste",
            path: "Sources/Paste"
        ),
    ]
)
