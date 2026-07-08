<template>
  <div class="ac-card ac-treecard ac-slide-up">
    <div v-if="payload.title" class="ac-treecard__title">
      <span>{{ payload.title }}</span>
      <span class="ac-treecard__stats">{{ t('gencard.dirsFiles', { dirs: stats.dirs, files: stats.files }) }}</span>
    </div>
    <ul class="ac-treecard__root" role="tree">
      <FileTreeNodeItem
        v-for="(node, i) in data.root"
        :key="i"
        :node="node"
        :depth="0"
        :default-expanded="data.defaultExpanded !== false"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
/** FileTreeCard — file_tree 载荷：可折叠目录树（Code Agent），VS Code 风格图标与缩进参考线 */
import { computed, defineComponent, h, ref, type PropType, type VNode } from 'vue'
import { useI18n } from '../../i18n'
import type { FileTreeNode, FileTreePayload, StructuredPayload } from '../../types'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<FileTreePayload>(() => (props.payload.data ?? { root: [] }) as FileTreePayload)

const { t } = useI18n()

/** 树统计：目录数 / 文件数 */
const stats = computed(() => {
  let dirs = 0
  let files = 0
  const walk = (nodes: FileTreeNode[]) => {
    for (const n of nodes) {
      if (n.type === 'dir') { dirs++; if (n.children) walk(n.children) }
      else files++
    }
  }
  walk(data.value.root ?? [])
  return { dirs, files }
})

/** 按扩展名着色（与 FilePanel 保持一致的专业观感） */
const EXT_COLORS: Record<string, string> = {
  ts: '#3178c6', tsx: '#3178c6', js: '#e8a33d', jsx: '#e8a33d', vue: '#42b883',
  json: '#b7791f', md: '#519aba', css: '#9b7cc8', scss: '#c6538c', html: '#e34c26',
  py: '#3572a5', java: '#b07219', go: '#00add8', rs: '#dea584', sh: '#89e051',
  yml: '#cb4b16', yaml: '#cb4b16', sql: '#e38c00', svg: '#ffb13b', png: '#a074c4', txt: '#8a949e',
}

function extColor(name: string): string {
  const i = name.lastIndexOf('.')
  const ext = i > 0 ? name.slice(i + 1).toLowerCase() : ''
  return EXT_COLORS[ext] ?? 'var(--ac-muted)'
}

/** SVG 图标构造器 */
function svgIcon(paths: string[], size: number, stroke: string, extra: Record<string, string> = {}): VNode {
  return h('svg', {
    viewBox: '0 0 16 16', width: size, height: size, fill: 'none',
    stroke, 'stroke-width': '1.3', 'aria-hidden': 'true', ...extra,
  }, paths.map((d) => h('path', { d })))
}

const BADGE_TEXT = computed<Record<string, string>>(() => ({
  new: t('gencard.badgeNew'),
  modified: t('gencard.badgeModified'),
  deleted: t('gencard.badgeDeleted'),
}))

/** 递归节点（内联组件，避免额外文件）。显式标注类型以支持自引用。 */
const FileTreeNodeItem: ReturnType<typeof defineComponent> = defineComponent({
  name: 'FileTreeNodeItem',
  props: {
    node: { type: Object as PropType<FileTreeNode>, required: true },
    depth: { type: Number, required: true },
    defaultExpanded: { type: Boolean, default: true },
  },
  setup(p) {
    const open = ref(p.defaultExpanded)
    return (): VNode => {
      const isDir = p.node.type === 'dir'
      const childCount = p.node.children?.length ?? 0

      const rowChildren: (VNode | null)[] = [
        // 层级缩进参考线
        ...Array.from({ length: p.depth }, () => h('span', { class: 'ac-tree__guide', 'aria-hidden': 'true' })),
        // chevron：目录可旋转，文件占位对齐
        h('span', { class: ['ac-tree__chevron', open.value && isDir ? 'is-open' : ''] },
          isDir ? [svgIcon(['m6 4 4 4-4 4'], 10, 'currentColor', { 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })] : []),
        // 图标：目录开/合双态（琥珀色），文件按扩展名着色
        isDir
          ? (open.value
              ? svgIcon(['M1.5 5 3 3h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 6v1H4L2 13.5h-.5V5Z', 'M4 7h10.5L12.5 13.5H2L4 7Z'], 14, 'var(--ac-warn, #d29922)', { class: 'ac-tree__ficon' })
              : svgIcon(['M1.5 4.5A1.5 1.5 0 0 1 3 3h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 6v6A1.5 1.5 0 0 1 13 13.5H3A1.5 1.5 0 0 1 1.5 12v-7.5Z'], 14, 'var(--ac-warn, #d29922)', { class: 'ac-tree__ficon' }))
          : svgIcon(['M4 1.5h5L13 5.5v8A1.5 1.5 0 0 1 11.5 15h-7A1.5 1.5 0 0 1 3 13.5v-10A1.5 1.5 0 0 1 4 1.5Z', 'M9 1.5V5.5H13'], 13, extColor(p.node.name), { class: 'ac-tree__ficon' }),
        h('span', { class: ['ac-tree__name', isDir ? 'is-dir' : '', p.node.badge === 'deleted' ? 'is-deleted' : ''] }, p.node.name),
        p.node.badge ? h('span', { class: `ac-tree__badge is-${p.node.badge}` }, BADGE_TEXT.value[p.node.badge] ?? p.node.badge) : null,
        p.node.comment ? h('span', { class: 'ac-tree__comment' }, p.node.comment) : null,
        isDir && childCount ? h('span', { class: 'ac-tree__count' }, String(childCount)) : null,
      ]
      const row = h('button', {
        type: 'button',
        class: 'ac-tree__row',
        role: 'treeitem',
        'aria-expanded': isDir ? String(open.value) : undefined,
        'aria-level': p.depth + 1,
        onClick: () => { if (isDir) open.value = !open.value },
      }, rowChildren)

      const children: VNode | null = isDir && open.value && p.node.children?.length
        ? h('ul', { class: 'ac-tree__children', role: 'group' },
            p.node.children.map((c, i): VNode => h(FileTreeNodeItem, { node: c, depth: p.depth + 1, defaultExpanded: p.defaultExpanded, key: i })))
        : null

      return h('li', { class: 'ac-tree__item' }, [row, children])
    }
  },
})
</script>

<style scoped>
.ac-treecard { margin: 6px 0; padding: 4px 0; }
.ac-treecard__title {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 12px; font-weight: 600; font-size: 0.9em;
  background: var(--ac-surface); border-bottom: 1px solid var(--ac-border);
}
.ac-treecard__stats {
  font-weight: 400; font-size: 0.82em; color: var(--ac-muted);
  font-variant-numeric: tabular-nums;
}
.ac-treecard__root { list-style: none; margin: 0; padding: 6px 8px; }
.ac-treecard :deep(.ac-tree__children) { list-style: none; margin: 0; padding: 0; }
.ac-treecard :deep(.ac-tree__item) { margin: 0; }
.ac-treecard :deep(.ac-tree__row) {
  display: flex; align-items: center; width: 100%;
  border: 0; background: none; cursor: pointer;
  padding: 3px 6px 3px 4px; border-radius: 6px;
  font-size: 0.88em; color: var(--ac-fg); text-align: left;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  line-height: 1.5;
}
.ac-treecard :deep(.ac-tree__row:hover) { background: var(--ac-surface); }
.ac-treecard :deep(.ac-tree__row:focus-visible) { outline: 1px solid var(--ac-primary); outline-offset: -1px; }
/* 缩进参考线 */
.ac-treecard :deep(.ac-tree__guide) {
  flex: none; align-self: stretch; width: 14px;
  border-right: 1px solid color-mix(in srgb, var(--ac-border) 80%, transparent);
  margin-right: -1px;
}
.ac-treecard :deep(.ac-tree__chevron) {
  flex: none; width: 14px; display: inline-flex; align-items: center; justify-content: center;
  color: var(--ac-muted); transition: transform 0.13s ease;
}
.ac-treecard :deep(.ac-tree__chevron.is-open) { transform: rotate(90deg); }
.ac-treecard :deep(.ac-tree__ficon) { flex: none; margin-right: 5px; }
.ac-treecard :deep(.ac-tree__name.is-dir) { font-weight: 600; }
.ac-treecard :deep(.ac-tree__name.is-deleted) { text-decoration: line-through; opacity: 0.6; }
.ac-treecard :deep(.ac-tree__badge) {
  flex: none; margin-left: 6px;
  font-size: 0.78em; padding: 0 6px; border-radius: 999px; line-height: 1.6;
  font-family: inherit;
}
.ac-treecard :deep(.ac-tree__badge.is-new) { background: var(--ac-info-soft); color: var(--ac-success); }
.ac-treecard :deep(.ac-tree__badge.is-modified) { background: var(--ac-warn-soft); color: var(--ac-warn); }
.ac-treecard :deep(.ac-tree__badge.is-deleted) { background: var(--ac-danger-soft); color: var(--ac-danger); }
.ac-treecard :deep(.ac-tree__comment) { color: var(--ac-muted); font-size: 0.82em; margin-left: 6px; }
.ac-treecard :deep(.ac-tree__count) {
  margin-left: auto; padding-left: 8px; color: var(--ac-muted);
  font-size: 0.76em; font-variant-numeric: tabular-nums;
}
</style>
