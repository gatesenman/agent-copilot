<template>
  <div v-if="items.length > 0" class="ac-ctx" role="list" :aria-label="t('ctx.aria')">
    <span v-for="item in items" :key="item.id" class="ac-ctx__chip" role="listitem" :data-source="item.source">
      <span class="ac-ctx__tag" aria-hidden="true">{{ sourceTag(item) }}</span>
      <span class="ac-ctx__label">{{ item.label }}</span>
      <button
        type="button"
        class="ac-ctx__remove"
        :aria-label="t('ctx.removeAria', { label: item.label })"
        @click="emit('remove', item.id)"
      >×</button>
    </span>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ContextChips' })

/**
 * ContextChips — 输入框上方的上下文附着条
 * 展示 @提及 / #引用 / 手动附着 / 文件 的上下文项，可删除
 */
import { useI18n } from '../../i18n'
import type { ContextItem } from '../../types'

defineProps<{ items: ContextItem[] }>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'remove', id: string): void
}>()

function sourceTag(item: ContextItem): string {
  if (item.source === 'mention') return '@'
  if (item.source === 'reference') return '#'
  if (item.source === 'file') return '📎'
  return item.type?.slice(0, 1).toUpperCase() ?? '·'
}
</script>

<style scoped>
.ac-ctx {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px 0;
  background: var(--ac-bg);
}
.ac-ctx__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 4px 2px 8px;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-surface);
  font-size: 0.8em;
  max-width: 220px;
}
.ac-ctx__chip[data-source='mention'] { border-color: color-mix(in srgb, var(--ac-primary) 40%, var(--ac-border)); }
.ac-ctx__chip[data-source='reference'] { border-color: color-mix(in srgb, var(--ac-warning) 40%, var(--ac-border)); }
.ac-ctx__tag { font-weight: 700; color: var(--ac-primary); flex-shrink: 0; }
.ac-ctx__chip[data-source='reference'] .ac-ctx__tag { color: var(--ac-warning); }
.ac-ctx__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-ctx__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: none;
  color: var(--ac-muted);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
}
.ac-ctx__remove:hover { background: var(--ac-border); color: var(--ac-fg); }
</style>
