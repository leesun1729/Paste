# Paste — macOS 剪切板管理器

原生 macOS 菜单栏剪切板工具。自动记录复制历史，全局快捷键呼出面板，选中即粘贴。

## 功能

- **自动捕获** — 复制文字/代码/链接/邮箱/JSON/色值，自动识别类型
- **全局呼出** — 任意 App 中 `Cmd+Shift+V` 弹出面板，`↑↓` 选择 `Enter` 粘贴
- **本地存储** — 最多 500 条，永久保留，重启不丢失
- **类型识别** — 自动分类 Text / Code / URL / Email / JSON / Color
- **收藏 & 置顶** — 常用内容钉在顶部
- **搜索过滤** — 左侧分类筛选 + 关键词搜索
- **音效反馈** — 呼出和粘贴有系统音效 ("Pop" / "Blow")

## 系统要求

- macOS 14+
- Node.js 18+
- Xcode Command Line Tools (`xcode-select --install`)

## 安装

```bash
# 1. 克隆
git clone https://github.com/leesun1729/Paste.git
cd Paste

# 2. 安装前端依赖
cd frontend && npm install

# 3. 一键启动（编译 + 打包 + 安装）
cd .. && bash start.sh
```

`start.sh` 会自动：安装依赖 → 编译 Swift → 打包 `.app` → 安装到 `/Applications/Paste.app` → 启动前端服务。

## 授权

打开 **系统设置 → 隐私与安全性 → 辅助功能**，点 `+`，选择 `/Applications/Paste.app`。

## 使用

- 菜单栏点回形针 📎 → `Show Paste` 打开主面板
- 任意 App 中 `Cmd+Shift+V` 呼出快速粘贴面板
- `↑↓` 导航，`Enter` 粘贴到光标位置，`Esc` 关闭

## 前端服务自启（可选）

让前端在开机时自动启动，崩溃自动重启：

```bash
# 生成 plist 并加载
NODE_PATH=$(which node)
FRONTEND_DIR="$(pwd)/frontend"
NODE_BIN=$(dirname "$NODE_PATH")

cat > ~/Library/LaunchAgents/com.paste.frontend.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
    <key>Label</key><string>com.paste.frontend</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$FRONTEND_DIR/node_modules/.bin/next</string>
        <string>dev</string><string>-p</string><string>3000</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>WorkingDirectory</key><string>$FRONTEND_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key><string>$NODE_BIN:/usr/bin:/bin</string>
        <key>HOME</key><string>$HOME</string>
    </dict>
    <key>StandardOutPath</key><string>/tmp/paste-frontend.log</string>
    <key>StandardErrorPath</key><string>/tmp/paste-frontend.err</string>
</dict></plist>
EOF

launchctl load ~/Library/LaunchAgents/com.paste.frontend.plist
```

之后只需打开 `/Applications/Paste.app` 即可。

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面端 | Swift 6 + AppKit (NSPanel + CGEvent) |
| UI | Next.js 14 + React 18 + TailwindCSS (WKWebView) |
| 快捷键 | CGEvent Tap 全局拦截 |
| 剪切板 | NSPasteboard 轮询 |
| 粘贴 | CGEvent 模拟 Cmd+V |
| 存储 | localStorage (两个 WebView 共享 WKProcessPool) |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+Shift+V` | 全局呼出/关闭面板 |
| `↑↓` | 面板内导航 |
| `Enter` | 粘贴到光标位置 |
| `Esc` | 关闭面板 |

## 项目结构

```
Paste/
├── frontend/src/
│   ├── app/              / (主面板) 和 /popup (弹出面板)
│   ├── components/       UI 组件
│   ├── store/            Zustand 状态 (localStorage 持久)
│   └── lib/              WebView ↔ Swift 桥接
├── desktop-native/Sources/Paste/
│   ├── main.swift              入口
│   ├── AppDelegate.swift       CGEvent 快捷键 / 托盘 / WebView
│   ├── PopupWindowController   NSPanel 弹出面板
│   ├── ClipboardMonitor        NSPasteboard 监听
│   └── PasteSimulator          CGEvent 粘贴
├── backend/              Express API (云同步，可选)
└── start.sh              一键安装脚本
```

## 常见问题

| 问题 | 解决 |
|------|------|
| 快捷键无效 | 重新授权辅助功能 `/Applications/Paste.app` |
| 主面板空白 | 确认 `localhost:3000` 在运行 (`curl localhost:3000`) |
| 弹出面板和主面板数据不同步 | 重启 App (新版已修，共享 WKProcessPool) |
| 卸载 | 删除 `/Applications/Paste.app`，删除 `~/Library/LaunchAgents/com.paste.frontend.plist`，`launchctl remove com.paste.frontend` |

## License

MIT
