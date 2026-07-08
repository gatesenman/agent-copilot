<script setup lang="ts">
/**
 * TerminalPanel —— 终端面板（真实终端能力，非仅样式）：
 *
 * - ANSI SGR 解析：out/err 文本中的 \x1b[..m 颜色/粗体/暗淡序列解析为着色 span
 * - 命令历史：↑/↓ 翻阅本会话已执行命令（去重，Esc 退出翻阅恢复草稿）
 * - 快捷键：Ctrl+C 发 interrupt（运行中中断 / 空闲清行）、Ctrl+L 清屏
 * - 智能滚动：贴底时跟随输出，向上翻阅时锁定并显示"回到底部"浮标
 * - 退出码：cmd 条目带 exitCode 非零时显示失败标记
 * - busy 态：命令执行中输入行显示 spinner，提交排队禁用
 * - 复制：一键复制全部输出为纯文本（自动剥离 ANSI）
 *
 * 数据驱动：entries 由外部传入（store.terminal 或自管理数组）。
 * interactive 开启后底部显示命令输入行，回车触发 command 事件。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from '../../i18n'
import type { TerminalEntry } from '../../types'
import { copyText } from '../../utils/clipboard'

const props = withDefaults(
  defineProps<{
    /** 清空按钮文案 */
    clearLabel?: string
    /** 终端条目流 */
    entries: TerminalEntry[]
    /** 标题 */
    title?: string
    /** 提示符 */
    prompt?: string
    /** 可交互（显示输入行） */
    interactive?: boolean
    /** 自动滚动到底部（贴底跟随；用户上翻时自动锁定） */
    autoScroll?: boolean
    /** 高度（CSS 值） */
    height?: string
    /** 空状态文案 */
    emptyText?: string
    /** 输入占位 */
    inputPlaceholder?: string
    /** 命令执行中（输入行显示 spinner；Ctrl+C 触发 interrupt） */
    busy?: boolean
    /** 当前工作目录（头部展示） */
    cwd?: string
  }>(),
  {
    title: undefined,
    prompt: '$',
    interactive: false,
    autoScroll: true,
    height: '260px',
    emptyText: undefined,
    inputPlaceholder: undefined,
    busy: false,
  },
)

const { t } = useI18n()

const titleText = computed(() => props.title ?? t('term.title'))
const emptyTextResolved = computed(() => props.emptyText ?? t('term.empty'))
const inputPlaceholderResolved = computed(() => props.inputPlaceholder ?? t('term.inputPlaceholder'))

const emit = defineEmits<{
  (e: 'command', cmd: string): void
  (e: 'clear'): void
  /** Ctrl+C（busy 时请求中断当前命令） */
  (e: 'interrupt'): void
}>()

// ============ ANSI SGR 解析 ============

interface AnsiSpan {
  text: string
  /** CSS class 列表（颜色/粗体/暗淡） */
  cls: string[]
}

const ANSI_FG: Record<number, string> = {
  30: 'black', 31: 'red', 32: 'green', 33: 'yellow',
  34: 'blue', 35: 'magenta', 36: 'cyan', 37: 'white',
  90: 'bright-black', 91: 'bright-red', 92: 'bright-green', 93: 'bright-yellow',
  94: 'bright-blue', 95: 'bright-magenta', 96: 'bright-cyan', 97: 'bright-white',
}

/* eslint-disable no-control-regex */
const ANSI_RE = /\x1b\[([0-9;]*)m/g
const ANSI_STRIP_RE = /\x1b\[[0-9;]*m/g
/* eslint-enable no-control-regex */

/** 把含 ANSI SGR 序列的文本解析为着色 span 数组（不支持的序列静默剥离） */
function parseAnsi(text: string): AnsiSpan[] {
  if (!text.includes('\x1b[')) return [{ text, cls: [] }]
  const spans: AnsiSpan[] = []
  let fg = ''
  let bold = false
  let dim = false
  let lastIndex = 0
  ANSI_RE.lastIndex = 0
  let m: RegExpExecArray | null = ANSI_RE.exec(text)
  while (m !== null) {
    if (m.index > lastIndex) {
      const cls: string[] = []
      if (fg) cls.push(`ansi-${fg}`)
      if (bold) cls.push('ansi-bold')
      if (dim) cls.push('ansi-dim')
      spans.push({ text: text.slice(lastIndex, m.index), cls })
    }
    for (const raw of (m[1] || '0').split(';')) {
      const code = Number(raw || '0')
      if (code === 0) { fg = ''; bold = false; dim = false }
      else if (code === 1) bold = true
      else if (code === 2) dim = true
      else if (code === 22) { bold = false; dim = false }
      else if (code === 39) fg = ''
      else if (ANSI_FG[code]) fg = ANSI_FG[code]
    }
    lastIndex = m.index + m[0].length
    m = ANSI_RE.exec(text)
  }
  if (lastIndex < text.length) {
    const cls: string[] = []
    if (fg) cls.push(`ansi-${fg}`)
    if (bold) cls.push('ansi-bold')
    if (dim) cls.push('ansi-dim')
    spans.push({ text: text.slice(lastIndex), cls })
  }
  return spans
}

const parsedEntries = computed(() =>
  props.entries.map((entry) => ({
    ...entry,
    spans: entry.kind === 'out' || entry.kind === 'err' ? parseAnsi(entry.text) : null,
  })),
)

// ============ 智能滚动：贴底跟随，上翻锁定 ============

const bodyRef = ref<HTMLElement | null>(null)
/** 用户是否已上翻离开底部（锁定自动滚动） */
const scrolledUp = ref(false)

function onBodyScroll() {
  const el = bodyRef.value
  if (!el) return
  scrolledUp.value = el.scrollHeight - el.scrollTop - el.clientHeight > 24
}

function scrollToBottom(smooth = false) {
  const el = bodyRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  scrolledUp.value = false
}

watch(
  () => props.entries.length,
  async () => {
    if (!props.autoScroll || scrolledUp.value) return
    await nextTick()
    scrollToBottom()
  },
)

// ============ 命令历史（↑/↓ 翻阅，Esc 恢复草稿） ============

const input = ref('')
const history = ref<string[]>([])
/** -1 = 未翻阅；否则为 history 下标（从末尾往前） */
const historyPos = ref(-1)
/** 进入翻阅前的草稿 */
let draftBeforeHistory = ''

function navigateHistory(dir: -1 | 1) {
  if (history.value.length === 0) return
  if (historyPos.value === -1) {
    if (dir === 1) return
    draftBeforeHistory = input.value
    historyPos.value = history.value.length - 1
  } else {
    const next = historyPos.value + dir
    if (next >= history.value.length) {
      historyPos.value = -1
      input.value = draftBeforeHistory
      return
    }
    if (next < 0) return
    historyPos.value = next
  }
  input.value = history.value[historyPos.value] ?? ''
}

function exitHistory() {
  if (historyPos.value === -1) return
  historyPos.value = -1
  input.value = draftBeforeHistory
}

// ============ 输入与快捷键 ============

function submit() {
  const cmd = input.value.trim()
  if (!cmd || props.busy) return
  // 内置命令：clear 本地清屏（同时通知宿主）
  if (cmd === 'clear') {
    emit('clear')
  } else {
    emit('command', cmd)
  }
  // 历史去重：与上一条相同不重复入栈
  if (history.value[history.value.length - 1] !== cmd) history.value.push(cmd)
  historyPos.value = -1
  input.value = ''
  scrollToBottom()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') { e.preventDefault(); navigateHistory(-1); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); navigateHistory(1); return }
  if (e.key === 'Escape') { exitHistory(); return }
  if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
    e.preventDefault()
    if (props.busy) emit('interrupt')
    else { input.value = ''; historyPos.value = -1 }
    return
  }
  if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); emit('clear') }
}

// ============ 复制输出 ============

const copied = ref(false)

async function copyAll() {
  const text = props.entries
    .map((en) => (en.kind === 'cmd' ? `${props.prompt} ${en.text}` : en.text.replace(ANSI_STRIP_RE, '')))
    .join('\n')
  if (await copyText(text)) {
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  }
}
</script>

<template>
  <div class="ac-term" :style="{ height }" role="log" :aria-label="titleText">
    <div class="ac-term__head">
      <span class="ac-term__dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="ac-term__title">{{ titleText }}<span v-if="cwd" class="ac-term__cwd"> — {{ cwd }}</span></span>
      <button type="button" class="ac-term__tool" :aria-label="copied ? t('common.copied') : t('term.copyAll')" @click="copyAll">
        {{ copied ? t('common.copied') : t('common.copy') }}
      </button>
      <button type="button" class="ac-term__tool" :aria-label="t('term.clearAria')" @click="emit('clear')">{{ clearLabel ?? t('chat.clear') }}</button>
    </div>
    <div ref="bodyRef" class="ac-term__body" @scroll.passive="onBodyScroll">
      <div v-if="entries.length === 0" class="ac-term__empty">{{ emptyTextResolved }}</div>
      <div
        v-for="entry in parsedEntries"
        :key="entry.id"
        class="ac-term__line"
        :class="`ac-term__line--${entry.kind}`"
      >
        <span v-if="entry.kind === 'cmd'" class="ac-term__prompt">{{ prompt }}</span>
        <span class="ac-term__text">
          <template v-if="entry.spans">
            <span v-for="(sp, i) in entry.spans" :key="i" :class="sp.cls">{{ sp.text }}</span>
          </template>
          <template v-else>{{ entry.text }}</template>
        </span>
        <span
          v-if="entry.kind === 'cmd' && entry.exitCode !== undefined && entry.exitCode !== 0"
          class="ac-term__exit"
          :title="`退出码 ${entry.exitCode}`"
        >✕ {{ entry.exitCode }}</span>
      </div>
    </div>
    <button
      v-if="scrolledUp"
      type="button"
      class="ac-term__resume"
      aria-label="回到底部并恢复跟随"
      @click="scrollToBottom(true)"
    >
      ↓ 回到底部
    </button>
    <form v-if="interactive" class="ac-term__input-row" @submit.prevent="submit">
      <span v-if="!busy" class="ac-term__prompt">{{ prompt }}</span>
      <span v-else class="ac-term__spinner" aria-label="命令执行中" />
      <input
        v-model="input"
        class="ac-term__input"
        :placeholder="busy ? '命令执行中… Ctrl+C 中断' : inputPlaceholder"
        :aria-label="inputPlaceholder"
        spellcheck="false"
        autocomplete="off"
        @keydown="onKeydown"
      />
    </form>
  </div>
</template>

<style scoped>
.ac-term {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: #0d1117;
  color: #e6edf3;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.78rem;
}
.ac-term__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgb(255 255 255 / 0.06);
  border-bottom: 1px solid rgb(255 255 255 / 0.08);
}
.ac-term__dots { display: inline-flex; gap: 5px; }
.ac-term__dots i { width: 9px; height: 9px; border-radius: 50%; background: rgb(255 255 255 / 0.22); }
.ac-term__dots i:nth-child(1) { background: #ff5f57; }
.ac-term__dots i:nth-child(2) { background: #febc2e; }
.ac-term__dots i:nth-child(3) { background: #28c840; }
.ac-term__title { flex: 1; font-size: 0.74rem; color: rgb(230 237 243 / 0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-term__cwd { color: rgb(230 237 243 / 0.38); }
.ac-term__tool {
  border: none;
  background: transparent;
  color: rgb(230 237 243 / 0.5);
  font-size: 0.72rem;
  cursor: pointer;
  padding: 2px 6px;
  flex-shrink: 0;
}
.ac-term__tool:hover { color: #e6edf3; }
.ac-term__body { flex: 1; overflow-y: auto; padding: 10px 12px; }
.ac-term__empty { color: rgb(230 237 243 / 0.4); }
.ac-term__line { display: flex; gap: 8px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
.ac-term__line--cmd { color: #7ee787; }
.ac-term__line--err { color: #ff7b72; }
.ac-term__line--info { color: #79c0ff; }
.ac-term__prompt { color: #7ee787; user-select: none; flex-shrink: 0; }
.ac-term__exit {
  flex-shrink: 0;
  align-self: center;
  font-size: 0.68rem;
  color: #ff7b72;
  border: 1px solid rgb(255 123 114 / 0.4);
  border-radius: 4px;
  padding: 0 5px;
  user-select: none;
}
.ac-term__resume {
  position: absolute;
  right: 14px;
  bottom: 44px;
  border: 1px solid rgb(255 255 255 / 0.15);
  border-radius: 999px;
  background: rgb(22 27 34 / 0.92);
  color: #e6edf3;
  font-size: 0.72rem;
  font-family: inherit;
  padding: 4px 12px;
  cursor: pointer;
}
.ac-term__resume:hover { background: rgb(48 54 61 / 0.95); }
.ac-term__input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-top: 1px solid rgb(255 255 255 / 0.08);
}
.ac-term__input {
  flex: 1;
  border: none;
  background: transparent;
  color: #e6edf3;
  font-family: inherit;
  font-size: inherit;
  outline: none;
}
.ac-term__input::placeholder { color: rgb(230 237 243 / 0.35); }
.ac-term__spinner {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  border: 1.5px solid rgb(230 237 243 / 0.25);
  border-top-color: #7ee787;
  border-radius: 50%;
  animation: ac-term-spin 0.7s linear infinite;
}
@keyframes ac-term-spin { to { transform: rotate(360deg) } }

/* ---- ANSI 颜色（GitHub Dark 调色板） ---- */
.ansi-black { color: #484f58; }
.ansi-red { color: #ff7b72; }
.ansi-green { color: #3fb950; }
.ansi-yellow { color: #d29922; }
.ansi-blue { color: #58a6ff; }
.ansi-magenta { color: #bc8cff; }
.ansi-cyan { color: #39c5cf; }
.ansi-white { color: #b1bac4; }
.ansi-bright-black { color: #6e7681; }
.ansi-bright-red { color: #ffa198; }
.ansi-bright-green { color: #56d364; }
.ansi-bright-yellow { color: #e3b341; }
.ansi-bright-blue { color: #79c0ff; }
.ansi-bright-magenta { color: #d2a8ff; }
.ansi-bright-cyan { color: #56d4dd; }
.ansi-bright-white { color: #f0f6fc; }
.ansi-bold { font-weight: 700; }
.ansi-dim { opacity: 0.6; }
</style>
