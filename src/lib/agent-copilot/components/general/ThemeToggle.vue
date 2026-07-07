<script setup lang="ts">
/**
 * ThemeToggle —— 亮 / 暗 / 跟随系统 三态切换按钮组。
 * 配合 useTheme() 使用；也可通过 v-model:mode 完全受控。
 */
import { computed } from 'vue'
import type { ThemeMode } from '../../composables/useTheme'

const props = withDefaults(
  defineProps<{
    /** 当前模式（v-model:mode） */
    mode: ThemeMode
    /** 尺寸 */
    size?: 'sm' | 'md'
    /** 文案覆盖 */
    labels?: { light?: string; dark?: string; system?: string }
  }>(),
  { size: 'md', labels: () => ({}) },
)

const emit = defineEmits<{
  (e: 'update:mode', mode: ThemeMode): void
}>()

const options = computed(() => [
  { value: 'light' as const, label: props.labels.light ?? '亮色', icon: 'sun' },
  { value: 'dark' as const, label: props.labels.dark ?? '暗色', icon: 'moon' },
  { value: 'system' as const, label: props.labels.system ?? '系统', icon: 'auto' },
])
</script>

<template>
  <div class="ac-theme-toggle" :class="`ac-theme-toggle--${size}`" role="radiogroup" aria-label="主题模式">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      class="ac-theme-toggle__btn"
      :class="{ 'is-active': mode === opt.value }"
      :aria-checked="mode === opt.value"
      :title="opt.label"
      @click="emit('update:mode', opt.value)"
    >
      <svg v-if="opt.icon === 'sun'" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06M12.95 12.95l-1.06-1.06M4.11 4.11 3.05 3.05" stroke-linecap="round" />
      </svg>
      <svg v-else-if="opt.icon === 'moon'" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
        <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z" stroke-linejoin="round" />
      </svg>
      <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
        <rect x="1.5" y="3" width="13" height="9" rx="1.5" />
        <path d="M5.5 15h5" stroke-linecap="round" />
      </svg>
      <span class="ac-theme-toggle__label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.ac-theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--ac-border);
  border-radius: 8px;
  background: var(--ac-surface);
}
.ac-theme-toggle__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ac-muted);
  font-size: 12.5px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.ac-theme-toggle__btn:hover { color: var(--ac-fg); }
.ac-theme-toggle__btn.is-active {
  background: color-mix(in srgb, var(--ac-primary) 10%, transparent);
  color: var(--ac-primary);
  font-weight: 600;
}
.ac-theme-toggle--sm .ac-theme-toggle__btn { padding: 3px 7px; font-size: 12px; }
.ac-theme-toggle--sm .ac-theme-toggle__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.ac-theme-toggle--sm .ac-theme-toggle__btn { position: relative; }
</style>
