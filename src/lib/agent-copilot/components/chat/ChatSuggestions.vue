<template>
  <div v-if="suggestions.length || loading" class="ac-suggestions" role="group" aria-label="建议问题">
    <span v-if="loading" class="ac-suggestions__loading">
      <span class="ac-spin" /> 正在生成建议…
    </span>
    <button
      v-for="s in suggestions"
      :key="s.message"
      type="button"
      class="ac-suggestions__item"
      :title="s.message"
      @click="emit('select', s)"
    >
      {{ s.title }}
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * ChatSuggestions — 建议问题按钮组（对齐 CopilotKit useCopilotChatSuggestions）
 */
import type { ChatSuggestion } from '../../types'

withDefaults(
  defineProps<{
    suggestions: ChatSuggestion[]
    loading?: boolean
  }>(),
  { loading: false },
)

const emit = defineEmits<{
  (e: 'select', suggestion: ChatSuggestion): void
}>()
</script>

<style scoped>
.ac-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
}
.ac-suggestions__loading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  color: var(--ac-muted);
}
.ac-suggestions__item {
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
  color: var(--ac-fg);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 0.87em;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.ac-suggestions__item:hover {
  background: var(--ac-primary-soft);
  border-color: var(--ac-primary);
}
</style>
