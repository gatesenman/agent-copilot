<template>
  <div class="ac-popup">
    <Transition name="ac-popup">
      <div v-if="open" ref="windowRef" class="ac-popup__window" role="dialog" aria-modal="false" :aria-label="t('popup.dialogAria')">
        <CopilotChat
          :title="title"
          :subtitle="subtitle"
          :initial-message="initialMessage"
          :placeholder="placeholderText"
        >
          <template #header-actions>
            <button type="button" class="ac-popup__close" :aria-label="t('popup.closeAria')" @click="open = false">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
              </svg>
            </button>
          </template>
        </CopilotChat>
      </div>
    </Transition>

    <button
      type="button"
      class="ac-popup__fab"
      :aria-label="open ? t('popup.close') : t('popup.open')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg v-if="!open" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * CopilotPopup — 悬浮气泡形态（CopilotKit <CopilotPopup> 对齐）
 */
import { computed, ref } from 'vue'
import CopilotChat from './CopilotChat.vue'
import { useI18n } from '../../i18n'
import { useFocusTrap } from '../../composables/useFocusTrap'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    initialMessage?: string
    placeholder?: string
    defaultOpen?: boolean
  }>(),
  {
    title: '',
    subtitle: '',
    initialMessage: '',
    placeholder: undefined,
    defaultOpen: false,
  },
)

const { t } = useI18n()
const placeholderText = computed(() => props.placeholder ?? t('chat.inputPlaceholder'))

const open = ref(props.defaultOpen)
const windowRef = ref<HTMLElement | null>(null)

// 打开时聚焦对话窗口并圈定 Tab；Escape 关闭；关闭后焦点还原到触发按钮
useFocusTrap(windowRef, {
  active: () => open.value,
  onEscape: () => (open.value = false),
})

defineExpose({ open })
</script>

<style scoped>
.ac-popup {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}
.ac-popup__window {
  width: min(400px, calc(100vw - 40px));
  height: min(560px, calc(100vh - 120px));
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16);
  border-radius: var(--ac-radius);
}
.ac-popup__window > * {
  flex: 1;
  min-height: 0;
}
.ac-popup__fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s;
}
.ac-popup__fab:hover { transform: scale(1.05); }
.ac-popup__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: calc(var(--ac-radius) * 0.7);
  background: transparent;
  color: var(--ac-muted);
  cursor: pointer;
}
.ac-popup__close:hover {
  background: var(--ac-surface);
  color: var(--ac-fg);
}
.ac-popup-enter-active,
.ac-popup-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.ac-popup-enter-from,
.ac-popup-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
