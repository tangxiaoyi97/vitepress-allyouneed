/**
 * URL 拼接 / 编码工具。
 *
 * 关键设计:
 * - 站内 URL 永远是绝对路径 + base 前缀;
 * - 路径段做 URI 编码(空格、中文 → %xx),但保留 '/' 和 '#';
 * - 输出的 URL 仍是字符串,attr 写入时再做 HTML escape(escape.ts 负责)。
 */

/**
 * 给一段路径做 URL 编码,但保留 '/' 和 '#'。
 *
 * `encodeURI` 默认就保留 '/'、'#'、'?' 等,但会保留 '%' —— 我们假设传入的是
 * 原始路径(未编码),所以直接 encodeURI 就行。
 */
export function encodePath(s: string): string {
  return encodeURI(s)
}

/**
 * 拼接 base + 路径段(单个或多个)+ 可选锚点,产出最终 URL。
 *
 * - 多余的 '/' 会被折叠;
 * - 空段被跳过;
 * - 始终以 base 开头(若 base 提供);
 * - cleanUrls=false 时调用方负责加 '.html' 后缀(我们这里不管)。
 */
export function buildUrl(
  base: string,
  pathSegments: string[],
  anchor?: string,
): string {
  // 归一化 base:确保以 / 开头并以 / 结尾
  let normBase = base || '/'
  if (!normBase.startsWith('/')) normBase = '/' + normBase
  if (!normBase.endsWith('/')) normBase = normBase + '/'

  // 拼接路径段(过滤空、去段头尾的 /)
  const joined = pathSegments
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')

  let url = normBase + joined
  // 折叠相邻多 /
  url = url.replace(/\/{2,}/g, '/')
  // URI 编码(空格、中文)
  url = encodePath(url)

  if (anchor) {
    // anchor 也要编码,但不再处理 /
    url += '#' + encodeURIComponent(anchor).replace(/%2F/g, '/')
  }
  return url
}

/**
 * 给路径加上 cleanUrls 决定的扩展名。
 *
 * cleanUrls=true:不加任何后缀(VitePress 生成 .html 但路由用无扩展)。
 * cleanUrls=false:加 '.html'。
 *
 * 调用方应该在 buildUrl 之前对 path 段调用本函数(或之后再追加 .html)。
 */
export function applyCleanUrls(path: string, cleanUrls: boolean): string {
  if (cleanUrls) return path
  if (/\.html$/i.test(path)) return path
  // 末尾的 / 表示目录路由,index.html
  if (path.endsWith('/')) return path + 'index.html'
  return path + '.html'
}
