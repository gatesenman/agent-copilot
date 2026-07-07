<template>
  <div v-if="visible && items.length > 0" class="ac-palette ac-slide-up" role="listbox" :aria-label="ariaLabel">
    <div class="ac-palette__head">{{ heading }}</div>
    <button
      v-for="(item, i) in items"
      :key="item.id"
      type="button"
      class="ac-palette__item"
      :class="{ 'is-active': i === activeIndex }"
      role="option"
      :aria-selected="i === activeIndex"
      @click="emit('select', item)"
      @mouseenter="emit('hover', i)"
    >
      <span class="ac-palette__icon" :data-type="item.type" aria-hidden="true">{{ item.icon ?? typeInitial(item.type) }}</span>
      <span class="ac-palette__body">
        <span class="ac-palette__label">
          {{ item.label }}
          <span v-if="item.hint" class="ac-palette__hint">{{ item.hint }}</span>
        </span>
        <span v-if="item.description" class="ac-palette__desc">{{ item.description }}</span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * CommandPalette — / @ # 三类触发共用的浮层命令面板
 * 由 ChatInput 控制显隐、过滤与键盘导航（↑↓ Enter Esc）
 */

export interface PaletteItem {
  id: string
  label: string
  description?: string
  icon?: string
  hint?: string
  type?: string
  /** 原始数据（SlashCommand 或 MentionItem） */
  raw: unknown
}

withDefaults(
  defineProps<{
    visible: boolean
    items: PaletteItem[]
    activeIndex: number
    heading: string
    ariaLabel?: string
  }>(),
  { ariaLabel: '命令面板' },
)

const emit = defineEmits<{
  (e: 'select', item: PaletteItem): void
  (e: 'hover', index: number): void
}>()

function typeInitial(type?: string): string {
  const map: Record<string, string> = {
    person: '人', agent: 'A', entity: 'E', doc: '文', dataset: '数', command: '/',
  }
  return map[type ?? ''] ?? (type?.slice(0, 1).toUpperCase() ?? '·')
}
</script>

<style scoped>
.ac-palette {
  position: absolute;
  bottom: 100%;
  left: 12px;
  right: 12px;
  margin-bottom: 6px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.08);
  z-index: 30;
  display: flex;
  flex-direction: column;
  padding: 4px;
}
.ac-palette__head {
  padding: 6px 10px 4px;
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ac-muted);
}
.ac-palette__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: none;
  border-radius: calc(var(--ac-radius) * 0.6);
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--ac-fg);
  font: inherit;
}
.ac-palette__item.is-active { background: var(--ac-surface); }
.ac-palette__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--ac-surface);
  border: 1px solid var(--ac-border);
  font-size: 11px;
  font-weight: 700;
  color: var(--ac-primary);
  flex-shrink: 0;
}
.ac-palette__icon[data-type='person'] { color: var(--ac-success); }
.ac-palette__icon[data-type='doc'], .ac-palette__icon[data-type='dataset'] { color: var(--ac-warning); }
.ac-palette__body { display: flex; flex-direction: column; min-width: 0; }
.ac-palette__label { font-size: 0.92em; font-weight: 600; display: flex; gap: 6px; align-items: baseline; }
.ac-palette__hint { font-weight: 400; color: var(--ac-muted); font-size: 0.88em; }
.ac-palette__desc {
  font-size: 0.8em;
  color: var(--ac-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
