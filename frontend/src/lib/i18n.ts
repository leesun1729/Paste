import { useUIStore, type Language } from '@/store/uiStore';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Sidebar
    'filters': 'Filters',
    'all': 'All',
    'favorites': 'Favorites',
    'text': 'Text',
    'code': 'Code',
    'links': 'Links',
    'emails': 'Emails',
    'json': 'JSON',
    'images': 'Images',
    'settings': 'Settings',

    // Header
    'clipboard.history': 'Clipboard History',
    'items': 'items',

    // Popup
    'search.clipboard': 'Search clipboard...',
    'no.content': 'No content copied yet',
    'no.content.desc': 'Copied text or images will appear here automatically',
    'no.matches': 'No matches',
    'no.matches.desc': 'Try different keywords',
    'navigate': 'Navigate',
    'paste': 'Paste',
    'close': 'Close',
    'records': 'records',

    // Settings
    'settings.title': 'Settings',
    'theme': 'Theme',
    'language': 'Language',
    'data.retention': 'Data Retention',
    'data.retention.desc': 'Items older than this period will be automatically removed.',
    'max.items': 'Max Items',
    'max.items.desc': 'Maximum number of clipboard records to keep.',
    'items.stored': 'items stored locally',
    'max': 'Max',
    'cloud.sync': 'Cloud sync coming soon.',
    'back': 'Back',
    'days': 'days',
    'forever': 'Forever',

    // Empty state
    'clipboard.empty': 'Clipboard is empty',
    'clipboard.empty.desc': 'Copy anything on your Mac. It appears here instantly.',
    'quick.paste': 'Quick paste anywhere',

    // Settings
    'launch.at.login': 'Launch at Login',
    'launch.at.login.desc': 'Start Paste automatically when you log in.',
    'hotkey': 'Shortcut Key',
    'hotkey.desc': 'Click to record a new shortcut. Default: ⌘⇧V',
    'hotkey.recording': 'Press new shortcut...',
    'hotkey.current': 'Current',
    'on': 'On',
    'off': 'Off',

    // Content types
    'type.text': 'Text',
    'type.code': 'Code',
    'type.url': 'URL',
    'type.email': 'Email',
    'type.json': 'JSON',
    'type.color': 'Color',
    'type.image': 'Image',
    'type.markdown': 'MD',
    'type.html': 'HTML',
    'type.phone': 'Phone',
  },
  zh: {
    // 侧边栏
    'filters': '筛选',
    'all': '全部',
    'favorites': '收藏',
    'text': '文本',
    'code': '代码',
    'links': '链接',
    'emails': '邮件',
    'json': 'JSON',
    'images': '图片',
    'settings': '设置',

    // 头部
    'clipboard.history': '剪贴板历史',
    'items': '条',

    // 弹出面板
    'search.clipboard': '搜索剪贴板...',
    'no.content': '还没有复制任何内容',
    'no.content.desc': '复制文字或图片后会自动出现在这里',
    'no.matches': '没有匹配结果',
    'no.matches.desc': '尝试其他关键词',
    'navigate': '导航',
    'paste': '粘贴',
    'close': '关闭',
    'records': '条记录',

    // 设置
    'settings.title': '设置',
    'theme': '主题',
    'language': '语言',
    'data.retention': '数据保留',
    'data.retention.desc': '超过保留时间的记录将被自动删除。',
    'max.items': '最大条目数',
    'max.items.desc': '最多保留的剪贴板记录数量。',
    'items.stored': '条记录已本地存储',
    'max': '最多',
    'cloud.sync': '云同步即将推出。',
    'back': '返回',
    'days': '天',
    'forever': '永久',

    // 空状态
    'clipboard.empty': '剪贴板为空',
    'clipboard.empty.desc': '在 Mac 上复制任何内容，会立即出现在这里。',
    'quick.paste': '随处快速粘贴',

    // 设置
    'launch.at.login': '开机自启',
    'launch.at.login.desc': '登录时自动启动 Paste。',
    'hotkey': '快捷键',
    'hotkey.desc': '点击录制新快捷键。默认：⌘⇧V',
    'hotkey.recording': '请按下新快捷键...',
    'hotkey.current': '当前',
    'on': '开启',
    'off': '关闭',

    // 内容类型
    'type.text': '文本',
    'type.code': '代码',
    'type.url': '链接',
    'type.email': '邮件',
    'type.json': 'JSON',
    'type.color': '颜色',
    'type.image': '图片',
    'type.markdown': 'MD',
    'type.html': 'HTML',
    'type.phone': '电话',
  },
};

export function t(key: string): string {
  const lang = useUIStore.getState().language;
  return translations[lang]?.[key] || translations['en']?.[key] || key;
}

export function useTranslation() {
  const language = useUIStore((s) => s.language);
  return (key: string) => translations[language]?.[key] || translations['en']?.[key] || key;
}
