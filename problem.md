# Paste — 当前状态与已知问题

## 项目概述

macOS 原生剪切板管理器，Swift + Next.js + WKWebView 架构。

## 已完成功能

- [x] 自动捕获文字/代码/链接/邮箱/JSON/色值
- [x] 图片剪贴板（截图、复制图片）支持
- [x] 全局快捷键 ⌘⇧V 呼出弹出面板
- [x] 主面板（完整管理界面）+ 弹出面板（快速粘贴）
- [x] 侧边栏分类过滤（含 Images 过滤器）
- [x] 搜索（支持中文 IME、大写字母）
- [x] 收藏 & 置顶
- [x] 数据保留设置（7/14/30/90/永久）
- [x] 最大条目数设置（500/1000/2000/5000）
- [x] 主面板与弹出面板数据同步（storage 事件）
- [x] 粘贴去重（suppressNextChange）
- [x] 图片显示大小（MB）
- [x] 选中条目高亮
- [x] 自定义应用图标（白色背景 + 蓝色文件夹）
- [x] 状态栏图标
- [x] 主菜单（⌘H 隐藏、⌘Q 退出等）
- [x] GitHub Release v1.0.0 + DMG 安装包

## 已知问题

### 1. 弹出面板搜索 — 中文输入法候选词窗口被遮挡

**状态**：已尝试修复（降低窗口级别为 `.floating`）

**描述**：弹出面板使用 `KeyablePanel`（可成为 key window），输入中文时 IME 候选词窗口可能被面板遮挡。

**当前方案**：面板级别设为 `.floating`（低于 `.popUpMenu`），候选词窗口应能显示在上方。

### 2. 弹出面板 — 输入光标位置问题

**状态**：部分修复

**描述**：弹出面板使用 `nonactivatingPanel` 时无法显示输入光标；改为 `KeyablePanel` 后可以输入，但粘贴时可能丢失前一个应用的光标位置。

**当前方案**：使用 `KeyablePanel` + 粘贴延迟 0.2s 让前一个应用恢复焦点。

### 3. Finder 启动 — 首次安装依赖

**状态**：已修复

**描述**：从 DMG 安装后首次启动，需要安装 npm 依赖。之前没有进度显示。

**当前方案**：首次启动打开终端窗口显示 `npm install` 进度，完成后自动启动应用。

### 4. Node.js 路径硬编码

**状态**：临时方案

**描述**：launcher.sh 中硬编码了 nvm 的 Node.js 路径（`/Users/fairy-nn/.nvm/versions/node/v22.14.0/bin`），换电脑或升级 Node.js 后会失效。

**建议**：改为从用户 shell 配置文件动态读取，或在安装时检测并写入配置。

### 5. 辅助功能权限

**状态**：需用户手动操作

**描述**：每次重新编译后需要在系统设置中重新授权辅助功能权限，否则全局快捷键无法工作。

**建议**：考虑使用 `SMJobBless` 或 `ServiceManagement` 框架实现权限自动授予。

### 6. 主面板边栏缺少返回按钮

**状态**：未处理

**描述**：Settings 面板没有返回主面板的按钮，需要点击侧边栏的 "All" 或其他过滤器才能返回。

## 架构说明

### 弹出面板键盘输入方案

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

### 窗口层级

| 窗口 | 类型 | 级别 | 说明 |
|------|------|------|------|
| 主窗口 | NSWindow | 默认 | 标准窗口，支持 ⌘H/⌘W |
| 弹出面板 | KeyablePanel | .floating | 可成为 key window，支持 IME |
| 状态栏菜单 | NSMenu | - | 点击图标弹出 |

### 数据同步

```
主面板 WebView ←→ localStorage ←→ 弹出面板 WebView
                 (storage 事件)
```

## 文件结构

```
desktop-native/Sources/Paste/
├── main.swift                    入口（.accessory 策略）
├── AppDelegate.swift             CGEvent Tap / 菜单栏 / WebView 管理
├── PopupWindowController.swift   弹出面板（KeyablePanel）
├── KeyablePanel.swift            canBecomeKey = true 的 NSPanel
├── ClipboardMonitor.swift        NSPasteboard 轮询（文字 + 图片）
└── PasteSimulator.swift          CGEvent 模拟 Cmd+V

frontend/src/
├── app/page.tsx                  主面板 + 设置页面
├── app/popup/page.tsx            弹出面板
├── components/layout/Sidebar.tsx 侧边栏（含 Images 过滤器）
├── components/clipboard/
│   ├── ClipboardMonitor.tsx      剪贴板监听 + storage 同步
│   └── LocalClipboardList.tsx    主面板列表
├── store/localClipboardStore.ts  Zustand 状态管理
└── lib/nativeBridge.ts           Swift ↔ JS 桥接
```
