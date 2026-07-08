<template>
  <div ref="rootEl" class="ac-md" @click="onDelegatedClick" v-html="html" />
</template>

<script setup lang="ts">
defineOptions({ name: 'MarkdownText' })

/**
 * MarkdownText — 企业级 Markdown 渲染
 *
 * 能力：
 * - GFM 基础（表格/删除线/自动链接）
 * - KaTeX 数学：$$...$$ 块级、$...$ 行内（流式期间只渲染完整定界对）
 * - Mermaid 图表：```mermaid 代码块（流式期间显示源码，结束后渲染，失败降级）
 * - GitHub 警告块：> [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION]
 * - GFM 任务列表：- [x] 渲染为复选框
 * - 脚注：[^1] 引用 + 底部脚注区
 * - 折叠块：<details><summary> 白名单放行
 * - 代码块增强：语法高亮（tok-* 零依赖）、语言徽章、文件名标题（```ts title="x.ts"）、diff 着色、行号（```ts showLineNumbers）、复制按钮
 * - 表格：横向滚动容器 + 复制为 TSV
 * - ==文本== 高亮标记（<mark>）；标题自动生成锚点 id + hover 链接
 * - 外部链接自动加 target="_blank" rel="noopener noreferrer" + 外链图标
 * - 图片：懒加载 + title 渲染为图注（figure/figcaption）+ 点击灯箱放大
 * - 行内扩展：^上标^ / ~下标~ / [[Kbd]] 键盘键 / :rocket: emoji 短代码
 * - [TOC] 目录自动生成；定义列表（Term / : 定义）
 * - 媒体嵌入：图片语法指向 .mp4/.webm → video，.mp3/.wav/.ogg → audio
 * - 代码块：折行切换、下载文件、超长自动折叠（>24 行）
 * - 表格：复制 TSV + 导出 CSV
 * - 流式光标：streaming 时末尾显示闪烁竖线
 */
import { computed, nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { highlightCode } from '../generative-ui/highlight'
import { copyText } from '../../utils/clipboard'
import { useI18n, type TranslateFn } from '../../i18n'

const props = defineProps<{
  content: string
  /** 流式中：跳过 mermaid 渲染、只渲染完整数学定界对，避免闪烁 */
  streaming?: boolean
}>()

const { t } = useI18n()

/**
 * 模块级渲染函数（marked renderer / TOC 生成）无法直接访问组件实例，
 * html computed 求值前把当前实例的 t 写入 activeT。computed 同步执行，
 * 多实例不同 locale 也不会串。
 */
let activeT: TranslateFn = (key) => key

marked.setOptions({ gfm: true, breaks: true })

const rootEl = ref<HTMLElement | null>(null)

// ---------- 0. 工具：仅对代码区之外的文本做变换 ----------
/** 按 fenced code / 行内 code 切分，仅对非代码片段应用 fn，防止污染代码内容 */
function transformOutsideCode(src: string, fn: (seg: string) => string): string {
  return src
    .split(/(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`)/g)
    .map((seg, i) => (i % 2 === 1 ? seg : fn(seg)))
    .join('')
}

// ---------- 1. 预处理：数学公式占位 ----------
/** 提取完整的 $$...$$ 与 $...$，替换为占位符，marked 处理后再还原为 KaTeX HTML */
interface MathToken { id: string; tex: string; display: boolean }

function extractMath(src: string): { text: string; tokens: MathToken[] } {
  const tokens: MathToken[] = []
  let i = 0
  // 块级 $$...$$（允许跨行）
  let text = src.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    const id = `%%ACMATH${i++}%%`
    tokens.push({ id, tex: tex.trim(), display: true })
    return id
  })
  // 行内 $...$（不跨行、不允许内部 $、排除货币场景 $5 的误判：要求非数字开头结尾贴合）
  text = text.replace(/\$([^$\n]+?)\$/g, (m, tex) => {
    if (/^\s|\s$/.test(tex)) return m // "$ 5 $" 不视为公式
    const id = `%%ACMATH${i++}%%`
    tokens.push({ id, tex: tex.trim(), display: false })
    return id
  })
  return { text, tokens }
}

function renderMathTokens(html: string, tokens: MathToken[]): string {
  for (const t of tokens) {
    let rendered: string
    try {
      rendered = katex.renderToString(t.tex, { displayMode: t.display, throwOnError: false, output: 'html' })
    } catch {
      rendered = `<code>${escapeHtml(t.tex)}</code>`
    }
    html = html.replaceAll(t.id, rendered)
  }
  return html
}

// ---------- 1.5 预处理：行内扩展语法（sup/sub/kbd/emoji） ----------
/** 常用 emoji 短代码（:rocket: 风格，覆盖 AI 对话高频场景） */
const EMOJI_MAP: Record<string, string> = {
  smile: '😄', rocket: '🚀', warning: '⚠️', white_check_mark: '✅', x: '❌',
  bulb: '💡', fire: '🔥', star: '⭐', tada: '🎉', eyes: '👀',
  thumbsup: '👍', '+1': '👍', heart: '❤️', zap: '⚡', bug: '🐛',
  memo: '📝', lock: '🔒', gear: '⚙️', sparkles: '✨', question: '❓',
  info: 'ℹ️', check: '✔️', point_right: '👉', link: '🔗', package: '📦',
}

function transformInlineExtras(seg: string): string {
  return seg
    // [[Ctrl]] → <kbd>Ctrl</kbd>
    .replace(/\[\[([^\[\]\n]{1,24})\]\]/g, (_m, k) => `<kbd class="ac-md__kbd">${k.trim()}</kbd>`)
    // ^上标^（两侧贴合、不跨行）
    .replace(/\^([^\^\s][^\^\n]*?)\^/g, (_m, t) => `<sup>${t}</sup>`)
    // ~下标~（排除 ~~删除线~~）
    .replace(/(^|[^~])~([^~\s][^~\n]*?)~(?!~)/g, (_m, lead, t) => `${lead}<sub>${t}</sub>`)
    // :emoji: 短代码
    .replace(/:([a-z0-9_+]+):/g, (m, name) => EMOJI_MAP[name] ?? m)
}

// ---------- 1.6 预处理：定义列表 ----------
/** Term\n: 定义 → <dl>（PHP Markdown Extra 风格，连续多组合并） */
function transformDefinitionLists(src: string): string {
  return src.replace(
    /(^|\n)((?:[^\n:>#\-*][^\n]*\n(?::\s+[^\n]+\n?)+)+)/g,
    (_m, lead, block: string) => {
      const items: string[] = []
      const lines = block.split('\n').filter((l) => l.trim())
      let term = ''
      for (const line of lines) {
        if (/^:\s+/.test(line)) {
          if (term) { items.push(`<dt>${marked.parseInline(term, { async: false })}</dt>`); term = '' }
          items.push(`<dd>${marked.parseInline(line.replace(/^:\s+/, ''), { async: false })}</dd>`)
        } else {
          term = line
        }
      }
      if (items.length === 0) return _m
      return `${lead}<dl class="ac-md__dl">${items.join('')}</dl>\n`
    },
  )
}

// ---------- 1.7 预处理：[TOC] 目录 ----------
function slugify(plain: string): string {
  return 'h-' + plain.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 48)
}

/** [TOC] 单独成行时，替换为从源文标题生成的目录树 */
function transformToc(src: string): string {
  if (!/^\[TOC\]\s*$/m.test(src)) return src
  const headings: { depth: number; text: string }[] = []
  // 仅收集代码区之外的 ATX 标题
  transformOutsideCode(src, (seg) => {
    for (const m of seg.matchAll(/^(#{1,4})\s+(.+)$/gm)) {
      headings.push({ depth: m[1].length, text: m[2].replace(/[*_`~]/g, '').trim() })
    }
    return seg
  })
  const items = headings
    .filter((h) => !/^\[TOC\]/.test(h.text))
    .map((h) => `<li class="ac-md__toc-l${h.depth}"><a href="#${slugify(h.text)}">${escapeHtml(h.text)}</a></li>`)
    .join('')
  const tocLabel = activeT('md.toc')
  const toc = items ? `<nav class="ac-md__toc" aria-label="${tocLabel}"><p class="ac-md__toc-title">${tocLabel}</p><ul>${items}</ul></nav>` : ''
  return src.replace(/^\[TOC\]\s*$/m, toc)
}

// ---------- 2. 预处理：GitHub 警告块 ----------
/** 警告块种类 → CSS 类名 + 词条 key（标题文案在渲染时经 activeT 翻译） */
const ADMONITION_META: Record<string, { i18nKey: string; cls: string }> = {
  NOTE: { i18nKey: 'md.note', cls: 'note' },
  TIP: { i18nKey: 'md.tip', cls: 'tip' },
  IMPORTANT: { i18nKey: 'md.important', cls: 'important' },
  WARNING: { i18nKey: 'md.warning', cls: 'warning' },
  CAUTION: { i18nKey: 'md.caution', cls: 'caution' },
}

/** 把 > [!NOTE]\n> 内容 转换为带类名的 div（在 marked 之前处理成 HTML 块） */
function transformAdmonitions(src: string): string {
  return src.replace(
    /(^|\n)>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:>.*(?:\n|$))*)/g,
    (_m, lead, kind, body) => {
      const meta = ADMONITION_META[kind]
      const inner = (body as string).split('\n').map((l) => l.replace(/^>\s?/, '')).join('\n').trim()
      const innerHtml = marked.parse(inner, { async: false }) as string
      return `${lead}<div class="ac-md__adm ac-md__adm--${meta.cls}"><p class="ac-md__adm-title">${escapeHtml(activeT(meta.i18nKey))}</p>${innerHtml}</div>\n`
    },
  )
}

// ---------- 3. 预处理：脚注 ----------
function transformFootnotes(src: string): string {
  const defs = new Map<string, string>()
  let text = src.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, (_m, id, def) => {
    defs.set(id, def)
    return ''
  })
  if (defs.size === 0) return src
  let n = 0
  const order: string[] = []
  text = text.replace(/\[\^([^\]]+)\]/g, (m, id) => {
    if (!defs.has(id)) return m
    if (!order.includes(id)) order.push(id)
    n = order.indexOf(id) + 1
    return `<sup class="ac-md__fnref"><a href="#ac-fn-${id}">[${n}]</a></sup>`
  })
  const items = order
    .map((id) => `<li id="ac-fn-${id}">${marked.parseInline(defs.get(id)!, { async: false })}</li>`)
    .join('')
  return `${text}\n<ol class="ac-md__footnotes">${items}</ol>`
}

// ---------- 4. 代码块渲染（含 diff/行号/文件名/mermaid 占位） ----------
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 解析 ```lang title="x.ts" showLineNumbers 信息串 */
function parseFence(info: string): { lang: string; title?: string; lineNumbers: boolean } {
  const parts = info.trim().split(/\s+/)
  const lang = parts[0] ?? ''
  const title = /title="([^"]+)"/.exec(info)?.[1]
  return { lang, title, lineNumbers: /showLineNumbers/.test(info) }
}

function renderCodeBlock(code: string, info: string, streaming: boolean): string {
  const { lang, title, lineNumbers } = parseFence(info)

  // Mermaid：流式中显示源码，结束后由 DOM 阶段异步渲染
  if (lang === 'mermaid') {
    if (streaming) {
      return `<div class="ac-md__code"><div class="ac-md__code-head"><span>${escapeHtml(activeT('md.mermaidLoading'))}</span></div><pre><code>${escapeHtml(code)}</code></pre></div>`
    }
    return `<div class="ac-md__mermaid" data-mermaid="${escapeHtml(code)}"><pre><code>${escapeHtml(code)}</code></pre></div>`
  }

  /** 单行高亮（highlightCode 输出已转义、含 tok-* span），无语言时降级转义 */
  const hl = (line: string) => (lang ? highlightCode(line, lang) : escapeHtml(line))

  let body: string
  if (lang === 'diff') {
    body = code.split('\n').map((line) => {
      const cls = line.startsWith('+') ? ' class="ac-md__diff-add"' : line.startsWith('-') ? ' class="ac-md__diff-del"' : ''
      return `<span${cls}>${escapeHtml(line)}\n</span>`
    }).join('')
  } else if (lineNumbers) {
    body = code.split('\n').map((line, idx) =>
      `<span class="ac-md__ln"><span class="ac-md__ln-no">${idx + 1}</span>${hl(line)}\n</span>`,
    ).join('')
  } else {
    body = code.split('\n').map((line) => `${hl(line)}\n`).join('')
  }

  const label = title ?? (lang || 'text')
  const lineCount = code.split('\n').length
  // 超长代码折叠（流式期间不折叠，避免高度跳动）
  const collapsed = !streaming && lineCount > 24
  const expandBtn = collapsed
    ? `<button type="button" class="ac-md__code-expand" data-expand-code>${activeT('md.expandAll', { n: lineCount })}</button>`
    : ''
  return (
    `<div class="ac-md__code${collapsed ? ' ac-md__code--collapsed' : ''}" data-filename="${escapeHtml(title ?? (lang ? `snippet.${lang}` : 'snippet.txt'))}">` +
    `<div class="ac-md__code-head"><span>${escapeHtml(label)}</span>` +
    `<span class="ac-md__code-acts">` +
    `<button type="button" class="ac-md__copy" data-wrap-code>${activeT('md.wrap')}</button>` +
    `<button type="button" class="ac-md__copy" data-download-code>${activeT('md.download')}</button>` +
    `<button type="button" class="ac-md__copy" data-copy-code>${activeT('md.copy')}</button>` +
    `</span></div>` +
    `<pre><code>${body}</code></pre>${expandBtn}</div>`
  )
}

// ---------- 5. sanitize（白名单放行 details/summary） ----------
function sanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<(iframe|object|embed|form)[\s\S]*?>/gi, '')
}

// ---------- 主渲染���线 ----------
const html = computed(() => {
  activeT = t // 渲染前绑定本实例翻译函数（模块级渲染器使用）
  let src = props.content ?? ''
  if (!src) return ''

  // 数学提取 / ==标记== 均只作用于代码区之外，避免污染代码内容
  let tokens: MathToken[] = []
  src = transformToc(src)
  src = transformOutsideCode(src, (seg) => {
    const r = extractMath(seg)
    tokens = tokens.concat(r.tokens)
    // ==文本== → <mark>（要求两侧无空格贴合，避免误判赋值语句）
    const marked2 = r.text.replace(/==([^=\n][^=\n]*?)==/g, (_m, t) => `<mark class="ac-md__mark">${t}</mark>`)
    return transformInlineExtras(marked2)
  })
  src = transformOutsideCode(src, transformDefinitionLists)
  src = transformAdmonitions(src)
  src = transformFootnotes(src)

  // 自定义渲染器
  const renderer = new marked.Renderer()
  renderer.code = ({ text, lang }: { text: string; lang?: string }) =>
    renderCodeBlock(text, lang ?? '', !!props.streaming)
  renderer.table = function (token: any) {
    const inner = marked.Renderer.prototype.table.call(this, token)
    return `<div class="ac-md__table-wrap">${inner}<span class="ac-md__table-acts">` +
      `<button type="button" class="ac-md__copy" data-download-table>${activeT('md.csv')}</button>` +
      `<button type="button" class="ac-md__copy" data-copy-table>${activeT('md.copyTable')}</button></span></div>`
  }
  // 标题：生成锚点 id + hover 显示 # 链接
  renderer.heading = function (token: any) {
    const inner = this.parser.parseInline(token.tokens)
    const plain = inner.replace(/<[^>]+>/g, '')
    const id = 'h-' + plain.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 48)
    return `<h${token.depth} id="${id}" class="ac-md__heading">${inner}<a class="ac-md__anchor" href="#${id}" aria-label="${escapeHtml(activeT('md.anchor'))}">#</a></h${token.depth}>\n`
  }
  // 链接：外链加 target/rel + 图标；锚点/相对链接原样
  renderer.link = function (token: any) {
    const inner = this.parser.parseInline(token.tokens)
    const href = token.href ?? ''
    const titleAttr = token.title ? ` title="${escapeHtml(token.title)}"` : ''
    const external = /^https?:\/\//i.test(href)
    if (!external) return `<a href="${escapeHtml(href)}"${titleAttr}>${inner}</a>`
    return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noopener noreferrer" class="ac-md__extlink">${inner}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg></a>`
  }
  // 图片：懒加载 + title 图注 + 点击灯箱；.mp4/.webm → video，.mp3/.wav/.ogg → audio
  renderer.image = function (token: any) {
    const src2 = escapeHtml(token.href ?? '')
    const alt = escapeHtml(token.text ?? '')
    if (/\.(mp4|webm)(\?|#|$)/i.test(token.href ?? '')) {
      return `<video src="${src2}" controls preload="metadata" class="ac-md__video" aria-label="${alt}"></video>`
    }
    if (/\.(mp3|wav|ogg|m4a)(\?|#|$)/i.test(token.href ?? '')) {
      return `<audio src="${src2}" controls preload="metadata" class="ac-md__audio" aria-label="${alt}"></audio>`
    }
    const img = `<img src="${src2}" alt="${alt}" loading="lazy" class="ac-md__img" data-lightbox />`
    if (token.title) return `<figure class="ac-md__figure">${img}<figcaption>${escapeHtml(token.title)}</figcaption></figure>`
    return img
  }

  let out = marked.parse(src, { async: false, renderer }) as string
  out = renderMathTokens(out, tokens)
  out = sanitize(out)
  // 流式光标：追加到最后一个块级元素内部（ChatGPT 风格闪烁竖线）
  if (props.streaming) {
    const m = /<\/(p|li|h[1-6]|td)>\s*$/.exec(out)
    if (m) out = out.slice(0, m.index) + '<span class="ac-md__cursor" aria-hidden="true"></span>' + out.slice(m.index)
    else out += '<span class="ac-md__cursor" aria-hidden="true"></span>'
  }
  return out
})

// ---------- Mermaid 异步渲染（流结束后） ----------
let mermaidSeq = 0
async function renderMermaidBlocks() {
  const root = rootEl.value
  if (!root || props.streaming) return
  const blocks = root.querySelectorAll<HTMLElement>('.ac-md__mermaid[data-mermaid]:not([data-done])')
  if (blocks.length === 0) return
  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })
    for (const el of blocks) {
      const code = el.getAttribute('data-mermaid') ?? ''
      el.setAttribute('data-done', '1')
      try {
        const { svg } = await mermaid.render(`ac-mmd-${Date.now()}-${mermaidSeq++}`, code)
        el.innerHTML = svg
      } catch {
        // 语法错误：保留源码展示
        el.classList.add('ac-md__mermaid--error')
      }
    }
  } catch (err) {
    console.error('[agent-copilot] mermaid 加载失败', err)
  }
}

watch([html, () => props.streaming], () => nextTick(renderMermaidBlocks), { immediate: true })

// ---------- 复制按钮（事件委托，v-html 内不能绑 Vue 事件） ----------
function onDelegatedClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const codeBtn = target.closest('[data-copy-code]')
  if (codeBtn) {
    const pre = codeBtn.closest('.ac-md__code')?.querySelector('pre')
    if (pre) copyWithFeedback(codeBtn as HTMLElement, pre.textContent ?? '')
    return
  }
  const tableBtn = target.closest('[data-copy-table]')
  if (tableBtn) {
    const table = tableBtn.closest('.ac-md__table-wrap')?.querySelector('table')
    if (table) {
      const tsv = [...table.querySelectorAll('tr')]
        .map((tr) => [...tr.querySelectorAll('th,td')].map((c) => c.textContent?.trim() ?? '').join('\t'))
        .join('\n')
      copyWithFeedback(tableBtn as HTMLElement, tsv)
    }
    return
  }
  // 表格导出 CSV
  const csvBtn = target.closest('[data-download-table]')
  if (csvBtn) {
    const table = csvBtn.closest('.ac-md__table-wrap')?.querySelector('table')
    if (table) {
      const csv = [...table.querySelectorAll('tr')]
        .map((tr) => [...tr.querySelectorAll('th,td')]
          .map((c) => `"${(c.textContent?.trim() ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n')
      downloadBlob(csv, 'table.csv', 'text/csv;charset=utf-8')
    }
    return
  }
  // 代码折行切换
  const wrapBtn = target.closest('[data-wrap-code]')
  if (wrapBtn) {
    wrapBtn.closest('.ac-md__code')?.classList.toggle('ac-md__code--wrap')
    return
  }
  // 代码下载
  const dlBtn = target.closest('[data-download-code]')
  if (dlBtn) {
    const wrap = dlBtn.closest('.ac-md__code') as HTMLElement | null
    const pre = wrap?.querySelector('pre')
    if (wrap && pre) downloadBlob(pre.textContent ?? '', wrap.dataset.filename || 'snippet.txt', 'text/plain;charset=utf-8')
    return
  }
  // 超长代码展开
  const expandBtn = target.closest('[data-expand-code]')
  if (expandBtn) {
    expandBtn.closest('.ac-md__code')?.classList.remove('ac-md__code--collapsed')
    ;(expandBtn as HTMLElement).remove()
    return
  }
  // 图片灯箱
  const img = target.closest('img[data-lightbox]') as HTMLImageElement | null
  if (img) openLightbox(img.src, img.alt)
}

function downloadBlob(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 图片灯箱：全屏遮罩预览，点击或 Esc 关闭 */
function openLightbox(src: string, alt: string) {
  const overlay = document.createElement('div')
  overlay.className = 'ac-md__lightbox'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-label', alt || t('md.imagePreview'))
  const image = document.createElement('img')
  image.src = src
  image.alt = alt
  overlay.appendChild(image)
  const close = () => {
    overlay.remove()
    document.removeEventListener('keydown', onKey)
  }
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close() }
  overlay.addEventListener('click', close)
  document.addEventListener('keydown', onKey)
  document.body.appendChild(overlay)
}

function copyWithFeedback(btn: HTMLElement, text: string) {
  copyText(text).then((ok) => {
    if (!ok) return
    const orig = btn.textContent
    btn.textContent = t('md.copied')
    setTimeout(() => { btn.textContent = orig }, 1500)
  })
}
</script>
