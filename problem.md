# Paste — 当前状态与已知问题

## 项目概述

macOS 原生剪切板管理器，Swift + Next.js（静态导出）+ WKWebView 架构。
安装后零依赖、即开即用，无需 Node.js 运行时。

## 架构变更（v1.1.0）

| 项目 | 旧方案 | 新方案 |
|------|--------|--------|
| 前端加载 | `localhost:3000` (Next.js dev server) | `file://` (bundle 内静态文件) |
| 运行时依赖 | Node.js + npm install | 无 |
| 应用大小 | 265MB (含 node_modules) | 1.9MB |
| DMG 大小 | ~270MB | 1.2MB |
| 数据同步 | localStorage + storage 事件 | Swift 中转 (UserDefaults + evaluateJavaScript) |
| 资源路径 | 绝对路径 `/_next/...` | 相对路径 `./_next/...` + 子目录符号链接 |

## 已完成功能

- [x] 自动捕获文字/代码/链接/邮箱/JSON/色值/图片
- [x] 图片剪贴板（截图、复制图片）支持
- [x] 全局快捷键 ⌘⇧V 呼出弹出面板
- [x] 主面板（完整管理界面）+ 弹出面板（快速粘贴）
- [x] 侧边栏分类过滤（含 Images 过滤器）
- [x] 搜索（支持中文 IME、大写字母）
- [x] 收藏 & 置顶
- [x] 数据保留设置（7/14/30/90/永久）
- [x] 最大条目数设置（500/1000/2000/5000）
- [x] 主面板与弹出面板数据同步（Swift 中转）
- [x] 粘贴去重（suppressNextChange）
- [x] 图片显示大小（MB）
- [x] 选中条目高亮
- [x] 自定义应用图标（白色背景 + 蓝色文件夹）
- [x] 状态栏图标
- [x] 主菜单（⌘H 隐藏、⌘Q 退出等）
- [x] Next.js 静态导出，零 Node.js 依赖
- [x] GitHub Release v1.0.0 + DMG 安装包

## 已知问题
### 1. 弹出面板 — 粘贴时光标位置丢失

**状态**：部分修复

**描述**：弹出面板激活时会抢占焦点，粘贴时前一个应用可能丢失光标位置。

**当前方案**：粘贴延迟 0.2s 让前一个应用恢复焦点。仍有概率丢失。

**建议改进**：监听 `NSWorkspaceDidActivateApplicationNotification` 通知，等待前一个应用真正激活后再模拟 Cmd+V。

### 2. 辅助功能权限

**状态**：需用户手动操作

**描述**：每次重新编译后需要在系统设置中重新授权辅助功能权限，否则全局快捷键无法工作。

**原因**：code signature 变更，系统将其视为新应用。

**建议**：使用 `AXIsProcessTrustedWithOptions` 在应用启动时主动请求权限并给出引导 UI。

### 3. Settings 面板缺少返回按钮

**状态**：未处理

**描述**：Settings 面板没有返回主面板的按钮，需要点击侧边栏的其他过滤器才能返回。

## 关键文件

```
desktop-native/Sources/Paste/
├── main.swift                    入口（.accessory 策略）
├── AppDelegate.swift             CGEvent Tap / 菜单栏 / WebView 管理
│   ├── makeWebView(path:)        加载 bundle 内静态文件
│   ├── loadLocalPage(webView:)   file:// 加载
│   ├── userContentController     消息处理（paste/storage/getStorage）
│   └── broadcastStorageUpdate    跨 WebView 数据同步
├── PopupWindowController.swift   弹出面板（KeyablePanel）
├── KeyablePanel.swift            canBecomeKey = true 的 NSPanel
├── ClipboardMonitor.swift        NSPasteboard 轮询（文字 + 图片）
├── PasteSimulator.swift          CGEvent 模拟 Cmd+V
└── Resources/web/                Next.js 静态导出产物
    ├── index.html                主面板
    ├── popup/index.html          弹出面板
    ├── popup/_next -> ../_next   符号链接（修复子目录路径）
    └── _next/                    CSS/JS 资源

frontend/
├── next.config.js                output: 'export', assetPrefix: './'
├── src/
│   ├── app/page.tsx              主面板 + 设置页面
│   ├── app/popup/page.tsx        弹出面板
│   ├── store/localClipboardStore.ts  Zustand 状态管理
│   └── lib/nativeBridge.ts       Swift ↔ JS 桥接 + 存储同步
└── out/                          静态导出输出
```

## 数据同步机制

```
主面板 WebView                    弹出面板 WebView
    │                                 │
    ├─ saveToStorage() ──┐    ┌── saveToStorage() ──┤
    │                    ▼    ▼                     │
    │              Swift storage handler             │
    │              (UserDefaults + broadcast)        │
    │                    │    │                      │
    │    ┌───────────────┘    └───────────────┐      │
    │    ▼                                   ▼      │
    └─ __onNativeStorageUpdate()    __onNativeStorageUpdate() ──┘
       → setState({ items })        → setState({ items })
```

## 弹出面板键盘输入机制

```
用户按键 → CGEvent Tap (session 级别)
  ├─ ⌘⇧V → togglePopup()（无论 popup 是否可见）
  └─ popup 可见时：
      ├─ 普通字符 → evaluateJavaScript → __pasteTypeChar → 更新搜索
      ├─ ↑↓ → __pasteNavUp/Down → 列表导航
      ├─ Enter → __pasteConfirm → 粘贴
      ├─ Escape → __pasteCancel → 关闭
      └─ Backspace → __pasteDeleteChar → 删除搜索字符
```

## 构建流程

```bash
# 1. 构建前端静态导出
cd frontend && npm run build

# 2. 复制到 Swift bundle
cp -r frontend/out/* desktop-native/Sources/Paste/Resources/web/
# 创建子目录符号链接
ln -sf ../_next desktop-native/Sources/Paste/Resources/web/popup/_next

# 3. 编译 Swift
cd desktop-native && swift build -c release

# 4. 安装
cp .build/release/Paste /Applications/Paste.app/Contents/MacOS/Paste
cp -R Sources/Paste/Resources/web /Applications/Paste.app/Contents/Resources/

# 5. 创建 DMG
hdiutil create -volname "Paste" -srcfolder dmg_contents -ov -format UDZO Paste.dmg
```

## 验收标准

- [x] 从 DMG 安装后，直接双击打开，无终端弹出、无 npm install
- [x] 主面板与弹出面板数据实时同步
- [ ] 选中条目后按 Enter，内容正确粘贴到前一个应用（光标位置偶尔丢失）
- [ ] Settings 页面有返回按钮