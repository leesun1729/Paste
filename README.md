# Paste — macOS 剪切板管理器

原生 macOS 菜单栏剪切板工具。自动记录复制历史，全局快捷键呼出面板，选中即粘贴。

## 功能

- **自动捕获** — 复制文字/代码/链接/邮箱/JSON/色值/图片，自动识别类型
- **图片支持** — 截图、复制的图片自动记录，支持预览和粘贴
- **全局呼出** — 任意 App 中 `Cmd+Shift+V` 弹出面板，`↑↓` 选择 `Enter` 粘贴
- **本地存储** — 可配置 500/1000/2000/5000 条，支持自动过期清理
- **类型识别** — 自动分类 Text / Code / URL / Email / JSON / Color / Image
- **收藏 & 置顶** — 常用内容钉在顶部
- **搜索过滤** — 左侧分类筛选（含图片过滤）+ 关键词搜索
- **数据保留** — 可设置 7/14/30/90 天或永久保留
- **音效反馈** — 呼出和粘贴有系统音效
- **主面板 & 弹出面板同步** — 两个面板数据实时同步
- **纯 SwiftUI** — 无 Electron/WebView 依赖，原生性能

## 系统要求

- macOS 14+
- Xcode Command Line Tools (`xcode-select --install`)

## 安装

### 方式一：下载 Release

从 [GitHub Releases](https://github.com/leesun1729/Paste/releases) 下载最新 `Paste.app`，拖入 `/Applications/` 即可。

### 方式二：从源码编译

```bash
# 1. 克隆
git clone https://github.com/leesun1729/Paste.git
cd Paste

# 2. 编译 & 打包
./package.sh

# 3. 安装到 Applications
cp -R Paste.app /Applications/
```

## 授权

每次重新编译后需重新授权：

打开 **系统设置 → 隐私与安全性 → 辅助功能**，点 `+`，选择 `/Applications/Paste.app`。

## 使用

- 菜单栏点击图标 → `Show Paste` 打开主面板
- 任意 App 中 `Cmd+Shift+V` 呼出快速粘贴面板
- `↑↓` 导航，`Enter` 粘贴到光标位置，`Esc` 关闭
- 主面板中可删除、收藏、置顶记录，弹出面板自动同步

## 设置

主面板侧边栏点击 **Settings**：

| 设置项 | 选项 |
|--------|------|
| Theme | light / dark / system |
| Data Retention | 7天 / 14天 / 30天 / 90天 / 永久 |
| Max Items | 500 / 1,000 / 2,000 / 5,000 |

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | SwiftUI (macOS 14+) |
| 窗口 | AppKit (NSWindow + NSPanel) |
| 快捷键 | CGEvent Tap 全局拦截 |
| 剪切板 | NSPasteboard 轮询（文字 + 图片） |
| 粘贴 | CGEvent 模拟 Cmd+V |
| 存储 | UserDefaults + JSON 编解码 |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+Shift+V` | 全局呼出/关闭面板 |
| `↑↓` | 面板内导航 |
| `Enter` | 粘贴到光标位置 |
| `Esc` | 关闭面板 |
| `Cmd+H` | 隐藏主窗口 |
| `Cmd+Q` | 退出应用 |

## 项目结构

```
Paste/
├── desktop-native/Sources/Paste/
│   ├── main.swift              入口
│   ├── AppDelegate.swift       CGEvent 快捷键 / 菜单栏
│   ├── Models/                 数据模型
│   ├── Monitor/                NSPasteboard 监听
│   ├── Store/                  状态管理
│   ├── Views/                  SwiftUI 视图
│   │   ├── Main/               主面板
│   │   ├── Popup/              弹出面板
│   │   └── Settings/           设置页
│   ├── Windows/                NSWindow / NSPanel 控制器
│   └── Resources/              图标资源
├── package.sh                  编译打包脚本
└── README.md
```

## 常见问题

| 问题 | 解决 |
|------|------|
| 快捷键无效 | 重新授权辅助功能 `/Applications/Paste.app` |
| 主面板空白 | 检查是否正确编译，运行 `./package.sh` 重新打包 |
| 弹出面板输入不了中文 | 确保使用最新版本，面板已改为 KeyablePanel |
| 卸载 | 删除 `/Applications/Paste.app` |

## License

MIT
