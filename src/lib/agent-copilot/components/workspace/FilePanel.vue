<script setup lang="ts">
/**
 * FilePanel —— 工作区文件面板：左侧文件树 + 右侧内容预览。
 *
 * 完全受数据驱动：files 由外部传入（WorkspaceFile 树）。
 * 支持受控（v-model:selectedPath）与非受控两种用法。
 */
import { computed, ref, watch } from 'vue'
import type { WorkspaceFile } from '../../types'

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
  }>(),
  {
    selectedPath: undefined,
    title: '文件',
    treeWidth: '180px',
    emptyText: '暂无文件',
    height: '100%',
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

/** 扁平化树用于渲染（带缩进层级） */
interface FlatNode { file: WorkspaceFile; depth: number }
const flatNodes = computed<FlatNode[]>(() => {
  const out: FlatNode[] = []
  const walk = (nodes: WorkspaceFile[], depth: number) => {
    for (const n of nodes) {
      out.push({ file: n, depth })
      if (n.kind === 'dir' && n.children && expanded.value.has(n.path)) {
        walk(n.children, depth + 1)
      }
    }
  }
  walk(props.files, 0)
  return out
})

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

function fileName(path: string): string {
  return path.split('/').pop() ?? path
}
</script>

<template>
  <div class="ac-fpanel" :style="{ height }">
    <div class="ac-fpanel__tree" :style="{ width: treeWidth }" role="tree" :aria-label="title">
      <div v-if="flatNodes.length === 0" class="ac-fpanel__empty">{{ emptyText }}</div>
      <button
        v-for="node in flatNodes"
        :key="node.file.path"
        type="button"
        class="ac-fpanel__node"
        role="treeitem"
        :aria-expanded="node.file.kind === 'dir' ? expanded.has(node.file.path) : undefined"
        :aria-selected="node.file.path === activePath"
        :class="{ 'ac-fpanel__node--active': node.file.path === activePath }"
        :style="{ paddingLeft: `${10 + node.depth * 14}px` }"
        @click="selectFile(node.file)"
      >
        <svg v-if="node.file.kind === 'dir'" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <path d="M1.5 4.5A1.5 1.5 0 0 1 3 3h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 6v6A1.5 1.5 0 0 1 13 13.5H3A1.5 1.5 0 0 1 1.5 12v-7.5Z" />
        </svg>
        <svg v-else viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <path d="M4 1.5h5L13 5.5v8A1.5 1.5 0 0 1 11.5 15h-7A1.5 1.5 0 0 1 3 13.5v-10A1.5 1.5 0 0 1 4 1.5Z" /><path d="M9 1.5V5.5H13" />
        </svg>
        <span class="ac-fpanel__name">{{ fileName(node.file.path) }}</span>
      </button>
    </div>

    <div class="ac-fpanel__preview">
      <template v-if="activeFile">
        <div class="ac-fpanel__preview-head">
          <span class="ac-fpanel__preview-path">{{ activeFile.path }}</span>
          <span v-if="activeFile.language" class="ac-badge">{{ activeFile.language }}</span>
        </div>
        <!-- 自定义预览 slot：可替换为 Markdown 渲染、图片等 -->
        <slot name="preview" :file="activeFile">
          <pre class="ac-fpanel__code"><code>{{ activeFile.content ?? '（无内容）' }}</code></pre>
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
.ac-fpanel__tree {
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--ac-border);
  background: var(--ac-surface);
  padding: 6px 0;
}
.ac-fpanel__empty { padding: 14px 12px; color: var(--ac-muted); font-size: 0.8rem; }
.ac-fpanel__node {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--ac-fg);
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
}
.ac-fpanel__node:hover { background: color-mix(in srgb, var(--ac-primary) 6%, transparent); }
.ac-fpanel__node--active { background: color-mix(in srgb, var(--ac-primary) 12%, transparent); color: var(--ac-primary); }
.ac-fpanel__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
.ac-fpanel__code {
  flex: 1;
  margin: 0;
  padding: 12px;
  overflow: auto;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre;
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
