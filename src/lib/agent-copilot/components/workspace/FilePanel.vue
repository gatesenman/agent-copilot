<script setup lang="ts">
/**
 * FilePanel —— 工作区文件面板：左侧文件树 + 右侧内容预览。
 *
 * 专业树交互（对标 VS Code 资源管理器）：
 * - 目录优先 + 字母序排序；chevron 旋转动画；目录开/合双态图标
 * - 按扩展名着色的文件类型图标；层级缩进参考线
 * - 键盘导航：↑↓ 移动、→ 展开/进入、← 收起/回父级、Enter 选中、Home/End
 * - 文件名过滤框（匹配时自动展开命中路径）
 * - 预览头部：路径 + 语言徽标 + 行数统计 + 一键复制
 *
 * 完全受数据驱动：files 由外部传入（WorkspaceFile 树）。
 * 支持受控（v-model:selectedPath）与非受控两种用法。
 */
import { computed, nextTick, ref, watch } from 'vue'
import type { WorkspaceFile } from '../../types'
import { copyText } from '../../utils/clipboard'

const props = withDefaults(
  defineProps<{
    /** 文件树数据 */
    files: WorkspaceFile[]
    /** 受控选中路径（可选） */
    selectedPath?: string
    /** 面板标题 */
    title?: string
    /** 树区宽度 */
    treeWidth?: string
    /** 空状态文案 */
    emptyText?: string
    /** 高度（CSS 值） */
    height?: string
    /** 是否显示过滤框 */
    filterable?: boolean
  }>(),
  {
    selectedPath: undefined,
    title: '文件',
    treeWidth: '200px',
    emptyText: '暂无文件',
    height: '100%',
    filterable: true,
  },
)

const emit = defineEmits<{
  (e: 'update:selectedPath', path: string): void
  (e: 'select', file: WorkspaceFile): void
}>()

/** 非受控内部状态 */
const innerSelected = ref<string | null>(null)
const activePath = computed(() => props.selectedPath ?? innerSelected.value)

const expanded = ref<Set<string>>(new Set())
const filter = ref('')
const treeEl = ref<HTMLElement | null>(null)

/** 默认展开第一层目录 */
watch(
  () => props.files,
  (files) => {
    for (const f of files) if (f.kind === 'dir') expanded.value.add(f.path)
  },
  { immediate: true },
)

function toggleDir(path: string) {
  if (expanded.value.has(path)) expanded.value.delete(path)
  else expanded.value.add(path)
  expanded.value = new Set(expanded.value)
}

function selectFile(file: WorkspaceFile) {
  if (file.kind === 'dir') { toggleDir(file.path); return }
  innerSelected.value = file.path
  emit('update:selectedPath', file.path)
  emit('select', file)
}

/** 目录优先 + 名称字母序（带数字感知） */
function sortNodes(nodes: WorkspaceFile[]): WorkspaceFile[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return fileName(a.path).localeCompare(fileName(b.path), undefined, { numeric: true, sensitivity: 'base' })
  })
}

/** 过滤命中判断：节点自身或后代命中 */
function matches(node: WorkspaceFile, q: string): boolean {
  if (fileName(node.path).toLowerCase().includes(q)) return true
  return node.kind === 'dir' && !!node.children?.some((c) => matches(c, q))
}

/** 扁平化树用于渲染（带缩进层级；过滤时自动展开命中路径） */
interface FlatNode { file: WorkspaceFile; depth: number; hasChildren: boolean }
const flatNodes = computed<FlatNode[]>(() => {
  const q = filter.value.trim().toLowerCase()
  const out: FlatNode[] = []
  const walk = (nodes: WorkspaceFile[], depth: number) => {
    for (const n of sortNodes(nodes)) {
      if (q && !matches(n, q)) continue
      out.push({ file: n, depth, hasChildren: n.kind === 'dir' && !!n.children?.length })
      const open = q ? true : expanded.value.has(n.path)
      if (n.kind === 'dir' && n.children && open) walk(n.children, depth + 1)
    }
  }
  walk(props.files, 0)
  return out
})

/** ============ 键盘导航（roving tabindex） ============ */
const focusIdx = ref(0)

watch(flatNodes, (nodes) => {
  if (focusIdx.value >= nodes.length) focusIdx.value = Math.max(0, nodes.length - 1)
})

function focusRow(idx: number) {
  focusIdx.value = Math.max(0, Math.min(idx, flatNodes.value.length - 1))
  nextTick(() => {
    const btn = treeEl.value?.querySelectorAll<HTMLButtonElement>('.ac-fpanel__node')[focusIdx.value]
    btn?.focus()
    btn?.scrollIntoView({ block: 'nearest' })
  })
}

function onTreeKeydown(e: KeyboardEvent) {
  const nodes = flatNodes.value
  if (!nodes.length) return
  const cur = nodes[focusIdx.value]
  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); focusRow(focusIdx.value + 1); break
    case 'ArrowUp': e.preventDefault(); focusRow(focusIdx.value - 1); break
    case 'Home': e.preventDefault(); focusRow(0); break
    case 'End': e.preventDefault(); focusRow(nodes.length - 1); break
    case 'ArrowRight':
      e.preventDefault()
      if (cur.file.kind === 'dir' && !expanded.value.has(cur.file.path)) toggleDir(cur.file.path)
      else if (cur.file.kind === 'dir') focusRow(focusIdx.value + 1)
      break
    case 'ArrowLeft':
      e.preventDefault()
      if (cur.file.kind === 'dir' && expanded.value.has(cur.file.path)) toggleDir(cur.file.path)
      else {
        // 回到父级目录行
        for (let i = focusIdx.value - 1; i >= 0; i--) {
          if (nodes[i].depth < cur.depth) { focusRow(i); break }
        }
      }
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      selectFile(cur.file)
      break
  }
}

/** ============ 文件类型图标着色 ============ */
const EXT_COLORS: Record<string, string> = {
  ts: '#3178c6', tsx: '#3178c6', js: '#e8a33d', jsx: '#e8a33d', vue: '#42b883',
  json: '#b7791f', md: '#519aba', css: '#9b7cc8', scss: '#c6538c', html: '#e34c26',
  py: '#3572a5', java: '#b07219', go: '#00add8', rs: '#dea584', sh: '#89e051',
  yml: '#cb4b16', yaml: '#cb4b16', sql: '#e38c00', svg: '#ffb13b', png: '#a074c4', txt: '#8a949e',
}

function extOf(path: string): string {
  const name = fileName(path)
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

function iconColor(file: WorkspaceFile): string {
  return EXT_COLORS[extOf(file.path)] ?? 'var(--ac-muted)'
}

/** 查找当前选中文件 */
const activeFile = computed<WorkspaceFile | null>(() => {
  if (!activePath.value) return null
  let found: WorkspaceFile | null = null
  const walk = (nodes: WorkspaceFile[]) => {
    for (const n of nodes) {
      if (n.path === activePath.value) { found = n; return }
      if (n.children) walk(n.children)
    }
  }
  walk(props.files)
  return found
})

/** 预览元信息：行数 / 字符数 */
const activeMeta = computed(() => {
  const c = activeFile.value?.content
  if (!c) return null
  return { lines: c.split('\n').length, chars: c.length }
})

const copied = ref(false)
async function copyContent() {
  if (!activeFile.value?.content) return
  if (await copyText(activeFile.value.content)) {
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  }
}

function fileName(path: string): string {
  return path.split('/').pop() ?? path
}
</script>

<template>
  <div class="ac-fpanel" :style="{ height }">
    <div class="ac-fpanel__side" :style="{ width: treeWidth }">
      <div v-if="filterable" class="ac-fpanel__filter">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" stroke-linecap="round" />
        </svg>
        <input
          v-model="filter"
          type="text"
          class="ac-fpanel__filter-input"
          placeholder="筛选文件…"
          aria-label="筛选文件"
        />
        <button v-if="filter" type="button" class="ac-fpanel__filter-clear" aria-label="清除筛选" @click="filter = ''">×</button>
      </div>

      <div ref="treeEl" class="ac-fpanel__tree" role="tree" :aria-label="title" @keydown="onTreeKeydown">
        <div v-if="flatNodes.length === 0" class="ac-fpanel__empty">
          {{ filter ? '无匹配文件' : emptyText }}
        </div>
        <button
          v-for="(node, idx) in flatNodes"
          :key="node.file.path"
          type="button"
          class="ac-fpanel__node"
          role="treeitem"
          :tabindex="idx === focusIdx ? 0 : -1"
          :aria-expanded="node.file.kind === 'dir' ? expanded.has(node.file.path) : undefined"
          :aria-selected="node.file.path === activePath"
          :aria-level="node.depth + 1"
          :class="{ 'ac-fpanel__node--active': node.file.path === activePath }"
          @click="focusIdx = idx; selectFile(node.file)"
          @focus="focusIdx = idx"
        >
          <!-- 缩进参考线 -->
          <span v-for="d in node.depth" :key="d" class="ac-fpanel__guide" aria-hidden="true" />

          <!-- 目录 chevron（占位对齐文件行） -->
          <span class="ac-fpanel__chevron" :class="{ 'is-open': node.file.kind === 'dir' && (filter ? true : expanded.has(node.file.path)) }" aria-hidden="true">
            <svg v-if="node.file.kind === 'dir'" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 4 4 4-4 4" />
            </svg>
          </span>

          <!-- 目录开/合双态 or 按类型着色的文件图标 -->
          <svg v-if="node.file.kind === 'dir' && (filter ? true : expanded.has(node.file.path))" class="ac-fpanel__ficon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--ac-warn, #d29922)" stroke-width="1.3" aria-hidden="true">
            <path d="M1.5 5 3 3h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 6v1H4L2 13.5h-.5V5Z" /><path d="M4 7h10.5L12.5 13.5H2L4 7Z" />
          </svg>
          <svg v-else-if="node.file.kind === 'dir'" class="ac-fpanel__ficon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--ac-warn, #d29922)" stroke-width="1.3" aria-hidden="true">
            <path d="M1.5 4.5A1.5 1.5 0 0 1 3 3h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 6v6A1.5 1.5 0 0 1 13 13.5H3A1.5 1.5 0 0 1 1.5 12v-7.5Z" />
          </svg>
          <svg v-else class="ac-fpanel__ficon" viewBox="0 0 16 16" width="13" height="13" fill="none" :stroke="iconColor(node.file)" stroke-width="1.3" aria-hidden="true">
            <path d="M4 1.5h5L13 5.5v8A1.5 1.5 0 0 1 11.5 15h-7A1.5 1.5 0 0 1 3 13.5v-10A1.5 1.5 0 0 1 4 1.5Z" /><path d="M9 1.5V5.5H13" />
          </svg>

          <span class="ac-fpanel__name">{{ fileName(node.file.path) }}</span>
          <span v-if="node.file.kind === 'dir' && node.file.children?.length" class="ac-fpanel__count">{{ node.file.children.length }}</span>
        </button>
      </div>
    </div>

    <div class="ac-fpanel__preview">
      <template v-if="activeFile">
        <div class="ac-fpanel__preview-head">
          <span class="ac-fpanel__preview-path" :title="activeFile.path">
            <template v-for="(seg, i) in activeFile.path.split('/')" :key="i">
              <span v-if="i > 0" class="ac-fpanel__crumb-sep">›</span>
              <span :class="{ 'ac-fpanel__crumb-leaf': i === activeFile.path.split('/').length - 1 }">{{ seg }}</span>
            </template>
          </span>
          <span class="ac-fpanel__preview-meta">
            <span v-if="activeMeta" class="ac-fpanel__meta-item">{{ activeMeta.lines }} 行</span>
            <span v-if="activeFile.language" class="ac-badge">{{ activeFile.language }}</span>
            <button type="button" class="ac-fpanel__copy" :class="{ 'is-copied': copied }" @click="copyContent">
              {{ copied ? '已复制' : '复制' }}
            </button>
          </span>
        </div>
        <!-- 自定义预览 slot：可替换为 Markdown 渲染、图片等 -->
        <slot name="preview" :file="activeFile">
          <div class="ac-fpanel__code-wrap">
            <pre class="ac-fpanel__code"><code><span v-for="(line, i) in (activeFile.content ?? '（无内容）').split('\n')" :key="i" class="ac-fpanel__line"><span class="ac-fpanel__ln" aria-hidden="true">{{ i + 1 }}</span>{{ line }}
</span></code></pre>
          </div>
        </slot>
      </template>
      <div v-else class="ac-fpanel__placeholder">
        <slot name="placeholder">选择文件查看内容</slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ac-fpanel {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-bg);
  font-size: 0.84rem;
}
.ac-fpanel__side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--ac-border);
  background: var(--ac-surface);
}
.ac-fpanel__filter {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 6px 2px;
  padding: 0 8px;
  border: 1px solid var(--ac-border);
  border-radius: 6px;
  background: var(--ac-bg);
  color: var(--ac-muted);
}
.ac-fpanel__filter:focus-within { border-color: var(--ac-primary); }
.ac-fpanel__filter-input {
  flex: 1;
  min-width: 0;
  padding: 5px 0;
  border: none;
  background: transparent;
  color: var(--ac-fg);
  font-size: 0.78rem;
  outline: none;
}
.ac-fpanel__filter-clear {
  border: none;
  background: transparent;
  color: var(--ac-muted);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0 2px;
}
.ac-fpanel__filter-clear:hover { color: var(--ac-fg); }
.ac-fpanel__tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 6px;
}
.ac-fpanel__empty { padding: 14px 12px; color: var(--ac-muted); font-size: 0.8rem; }
.ac-fpanel__node {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  padding: 3px 8px 3px 6px;
  border: none;
  background: transparent;
  color: var(--ac-fg);
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
  line-height: 1.5;
}
.ac-fpanel__node:hover { background: color-mix(in srgb, var(--ac-primary) 6%, transparent); }
.ac-fpanel__node:focus-visible {
  outline: 1px solid var(--ac-primary);
  outline-offset: -1px;
}
.ac-fpanel__node--active {
  background: color-mix(in srgb, var(--ac-primary) 12%, transparent);
  color: var(--ac-primary);
}
/* 缩进参考线：每层一条竖线（VS Code 风格） */
.ac-fpanel__guide {
  flex: none;
  align-self: stretch;
  width: 14px;
  border-right: 1px solid color-mix(in srgb, var(--ac-border) 80%, transparent);
  margin-right: -1px;
}
.ac-fpanel__chevron {
  flex: none;
  width: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ac-muted);
  transition: transform 0.13s ease;
}
.ac-fpanel__chevron.is-open { transform: rotate(90deg); }
.ac-fpanel__ficon { flex: none; margin-right: 5px; }
.ac-fpanel__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-fpanel__count {
  margin-left: auto;
  padding-left: 6px;
  color: var(--ac-muted);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}
.ac-fpanel__preview { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
.ac-fpanel__preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--ac-border);
  background: var(--ac-surface);
}
.ac-fpanel__preview-path {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.76rem;
  color: var(--ac-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-fpanel__crumb-sep { margin: 0 3px; opacity: 0.55; }
.ac-fpanel__crumb-leaf { color: var(--ac-fg); font-weight: 600; }
.ac-fpanel__preview-meta {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ac-fpanel__meta-item {
  color: var(--ac-muted);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}
.ac-fpanel__copy {
  padding: 2px 9px;
  border: 1px solid var(--ac-border);
  border-radius: 6px;
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.72rem;
  cursor: pointer;
}
.ac-fpanel__copy:hover { border-color: var(--ac-primary); color: var(--ac-primary); }
.ac-fpanel__copy.is-copied { color: var(--ac-success, #2da44e); border-color: var(--ac-success, #2da44e); }
.ac-fpanel__code-wrap { flex: 1; min-height: 0; overflow: auto; }
.ac-fpanel__code {
  margin: 0;
  padding: 10px 0;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre;
}
.ac-fpanel__line { display: block; padding-right: 14px; }
.ac-fpanel__line:hover { background: color-mix(in srgb, var(--ac-primary) 4%, transparent); }
.ac-fpanel__ln {
  display: inline-block;
  width: 3.2em;
  padding-right: 1.1em;
  color: var(--ac-muted);
  text-align: right;
  user-select: none;
  opacity: 0.65;
}
.ac-fpanel__placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ac-muted);
  font-size: 0.82rem;
}
</style>
