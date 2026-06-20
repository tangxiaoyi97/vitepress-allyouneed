<script setup lang="ts">
/**
 * v0.3 — DocHeader(banner 版,两种 mode):
 *
 * - **Mode A: with-banner**(frontmatter.cover 存在)
 *     固定 400px 高 banner,内含:
 *       背景图层(.ayn-doc-banner-bg)  — cover 图,支持 blur/opacity/x/y/overlay 调
 *       渐变遮罩层(.ayn-doc-banner-overlay)  — 暗化层,保证文字可读
 *       内容容器(.ayn-doc-header-inner)  — 标题 + meta + tags 贴底
 *     默认白字;frontmatter.banner.text='dark' 切深色字
 *
 * - **Mode B: no-banner**(无 cover)
 *     不渲染背景层,直接按相同顺序展示标题 + meta + tags,
 *     文字走主题色(--vp-c-text-1),tag 走普通主题 pill 样式
 *
 * 标题来源(永远 fallback):frontmatter.title → page.title → 文件名
 *
 * frontmatter 可调样式:
 *   cover: <url|path>          banner 背景图(不写 → Mode B)
 *   banner:
 *     x: 50%                   background-position-x(默认 center)
 *     y: 30%                   background-position-y
 *     blur: 4                  px,默认 0
 *     opacity: 0.8             0..1,默认 1
 *     overlay: 0.6             0..1 暗化强度,默认 0.6
 *     text: light | dark       文字色,默认 light(配合默认深色 overlay)
 *
 * H1 隐藏:DocHeader 自己 toggle `body.ayn-hide-doc-h1`;CSS 选
 * `.vp-doc` 紧贴开头的 H1 隐藏,不再 JS 改 DOM。
 */

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const { frontmatter, page, theme } = useData()

interface DocHeaderConfig {
  enabled?: boolean
  hideH1?: boolean
  showDates?: boolean
  showTags?: boolean
  showWordCount?: boolean
  tagsViewUrl?: string
  wordsPerMinute?: number
}

const cfg = computed<DocHeaderConfig>(() => {
  const t = (theme.value as { allyouneed?: { docHeader?: DocHeaderConfig } })
    .allyouneed
  return {
    enabled: true,
    hideH1: true,
    showDates: true,
    showTags: true,
    showWordCount: true,
    tagsViewUrl: '/_perspectives_/tags',
    wordsPerMinute: 300,
    ...(t?.docHeader ?? {}),
  }
})

// ── cover + banner 配置 ──────────────────────────────────────────

const coverSrc = computed<string | null>(() => {
  const v = frontmatter.value.cover
  if (typeof v === 'string' && v.trim()) return v.trim()
  return null
})

interface BannerCfg {
  x: string
  y: string
  blur: number
  opacity: number
  overlay: number
  text: 'light' | 'dark'
}

function readBannerCfg(): BannerCfg {
  const b = (frontmatter.value.banner ?? {}) as Record<string, unknown>
  const asStr = (v: unknown, fb: string): string =>
    typeof v === 'string' || typeof v === 'number' ? String(v) : fb
  const asNum = (v: unknown, fb: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fb
  return {
    x: asStr(b.x, 'center'),
    y: asStr(b.y, 'center'),
    blur: Math.max(0, asNum(b.blur, 0)),
    opacity: Math.max(0, Math.min(1, asNum(b.opacity, 1))),
    overlay: Math.max(0, Math.min(1, asNum(b.overlay, 0.6))),
    text: b.text === 'dark' ? 'dark' : 'light',
  }
}

const banner = computed<BannerCfg>(() => readBannerCfg())

const hasBanner = computed(() => Boolean(coverSrc.value))

const bgStyle = computed<Record<string, string>>(() => {
  if (!hasBanner.value || !coverSrc.value) return {}
  const url = coverSrc.value.replace(/"/g, '%22')
  return {
    backgroundImage: `url("${url}")`,
    backgroundPosition: `${banner.value.x} ${banner.value.y}`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    filter: banner.value.blur > 0 ? `blur(${banner.value.blur}px)` : '',
    opacity: String(banner.value.opacity),
    // blur 会让边缘虚化露白,加 scale 撑出血
    transform: banner.value.blur > 0 ? 'scale(1.05)' : '',
  }
})

const overlayStyle = computed<Record<string, string>>(() => {
  if (!hasBanner.value) return {}
  const o = banner.value.overlay
  const top = Math.min(1, o + 0.3)
  const mid = o * 0.6
  return {
    background:
      `linear-gradient(to top, rgba(17, 24, 39, ${top}) 0%, ` +
      `rgba(17, 24, 39, ${mid}) 55%, rgba(17, 24, 39, 0) 100%)`,
  }
})

// ── 标题(always fallback 到文件名)─────────────────────────────

const pageTitle = computed<string>(() => {
  const fmTitle = frontmatter.value.title
  if (typeof fmTitle === 'string' && fmTitle.trim()) return fmTitle.trim()
  const pt = page.value.title
  if (typeof pt === 'string' && pt.trim()) return pt.trim()
  const rel = page.value.relativePath ?? ''
  const base = rel.split('/').pop()?.replace(/\.(md|markdown)$/i, '') ?? ''
  return base
})

// ── 标签 ─────────────────────────────────────────────────────────

const tags = computed<string[]>(() => {
  const v = frontmatter.value.tags
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string')
  if (typeof v === 'string') return v.split(/[,\s]+/).filter(Boolean)
  return []
})

// ── 日期 ─────────────────────────────────────────────────────────

const createdAt = computed<string | null>(() => formatDate(frontmatter.value.created))
const updatedAt = computed<string | null>(() => {
  const fm = formatDate(frontmatter.value.updated)
  if (fm) return fm
  const lu = (page.value as { lastUpdated?: number }).lastUpdated
  if (typeof lu === 'number' && lu > 0) return formatDate(new Date(lu).toISOString())
  return null
})

function formatDate(raw: unknown): string | null {
  if (!raw) return null
  try {
    const d = raw instanceof Date ? raw : new Date(String(raw))
    if (Number.isNaN(d.getTime())) return null
    // v0.3.9:所有 UI 文案以英文为基准。date 用 en-US "May 21, 2026" 风格
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  } catch {
    return null
  }
}

// ── 字数 + 阅读时长 ──────────────────────────────────────────────

const wordCount = ref(0)
const readingTime = computed(() => {
  if (wordCount.value === 0) return 0
  return Math.max(1, Math.round(wordCount.value / (cfg.value.wordsPerMinute ?? 300)))
})

function recountWords(): void {
  if (typeof window === 'undefined') return
  requestAnimationFrame(() => {
    const doc = document.querySelector('.vp-doc')
    if (!doc) {
      wordCount.value = 0
      return
    }
    const banner = doc.querySelector('.ayn-doc-header')
    const docText = doc.textContent ?? ''
    const bannerText = banner?.textContent ?? ''
    wordCount.value = countWords(docText.replace(bannerText, ''))
  })
}

function countWords(text: string): number {
  const cn = (text.match(/[一-龥]/g) ?? []).length
  const en = text
    .replace(/[一-龥]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  return cn + en
}

onMounted(recountWords)
watch(() => page.value.relativePath, recountWords)

// ── tag URL ──────────────────────────────────────────────────────

function tagHref(tag: string): string {
  const base = (cfg.value.tagsViewUrl ?? '/_perspectives_/tags').replace(/\/$/, '')
  return `${base}#${encodeURIComponent(tag)}`
}

// ── 是否有内容行,用于决定标题下方分割线 ────────────────────────

const hasMetaLine = computed<boolean>(
  () =>
    Boolean(cfg.value.showWordCount && readingTime.value > 0) ||
    Boolean(cfg.value.showDates && (createdAt.value || updatedAt.value)),
)

const hasTagsRow = computed<boolean>(
  () => Boolean(cfg.value.showTags) && tags.value.length > 0,
)

/** 标题后面还有 meta 或 tags 时才显示分割线 */
const showTitleDivider = computed<boolean>(
  () => Boolean(pageTitle.value) && (hasMetaLine.value || hasTagsRow.value),
)

// ── 可见性 + mode class ──────────────────────────────────────────

/** 视图 URL 前缀(_perspectives_ 默认),用于识别系统生成的特殊视图页 */
const viewsPrefix = computed<string>(() => {
  const t = theme.value as {
    allyouneed?: { viewsUrlPrefix?: string }
  }
  return t.allyouneed?.viewsUrlPrefix ?? '_perspectives_'
})

/** 这页是不是插件自动生成的视图(graph/stats/tags)? */
const isPerspectiveView = computed<boolean>(() => {
  const rel = page.value.relativePath ?? ''
  const prefix = viewsPrefix.value
  if (!prefix) return false
  return rel.startsWith(prefix + '/') || rel === prefix + '.md'
})

const visible = computed(() => {
  if (cfg.value.enabled === false) return false
  // 系统视图(graph/stats/tags)是工具页面,不显示 DocHeader
  if (isPerspectiveView.value) return false
  // VitePress 'home' layout 自带 hero,不显示 DocHeader
  const layout = frontmatter.value.layout
  if (layout === 'home') return false
  return true
})

const modeClasses = computed<string[]>(() => {
  if (hasBanner.value) {
    return [
      'ayn-doc-header--with-banner',
      banner.value.text === 'dark'
        ? 'ayn-doc-header--text-dark'
        : 'ayn-doc-header--text-light',
    ]
  }
  return ['ayn-doc-header--no-banner']
})

// ── H1 隐藏:body class toggle,CSS 选 .vp-doc 紧贴开头的 H1 ─────

const BODY_CLASS = 'ayn-hide-doc-h1'

function applyH1Hide(): void {
  if (typeof document === 'undefined') return
  // 只在 banner 模式 + cfg.hideH1 + 有 pageTitle 时隐藏
  // (Mode B 也显示了大标题,所以同样隐藏正文 H1 避免重复)
  const should = cfg.value.hideH1 && visible.value && Boolean(pageTitle.value)
  document.body.classList.toggle(BODY_CLASS, should)
}

onMounted(applyH1Hide)
onUnmounted(() => {
  if (typeof document !== 'undefined') document.body.classList.remove(BODY_CLASS)
})
watch([visible, () => cfg.value.hideH1, pageTitle, () => page.value.relativePath],
  applyH1Hide)
</script>

<template>
  <header v-if="visible" class="ayn-doc-header" :class="modeClasses">
    <!-- Mode A: banner 背景(两层) -->
    <div v-if="hasBanner" class="ayn-doc-banner-bg" :style="bgStyle"></div>
    <div v-if="hasBanner" class="ayn-doc-banner-overlay" :style="overlayStyle"></div>

    <!-- 内容容器:两个 mode 都用 -->
    <div class="ayn-doc-header-inner">
      <!--
        v0.5.0-beta.2: 这里**故意不用 `<h1>`**,改用 `<div role="heading" aria-level="1">`。
        原因:`<h1>` 在 `.vp-doc` 内会被 VitePress 的 `.vp-doc h1` 选择器抓住 → VP 默认
        32px 字号(unlayered)永远赢我们 layered 的 clamp 大字号,banner title 字号塌缩。
        改 div + ARIA 后,VP 的 `h1` 选择器不匹配,我们的 `.ayn-doc-banner-title` 字号
        在 @layer 里也能干净生效。
        辅助技术:`role="heading" aria-level="1"` 是 WAI-ARIA 标准,屏幕阅读器按 h1
        念出来,跟原生 `<h1>` 等效;但 VitePress CSS 抓不到。
      -->
      <div
        v-if="pageTitle"
        class="ayn-doc-banner-title"
        role="heading"
        aria-level="1"
      >{{ pageTitle }}</div>

      <div v-if="showTitleDivider" class="ayn-doc-title-divider"></div>

      <div
        v-if="hasMetaLine"
        class="ayn-doc-meta-line"
      >
        <span v-if="cfg.showWordCount && readingTime > 0" class="ayn-doc-meta-item">
          <svg class="ayn-doc-meta-icon" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          {{ readingTime }} min read
        </span>

        <span
          v-if="cfg.showWordCount && readingTime > 0 && cfg.showDates && createdAt"
          class="ayn-doc-meta-sep"
        >•</span>

        <span v-if="cfg.showDates && createdAt" class="ayn-doc-meta-item">
          <svg class="ayn-doc-meta-icon" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Created {{ createdAt }}
        </span>

        <span
          v-if="cfg.showDates && createdAt && updatedAt"
          class="ayn-doc-meta-sep"
        >•</span>

        <span v-if="cfg.showDates && updatedAt" class="ayn-doc-meta-item">
          <svg class="ayn-doc-meta-icon" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round" aria-hidden="true">
            <polygon points="14 2 18 6 7 17 3 17 3 13 14 2"/>
            <line x1="3" y1="22" x2="21" y2="22"/>
          </svg>
          Updated {{ updatedAt }}
        </span>
      </div>

      <div v-if="hasTagsRow" class="ayn-doc-tags">
        <a v-for="t in tags" :key="t" class="ayn-doc-tag" :href="tagHref(t)">#{{ t }}</a>
      </div>
    </div>
  </header>
</template>
