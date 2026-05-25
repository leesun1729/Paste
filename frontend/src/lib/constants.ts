export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const CONTENT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  text: { label: 'Text', icon: 'Text', color: '#6366f1' },
  code: { label: 'Code', icon: 'Code2', color: '#22c55e' },
  image: { label: 'Image', icon: 'Image', color: '#ec4899' },
  url: { label: 'URL', icon: 'Link', color: '#3b82f6' },
  file: { label: 'File', icon: 'File', color: '#f97316' },
  color: { label: 'Color', icon: 'Palette', color: '#eab308' },
  email: { label: 'Email', icon: 'Mail', color: '#8b5cf6' },
  phone: { label: 'Phone', icon: 'Phone', color: '#14b8a6' },
  json: { label: 'JSON', icon: 'Braces', color: '#06b6d4' },
  html: { label: 'HTML', icon: 'Code2', color: '#ef4444' },
  markdown: { label: 'MD', icon: 'FileText', color: '#2563eb' },
};

export const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#2563eb', '#7c3aed', '#c026d3',
];

export const ITEMS_PER_PAGE = 30;

export const DEBOUNCE_SEARCH_MS = 300;

export const SYNC_INTERVAL_MS = 30000;
