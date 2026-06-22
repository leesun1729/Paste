#!/bin/bash
set -e

APP_NAME="Paste"
BUNDLE_ID="com.paste.clipboard"
VERSION="1.2.0"
BUILD_DIR="desktop-native/.build/release"
APP_BUNDLE="$APP_NAME.app"

echo "🔨 Building $APP_NAME..."
cd desktop-native
swift build -c release
cd ..

echo "📦 Packaging $APP_BUNDLE..."
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

# Binary
cp "$BUILD_DIR/$APP_NAME" "$APP_BUNDLE/Contents/MacOS/"

# Info.plist
cat > "$APP_BUNDLE/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>$APP_NAME</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>$VERSION</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>14.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Icons
cp desktop-native/Sources/Paste/Resources/AppIcon.icns "$APP_BUNDLE/Contents/Resources/" 2>/dev/null || true
cp desktop-native/Sources/Paste/Resources/AppIcon.png "$APP_BUNDLE/Contents/Resources/" 2>/dev/null || true
cp desktop-native/Sources/Paste/Resources/StatusBarIcon.png "$APP_BUNDLE/Contents/Resources/" 2>/dev/null || true

echo "✅ $APP_BUNDLE created ($(du -sh "$APP_BUNDLE" | cut -f1))"

# DMG
echo "💿 Creating $APP_NAME.dmg..."
TMPDIR=$(mktemp -d)
cp -R "$APP_BUNDLE" "$TMPDIR/"
ln -s /Applications "$TMPDIR/Applications"
hdiutil create -volname "$APP_NAME" -srcfolder "$TMPDIR" -ov -format UDZO "$APP_NAME.dmg"
rm -rf "$TMPDIR"

echo "✅ $APP_NAME.dmg created ($(du -sh "$APP_NAME.dmg" | cut -f1))"
echo ""
echo "To install: open $APP_NAME.dmg, drag Paste to Applications"
echo "Then grant Accessibility permission in System Settings → Privacy & Security → Accessibility"
