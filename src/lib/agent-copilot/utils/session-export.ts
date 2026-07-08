/**
 * 会话导出 —— 把 ChatMessage[] 序列化为 Markdown / JSON 并触发浏览器下载。
 *
 * 独立纯函数，不依赖 store，可在任何拿到消息数组的场景使用：
 *   exportSession(messages, 'markdown')
 *   exportSession(messages, 'json', { filename: 'my-chat' })
 */
import type { ChatMessage, StructuredPayload } from '../types'

export type ExportFormat = 'markdown' | 'json'

export interface ExportOptions {
  /** 文件名（不含扩展名），默认 agent-session-<日期> */
  filename?: string
  /** 会话标题，写入 Markdown 头部 */
  title?: string
  /** 是否包含思考内容（thinking），默认 false */
  includeThinking?: boolean
}

const ROLE_LABEL: Record<string, string> = {
  user: '用户',
  assistant: '助手',
  system: '系统',
  tool: '工具',
}

/** 载荷 -> Markdown 片段（code/diff 内联，其余 JSON 代码块） */
function payloadToMarkdown(p: StructuredPayload): string {
  const title = p.title ? `**${p.title}**（${p.type}）` : `（${p.type}）`
  const d = p.data as any
  if (p.type === 'code' && d?.code) {
    return `${title}\n\n\`\`\`${d.language ?? ''}\n${d.code}\n\`\`\``
  }
  if (p.type === 'diff' && Array.isArray(d?.lines)) {
    const body = d.lines.map((l: any) => l.text).join('\n')
    return `${title}\n\n\`\`\`diff\n${body}\n\`\`\``
  }
  if (p.type === 'table' && Array.isArray(d?.columns) && Array.isArray(d?.rows)) {
    const header = `| ${d.columns.map((c: any) => c.label).join(' | ')} |`
    const sep = `| ${d.columns.map(() => '---').join(' | ')} |`
    const rows = d.rows
      .map((r: any) => `| ${d.columns.map((c: any) => String(r[c.key] ?? '')).join(' | ')} |`)
      .join('\n')
    return `${title}\n\n${header}\n${sep}\n${rows}`
  }
  let json: string
  try { json = JSON.stringify(p.data, null, 2) } catch { json = String(p.data) }
  return `${title}\n\n\`\`\`json\n${json}\n\`\`\``
}

/** 序列化为 Markdown 文本 */
export function sessionToMarkdown(messages: ChatMessage[], options: ExportOptions = {}): string {
  const parts: string[] = []
  parts.push(`# ${options.title ?? 'Agent 会话记录'}`)
  parts.push(`> 导出时间：${new Date().toLocaleString('zh-CN')} · 共 ${messages.length} 条消息`)
  for (const m of messages) {
    const time = new Date(m.createdAt).toLocaleTimeString('zh-CN')
    parts.push(`## ${ROLE_LABEL[m.role] ?? m.role} · ${time}`)
    if (options.includeThinking && m.thinking) {
      parts.push(`<details><summary>思考过程</summary>\n\n${m.thinking}\n\n</details>`)
    }
    if (m.content) parts.push(m.content)
    if (m.toolCalls?.length) {
      const lines = m.toolCalls.map((tc) =>
        `- \`${tc.name}\` — ${tc.label ?? ''} [${tc.status}]`)
      parts.push(`**工具调用**\n\n${lines.join('\n')}`)
    }
    for (const p of m.payloads ?? []) parts.push(payloadToMarkdown(p))
  }
  return parts.join('\n\n')
}

/** 序列化为 JSON 文本（保留完整结构，streaming 等瞬态字段清除） */
export function sessionToJson(messages: ChatMessage[], options: ExportOptions = {}): string {
  return JSON.stringify(
    {
      title: options.title ?? 'Agent 会话记录',
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({ ...m, streaming: undefined, queued: undefined })),
    },
    null,
    2,
  )
}

/** 触发浏览器下载 */
export function downloadText(text: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ============ 会话导入 ============

export interface ImportResult {
  ok: boolean
  messages: ChatMessage[]
  title?: string
  /** 校验失败原因（ok=false 时） */
  error?: string
}

/**
 * 从导出的 JSON 文本恢复会话消息。
 * 逐条校验必备字段（id/role/content/createdAt），坏条目跳过并计入 error 提示。
 */
export function importSessionJson(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, messages: [], error: '不是合法的 JSON 文本' }
  }
  const root = parsed as { title?: string; messages?: unknown }
  if (!Array.isArray(root?.messages)) {
    return { ok: false, messages: [], error: '缺少 messages 数组（需要 exportSession 的 JSON 格式）' }
  }
  const valid: ChatMessage[] = []
  let skipped = 0
  for (const raw of root.messages) {
    const m = raw as Partial<ChatMessage>
    if (typeof m?.id === 'string' && typeof m?.role === 'string' && typeof m?.content === 'string'
      && typeof m?.createdAt === 'number') {
      // 清除瞬态字段，防止导入后 UI 卡在流式态
      valid.push({ ...(m as ChatMessage), streaming: undefined, queued: undefined, error: undefined })
    } else {
      skipped++
    }
  }
  if (valid.length === 0) {
    return { ok: false, messages: [], error: `没有可恢复的消息（${skipped} 条格式不合法）` }
  }
  return {
    ok: true,
    messages: valid,
    title: typeof root.title === 'string' ? root.title : undefined,
    error: skipped > 0 ? `已跳过 ${skipped} 条格式不合法的消息` : undefined,
  }
}

/** 一步导出：序列化 + 下载 */
export function exportSession(
  messages: ChatMessage[],
  format: ExportFormat = 'markdown',
  options: ExportOptions = {},
) {
  const base = options.filename
    ?? `agent-session-${new Date().toISOString().slice(0, 10)}`
  if (format === 'json') {
    downloadText(sessionToJson(messages, options), `${base}.json`, 'application/json')
  } else {
    downloadText(sessionToMarkdown(messages, options), `${base}.md`, 'text/markdown')
  }
}
