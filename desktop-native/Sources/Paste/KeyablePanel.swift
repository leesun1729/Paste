import AppKit

/// Borderless panel that can become key window (accepts keyboard input)
final class KeyablePanel: NSPanel {
    override var canBecomeKey: Bool { true }
}
