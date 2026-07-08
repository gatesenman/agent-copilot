<script setup lang="ts">
/**
 * SettingsDialog —— 常规设置弹框。
 *
 * Schema 驱动：sections 定义分组与字段（switch/select/radio/slider/text），
 * v-model:values 双向绑定设置值。无任何写死业务字段，完全由外部配置。
 */
import { computed, ref } from 'vue'
import { useI18n } from '../../i18n'
import { useFocusTrap } from '../../composables/useFocusTrap'

export interface SettingField {
  key: string
  label: string
  type: 'switch' | 'select' | 'radio' | 'slider' | 'text'
  description?: string
  options?: { label: string; value: string | number }[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

export interface SettingSection {
  id: string
  title: string
  fields: SettingField[]
}

const props = withDefaults(
  defineProps<{
    /** 显示（v-model:open） */
    open: boolean
    /** 设置分组 schema */
    sections: SettingSection[]
    /** 当前值（v-model:values） */
    values: Record<string, unknown>
    title?: string
    /** 底部按钮文案 */
    labels?: { close?: string; reset?: string }
    /** 显示重置按钮 */
    showReset?: boolean
  }>(),
  { title: undefined, showReset: false },
)

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
  (e: 'update:values', values: Record<string, unknown>): void
  (e: 'change', key: string, value: unknown): void
  (e: 'reset'): void
}>()

const { t } = useI18n()

const titleText = computed(() => props.title ?? t('settings.title'))

const L = computed(() => ({
  close: props.labels?.close ?? t('settings.close'),
  reset: props.labels?.reset ?? t('settings.reset'),
}))

function setValue(key: string, value: unknown) {
  emit('update:values', { ...props.values, [key]: value })
  emit('change', key, value)
}

function close() {
  emit('update:open', false)
}

const panelRef = ref<HTMLElement | null>(null)

// 焦点圈定 + Escape 关闭 + 关闭后焦点还原到触发元素
useFocusTrap(panelRef, {
  active: () => props.open,
  onEscape: close,
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ac-settings" role="dialog" aria-modal="true" :aria-label="titleText">
      <div class="ac-settings__mask" @click="close" />
      <div ref="panelRef" class="ac-settings__panel ac-root">
        <header class="ac-settings__head">
          <h2 class="ac-settings__title">{{ titleText }}</h2>
          <button type="button" class="ac-settings__x" :aria-label="t('common.close')" @click="close">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="m3 3 10 10M13 3 3 13" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="ac-settings__body ac-scroll">
          <section v-for="section in sections" :key="section.id" class="ac-settings__section">
            <h3 class="ac-settings__section-title">{{ section.title }}</h3>
            <div v-for="field in section.fields" :key="field.key" class="ac-settings__row">
              <div class="ac-settings__meta">
                <label :for="`ac-set-${field.key}`" class="ac-settings__label">{{ field.label }}</label>
                <p v-if="field.description" class="ac-settings__desc">{{ field.description }}</p>
              </div>

              <!-- switch -->
              <button
                v-if="field.type === 'switch'"
                :id="`ac-set-${field.key}`"
                type="button"
                role="switch"
                class="ac-settings__switch"
                :aria-checked="Boolean(values[field.key])"
                :class="{ 'ac-settings__switch--on': Boolean(values[field.key]) }"
                @click="setValue(field.key, !values[field.key])"
              >
                <span class="ac-settings__knob" />
              </button>

              <!-- select -->
              <select
                v-else-if="field.type === 'select'"
                :id="`ac-set-${field.key}`"
                class="ac-settings__select"
                :value="String(values[field.key] ?? '')"
                @change="setValue(field.key, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="opt in field.options" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
              </select>

              <!-- radio 组 -->
              <div v-else-if="field.type === 'radio'" class="ac-settings__radios" role="radiogroup" :aria-label="field.label">
                <button
                  v-for="opt in field.options"
                  :key="String(opt.value)"
                  type="button"
                  role="radio"
                  class="ac-settings__radio"
                  :aria-checked="values[field.key] === opt.value"
                  :class="{ 'ac-settings__radio--on': values[field.key] === opt.value }"
                  @click="setValue(field.key, opt.value)"
                >{{ opt.label }}</button>
              </div>

              <!-- slider -->
              <div v-else-if="field.type === 'slider'" class="ac-settings__slider-wrap">
                <input
                  :id="`ac-set-${field.key}`"
                  type="range"
                  class="ac-settings__slider"
                  :min="field.min ?? 0"
                  :max="field.max ?? 100"
                  :step="field.step ?? 1"
                  :value="Number(values[field.key] ?? field.min ?? 0)"
                  @input="setValue(field.key, Number(($event.target as HTMLInputElement).value))"
                />
                <span class="ac-settings__slider-val">{{ values[field.key] }}</span>
              </div>

              <!-- text -->
              <input
                v-else
                :id="`ac-set-${field.key}`"
                type="text"
                class="ac-settings__text"
                :placeholder="field.placeholder"
                :value="String(values[field.key] ?? '')"
                @input="setValue(field.key, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </section>
        </div>

        <footer class="ac-settings__foot">
          <button v-if="showReset" type="button" class="ac-btn ac-btn--ghost ac-btn--sm" @click="emit('reset')">{{ L.reset }}</button>
          <button type="button" class="ac-btn ac-btn--primary ac-btn--sm" @click="close">{{ L.close }}</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ac-settings { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; }
.ac-settings__mask { position: absolute; inset: 0; background: rgb(0 0 0 / 0.4); }
.ac-settings__panel {
  position: relative;
  width: min(560px, calc(100vw - 32px));
  max-height: min(640px, calc(100vh - 64px));
  display: flex;
  flex-direction: column;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.25);
  overflow: hidden;
}
.ac-settings__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--ac-border);
}
.ac-settings__title { margin: 0; font-size: 1rem; font-weight: 700; }
.ac-settings__x {
  border: none;
  background: transparent;
  color: var(--ac-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
}
.ac-settings__x:hover { color: var(--ac-fg); background: var(--ac-surface); }
.ac-settings__body { flex: 1; overflow-y: auto; padding: 6px 18px 14px; }
.ac-settings__section { margin-top: 14px; }
.ac-settings__section-title {
  margin: 0 0 4px;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ac-muted);
}
.ac-settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--ac-border);
}
.ac-settings__section .ac-settings__row:last-child { border-bottom: none; }
.ac-settings__meta { flex: 1; min-width: 0; }
.ac-settings__label { font-size: 0.88rem; font-weight: 500; }
.ac-settings__desc { margin: 2px 0 0; font-size: 0.76rem; color: var(--ac-muted); }
.ac-settings__switch {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid var(--ac-border);
  background: var(--ac-surface);
  cursor: pointer;
  transition: background 0.18s;
  flex-shrink: 0;
}
.ac-settings__switch--on { background: var(--ac-primary); border-color: var(--ac-primary); }
.ac-settings__knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ac-bg, #fff);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);
  transition: transform 0.18s;
}
.ac-settings__switch--on .ac-settings__knob { transform: translateX(16px); }
.ac-settings__select,
.ac-settings__text {
  padding: 6px 10px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.6);
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.84rem;
  max-width: 200px;
}
.ac-settings__radios { display: flex; gap: 4px; flex-wrap: wrap; }
.ac-settings__radio {
  padding: 4px 12px;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-bg);
  color: var(--ac-muted);
  font-size: 0.8rem;
  cursor: pointer;
}
.ac-settings__radio--on {
  background: color-mix(in srgb, var(--ac-primary) 12%, transparent);
  border-color: var(--ac-primary);
  color: var(--ac-primary);
  font-weight: 600;
}
.ac-settings__slider-wrap { display: flex; align-items: center; gap: 10px; }
.ac-settings__slider { accent-color: var(--ac-primary); width: 140px; }
.ac-settings__slider-val { font-size: 0.8rem; color: var(--ac-muted); min-width: 2.5em; text-align: right; }
.ac-settings__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--ac-border);
  background: var(--ac-surface);
}
</style>
