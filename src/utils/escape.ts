/**
 * HTML escape。
 *
 * 这里不依赖 markdown-it 的 md.utils.escapeHtml,因为我们的工具可能
 * 在 markdown-it 之外被调用(例如 build-emit 写 HTML 占位符)。
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const HTML_ESCAPE_RE = /[&<>"']/g

export function escapeHtml(s: string): string {
  return s.replace(HTML_ESCAPE_RE, (c) => HTML_ESCAPE_MAP[c]!)
}
