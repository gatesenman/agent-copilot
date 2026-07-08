<template>
  <aside
    class="ac-sidebar"
    :class="{ 'ac-sidebar--closed': !open }"
    :style="{ '--ac-sidebar-width': width }"
  >
    <button
      type="button"
      class="ac-sidebar__toggle"
      :aria-label="open ? t('sidebar.collapse') : t('sidebar.expand')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path :d="open ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div class="ac-sidebar__panel">
      <CopilotChat
        :title="title"
        :subtitle="subtitle"
        :initial-message="initialMessage"
        :placeholder="placeholderText"
      >
        <template #header-actions><slot name="header-actions" /></template>
      </CopilotChat>
    </div>
  </aside>
</template>

<script setup lang="ts">
/**
 * CopilotSidebar — 固定于视口右侧的抽屉形态（CopilotKit <CopilotSidebar> 对齐）。
 * 默认收起，仅显示边缘开关；展开后覆盖在页面内容之上，不参与文档流。
 */
import { computed, ref } from 'vue'
import CopilotChat from './CopilotChat.vue'
import { useI18n } from '../../i18n'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    initialMessage?: string
    placeholder?: string
    defaultOpen?: boolean
    width?: string
  }>(),
  {
    title: '',
    subtitle: '',
    initialMessage: '',
    placeholder: undefined,
    defaultOpen: false,
    width: '400px',
  },
)

const { t } = useI18n()
const placeholderText = computed(() => props.placeholder ?? t('chat.inputPlaceholder'))

const open = ref(props.defaultOpen)

defineExpose({ open })
</script>

<style scoped>
.ac-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  width: var(--ac-sidebar-width);
  max-width: 92vw;
  display: flex;
  transform: translateX(0);
  transition: transform 0.25s ease;
}
.ac-sidebar--closed {
  transform: translateX(100%);
}
.ac-sidebar__panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--ac-bg);
  border-left: 1px solid var(--ac-border);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
}
.ac-sidebar__panel > * {
  flex: 1;
  min-height: 0;
}
.ac-sidebar__toggle {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 56px;
  border: 1px solid var(--ac-border);
  border-right: none;
  border-radius: calc(var(--ac-radius) * 0.7) 0 0 calc(var(--ac-radius) * 0.7);
  background: var(--ac-surface);
  color: var(--ac-muted);
  cursor: pointer;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.06);
}
.ac-sidebar__toggle:hover {
  color: var(--ac-fg);
}
</style>
