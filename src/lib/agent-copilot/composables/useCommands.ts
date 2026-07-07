/**
 * useCommands — 输入命令系统（/ 斜杠命令、@ 提及、# 引用）
 *
 * 职责：
 * - 监测输入文本中的触发符（行首或空白后的 / @ #）
 * - 过滤候选（斜杠命令本地过滤；提及/引用走 provider，可异步）
 * - 键盘导航状态（activeIndex）
 * - 选中后回写文本 / 产生 ContextItem
 */
import { computed, ref, watch, type Ref } from 'vue'
import type { ContextItem, MentionItem, MentionProvider, SlashCommand } from '../types'
import type { PaletteItem } from '../components/input/CommandPalette.vue'

export type TriggerKind = 'slash' | 'mention' | 'reference'

interface ActiveTrigger {
  kind: TriggerKind
  /** 触发符在文本中的位置 */
  start: number
  /** 触发符后的查询词 */
  query: string
}

export interface UseCommandsOptions {
  commands: Ref<SlashCommand[]>
  mentionProvider?: MentionProvider
  referenceProvider?: MentionProvider
}

const TRIGGER_CHARS: Record<string, TriggerKind> = { '/': 'slash', '@': 'mention', '#': 'reference' }
const HEADINGS: Record<TriggerKind, string> = { slash: '命令', mention: '提及', reference: '引用' }

let ctxSeq = 0

export function useCommands(text: Ref<string>, caretPos: Ref<number>, options: UseCommandsOptions) {
  const trigger = ref<ActiveTrigger | null>(null)
  const items = ref<PaletteItem[]>([])
  const activeIndex = ref(0)
  /** 异步 provider 竞态保护 */
  let fetchSeq = 0

  /** 从文本 + 光标位置解析当前触发状态 */
  function detectTrigger() {
    const pos = caretPos.value
    const before = text.value.slice(0, pos)
    // 从光标向前找最近的触发符，且触发符必须在行首或空白之后
    for (let i = before.length - 1; i >= 0; i--) {
      const ch = before[i]
      if (ch === '\n' || ch === ' ') break
      const kind = TRIGGER_CHARS[ch]
      if (kind) {
        const prev = i > 0 ? before[i - 1] : '\n'
        if (prev === ' ' || prev === '\n') {
          // 斜杠命令仅在消息开头触发（对齐主流 IM 习惯）
          if (kind === 'slash' && i !== 0) return null
          return { kind, start: i, query: before.slice(i + 1, pos) } satisfies ActiveTrigger
        }
        return null
      }
    }
    return null
  }

  async function refresh() {
    const t = detectTrigger()
    trigger.value = t
    if (!t) { items.value = []; return }

    if (t.kind === 'slash') {
      const q = t.query.toLowerCase()
      items.value = options.commands.value
        .filter((c) => c.name.toLowerCase().includes(q) || c.description.includes(t.query))
        .slice(0, 12)
        .map((c) => ({
          id: c.name, label: `/${c.name}`, description: c.description,
          icon: c.icon, hint: c.hint, type: 'command', raw: c,
        }))
    } else {
      const provider = t.kind === 'mention' ? options.mentionProvider : options.referenceProvider
      if (!provider) { items.value = []; return }
      const seq = ++fetchSeq
      try {
        const result = await provider(t.query)
        if (seq !== fetchSeq) return // 已有更新的请求
        items.value = result.slice(0, 12).map((m) => ({
          id: m.id, label: m.label, description: m.description, type: m.type ?? (t.kind === 'mention' ? 'person' : 'doc'), raw: m,
        }))
      } catch {
        if (seq === fetchSeq) items.value = []
      }
    }
    activeIndex.value = 0
  }

  watch([text, caretPos], refresh)

  const visible = computed(() => trigger.value !== null && items.value.length > 0)
  const heading = computed(() => (trigger.value ? HEADINGS[trigger.value.kind] : ''))

  function moveActive(delta: number) {
    const n = items.value.length
    if (n === 0) return
    activeIndex.value = (activeIndex.value + delta + n) % n
  }

  /**
   * 应用选中项。
   * 返回：
   * - slash/template: 新文本（替换触发段）
   * - slash/action|send: 特殊指令给调用方
   * - mention/reference: 新文本 + 生成的 ContextItem
   */
  function applySelection(item: PaletteItem): {
    newText?: string
    contextItem?: ContextItem
    execute?: SlashCommand
    sendNow?: string
  } {
    const t = trigger.value
    if (!t) return {}
    const after = text.value.slice(caretPos.value)

    if (t.kind === 'slash') {
      const cmd = item.raw as SlashCommand
      const mode = cmd.mode ?? 'template'
      if (mode === 'action') return { newText: after.trimStart(), execute: cmd }
      if (mode === 'send') return { newText: '', sendNow: cmd.template ?? `/${cmd.name}` }
      return { newText: (cmd.template ?? `/${cmd.name} `) + after }
    }

    const m = item.raw as MentionItem
    const tag = t.kind === 'mention' ? '@' : '#'
    const newText = text.value.slice(0, t.start) + `${tag}${m.label} ` + after
    const contextItem: ContextItem = {
      id: `ctx_${Date.now()}_${ctxSeq++}`,
      source: t.kind === 'mention' ? 'mention' : 'reference',
      label: m.label,
      type: m.type,
      data: m.data,
    }
    return { newText, contextItem }
  }

  function dismiss() {
    trigger.value = null
    items.value = []
  }

  return { visible, items, activeIndex, heading, moveActive, applySelection, dismiss }
}
