import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function detectContentType(content: string): string {
  if (/^https?:\/\/[^\s]+$/.test(content.trim())) return 'url';
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(content.trim())) return 'email';
  if (/^[\d\s+()-]{7,}$/.test(content.trim())) return 'phone';
  if (/^#[0-9A-Fa-f]{3,8}$/.test(content.trim())) return 'color';
  try { JSON.parse(content); return 'json'; } catch {}
  if (/<[^>]+>/.test(content)) return 'html';
  if (/^#{1,6}\s|[*_~`]|\[.*\]\(.*\)/.test(content)) return 'markdown';
  if (/[{}().;=><]/g.test(content) && content.split('\n').length > 2) return 'code';
  return 'text';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
