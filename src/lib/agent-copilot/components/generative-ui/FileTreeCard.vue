<template>
  <div class="ac-card ac-treecard ac-slide-up">
    <div v-if="payload.title" class="ac-treecard__title">{{ payload.title }}</div>
    <ul class="ac-treecard__root">
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
/** FileTreeCard — file_tree 载荷：可折叠目录树（Code Agent） */
import { computed, defineComponent, h, ref, type PropType, type VNode } from 'vue'
import type { FileTreeNode, FileTreePayload, StructuredPayload } from '../../types'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<FileTreePayload>(() => (props.payload.data ?? { root: [] }) as FileTreePayload)

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
      const rowChildren = [
        h('span', { class: 'ac-tree__indent', style: { width: `${p.depth * 16}px` } }),
        h('span', { class: 'ac-tree__icon' }, isDir ? (open.value ? '▾' : '▸') : '·'),
        h('span', { class: ['ac-tree__name', isDir ? 'is-dir' : ''] }, p.node.name),
        p.node.badge ? h('span', { class: `ac-tree__badge is-${p.node.badge}` },
          p.node.badge === 'new' ? '新增' : p.node.badge === 'modified' ? '修改' : '删除') : null,
        p.node.comment ? h('span', { class: 'ac-tree__comment' }, p.node.comment) : null,
      ]
      const row = h('button', {
        type: 'button',
        class: 'ac-tree__row',
        onClick: () => { if (isDir) open.value = !open.value },
      }, rowChildren)

      const children: VNode | null = isDir && open.value && p.node.children?.length
        ? h('ul', { class: 'ac-tree__children' },
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
  padding: 8px 12px; font-weight: 600; font-size: 0.9em;
  background: var(--ac-surface); border-bottom: 1px solid var(--ac-border);
}
.ac-treecard__root { list-style: none; margin: 0; padding: 6px 8px; }
.ac-treecard :deep(.ac-tree__children) { list-style: none; margin: 0; padding: 0; }
.ac-treecard :deep(.ac-tree__item) { margin: 0; }
.ac-treecard :deep(.ac-tree__row) {
  display: flex; align-items: center; gap: 5px; width: 100%;
  border: 0; background: none; cursor: pointer;
  padding: 3px 6px; border-radius: 6px;
  font-size: 0.88em; color: var(--ac-fg); text-align: left;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
.ac-treecard :deep(.ac-tree__row:hover) { background: var(--ac-surface); }
.ac-treecard :deep(.ac-tree__indent) { flex: none; }
.ac-treecard :deep(.ac-tree__icon) { flex: none; width: 14px; color: var(--ac-muted); }
.ac-treecard :deep(.ac-tree__name.is-dir) { font-weight: 600; }
.ac-treecard :deep(.ac-tree__badge) {
  font-size: 0.78em; padding: 0 6px; border-radius: 999px; line-height: 1.6;
  font-family: inherit;
}
.ac-treecard :deep(.ac-tree__badge.is-new) { background: var(--ac-info-soft); color: var(--ac-success); }
.ac-treecard :deep(.ac-tree__badge.is-modified) { background: var(--ac-warn-soft); color: var(--ac-warn); }
.ac-treecard :deep(.ac-tree__badge.is-deleted) { background: var(--ac-danger-soft); color: var(--ac-danger); }
.ac-treecard :deep(.ac-tree__comment) { color: var(--ac-muted); font-size: 0.82em; margin-left: 4px; }
</style>
