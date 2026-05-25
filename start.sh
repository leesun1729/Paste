#!/bin/bash
# Paste 启动脚本
# 用法: bash start.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 启动前端
if lsof -ti :3000 > /dev/null 2>&1; then
    echo "前端已运行"
else
    echo "启动前端..."
    cd "$SCRIPT_DIR/frontend"
    nohup npx next dev -p 3000 > /tmp/paste-frontend.log 2>&1 &
    for i in 1 2 3 4 5 6 7 8; do
        sleep 1
        curl -s -o /dev/null http://localhost:3000 && echo "前端就绪" && break
    done
fi

# 编译 Swift (如需要)
APP_BINARY="$SCRIPT_DIR/desktop-native/.build/release/Paste"
if [ ! -f "$APP_BINARY" ]; then
    echo "编译 Swift..."
    cd "$SCRIPT_DIR/desktop-native"
    swift build -c release
fi

# 打包并安装
echo "打包..."
rm -rf "$SCRIPT_DIR/desktop-native/Paste.app"
mkdir -p "$SCRIPT_DIR/desktop-native/Paste.app/Contents/MacOS"
mkdir -p "$SCRIPT_DIR/desktop-native/Paste.app/Contents/Resources"
cp "$APP_BINARY" "$SCRIPT_DIR/desktop-native/Paste.app/Contents/MacOS/Paste"
cat > "$SCRIPT_DIR/desktop-native/Paste.app/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
    <key>CFBundleExecutable</key><string>Paste</string>
    <key>CFBundleIdentifier</key><string>com.paste.clipboard</string>
    <key>CFBundleName</key><string>Paste</string>
    <key>CFBundleVersion</key><string>1.0</string>
    <key>LSUIElement</key><true/>
    <key>NSAppleEventsUsageDescription</key>
    <string>Paste needs to control other applications.</string>
</dict></plist>
PLIST

rm -rf /Applications/Paste.app
cp -R "$SCRIPT_DIR/desktop-native/Paste.app" /Applications/
echo "✓ 安装完成"
echo ""
echo "下一步：系统设置 → 辅助功能 → 添加 /Applications/Paste.app"
echo "然后运行: open /Applications/Paste.app"
