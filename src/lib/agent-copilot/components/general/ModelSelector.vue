<script setup lang="ts">
/**
 * ModelSelector — 模型/厂商切换下拉（两级分组）
 *
 * 读 PROVIDER_PRESETS 分组展示（模型协议 / Agent 框架 / 互操作协议）。
 * 两级面板：左列分组导航（hover / 方向键切换），右列该组模型项，
 * 避免单列长滚动列表；触发器紧凑（仅当前项名，超宽省略）。
 * 支持 v-model 双向绑定 provider id，宿主拿到后重建 CopilotProvider 配置。
 */
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { listProviderPresets } from '../../protocols/presets'
import type { ProviderPreset } from '../../protocols/types'
import { useI18n } from '../../i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: string
  /** 限定可选 provider（缺省全部预设） */
  providers?: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'change', preset: ProviderPreset): void
}>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const all = computed(() => {
  const presets = listProviderPresets()
  return props.providers ? presets.filter((p) => props.providers!.includes(p.id)) : presets
})

/** 一级：按协议类别分组 */
const groups = computed(() => {
  const modelProtocols = ['openai-compatible', 'anthropic', 'gemini', 'ollama-native', 'cohere']
  const interop = ['a2a', 'acp', 'openai-assistants']
  const g: { label: string; items: ProviderPreset[] }[] = [
    { label: t('model.groupModel'), items: [] },
    { label: t('model.groupAgent'), items: [] },
    { label: t('model.groupInterop'), items: [] },
  ]
  for (const p of all.value) {
    if (modelProtocols.includes(p.protocol)) g[0].items.push(p)
    else if (interop.includes(p.protocol)) g[2].items.push(p)
    else g[1].items.push(p)
  }
  return g.filter((x) => x.items.length > 0)
})

const current = computed(() => all.value.find((p) => p.id === props.modelValue))

/** 二级：活跃分组索引（打开时定位到当前所选项所在组） */
const activeGroup = ref(0)
watch(open, (v) => {
  if (!v) return
  const idx = groups.value.findIndex((g) => g.items.some((p) => p.id === props.modelValue))
  activeGroup.value = idx >= 0 ? idx : 0
})

const activeItems = computed(() => groups.value[activeGroup.value]?.items ?? [])

function select(p: ProviderPreset) {
  emit('update:modelValue', p.id)
  emit('change', p)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
}
function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') { open.value = false; return }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    activeGroup.value = (activeGroup.value + dir + groups.value.length) % groups.value.length
  }
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="rootEl" class="ac-model-sel">
    <button
      type="button"
      class="ac-model-sel__trigger"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :title="current ? `${current.label}${current.defaultModel ? ' · ' + current.defaultModel : ''}` : modelValue"
      @click="open = !open"
    >
      <span class="ac-model-sel__label">{{ current?.label ?? modelValue }}</span>
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </button>

    <div v-if="open" class="ac-model-sel__menu" role="listbox" :aria-label="t('model.select')">
      <!-- 一级：分组导航列 -->
      <div class="ac-model-sel__nav" role="tablist" :aria-label="t('model.groupsAria')">
        <button
          v-for="(g, i) in groups"
          :key="g.label"
          type="button"
          role="tab"
          class="ac-model-sel__nav-item"
          :class="{ 'ac-model-sel__nav-item--active': i === activeGroup }"
          :aria-selected="i === activeGroup"
          @click="activeGroup = i"
          @mouseenter="activeGroup = i"
        >
          <span class="ac-model-sel__nav-label">{{ g.label }}</span>
          <span class="ac-model-sel__nav-meta">
            <span class="ac-model-sel__nav-count">{{ g.items.length }}</span>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 4 4 4-4 4" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
        </button>
      </div>

      <!-- 二级：活跃分组的模型项 -->
      <div class="ac-model-sel__panel">
        <button
          v-for="p in activeItems"
          :key="p.id"
          type="button"
          role="option"
          class="ac-model-sel__item"
          :aria-selected="p.id === modelValue"
          :class="{ 'ac-model-sel__item--active': p.id === modelValue }"
          @click="select(p)"
        >
          <span class="ac-model-sel__item-main">
            <span class="ac-model-sel__item-label">{{ p.label }}</span>
            <span v-if="p.defaultModel" class="ac-model-sel__item-model">{{ p.defaultModel }}</span>
          </span>
          <svg v-if="p.id === modelValue" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ac-model-sel { position: relative; display: inline-block; }
.ac-model-sel__trigger {
  display: inline-flex; align-items: center; gap: 6px;
  max-width: 180px;
  padding: 5px 10px; border: 1px solid var(--ac-border); border-radius: calc(var(--ac-radius) * 0.7);
  background: var(--ac-bg); color: var(--ac-fg); cursor: pointer; font-size: 0.82rem;
}
.ac-model-sel__trigger:hover:not(:disabled) { border-color: var(--ac-primary); }
.ac-model-sel__trigger:disabled { opacity: 0.5; cursor: default; }
.ac-model-sel__label { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-model-sel__trigger svg { flex-shrink: 0; }

.ac-model-sel__menu {
  position: absolute; bottom: calc(100% + 4px); left: 0; z-index: 40;
  /* 固定高度：切换一级分组时二级条目数不同，若用 max-height 会导致
     向上弹出的菜单整体高度跳变（闪烁）。溢出交给二级面板垂直滚动。 */
  display: flex; width: 380px; height: 300px;
  background: var(--ac-bg); border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius); box-shadow: 0 8px 24px rgb(0 0 0 / 0.14);
  overflow: hidden;
}

/* 一级导航列 */
.ac-model-sel__nav {
  display: flex; flex-direction: column; gap: 1px;
  width: 132px; flex-shrink: 0; padding: 4px;
  background: var(--ac-surface); border-right: 1px solid var(--ac-border);
  overflow-y: auto;
}
.ac-model-sel__nav-item {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  padding: 8px 8px 8px 10px; border: none; background: transparent;
  border-radius: 6px; cursor: pointer; font-size: 0.78rem; color: var(--ac-fg); text-align: left;
}
.ac-model-sel__nav-item:hover { background: color-mix(in srgb, var(--ac-primary) 6%, transparent); }
.ac-model-sel__nav-item--active { background: var(--ac-bg); color: var(--ac-primary); font-weight: 600; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
.ac-model-sel__nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-model-sel__nav-meta { display: inline-flex; align-items: center; gap: 3px; color: var(--ac-muted); flex-shrink: 0; }
.ac-model-sel__nav-count { font-size: 0.68rem; padding: 1px 5px; border-radius: 999px; background: color-mix(in srgb, var(--ac-muted) 14%, transparent); }

/* 二级项面板 */
.ac-model-sel__panel { flex: 1; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 1px; }
.ac-model-sel__item {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 7px 10px; border: none; background: transparent;
  border-radius: 6px; cursor: pointer; font-size: 0.82rem; color: var(--ac-fg); text-align: left;
}
.ac-model-sel__item:hover { background: var(--ac-surface); }
.ac-model-sel__item--active { background: color-mix(in srgb, var(--ac-primary) 10%, transparent); color: var(--ac-primary); font-weight: 600; }
.ac-model-sel__item-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ac-model-sel__item-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-model-sel__item-model { font-size: 0.7rem; color: var(--ac-muted); font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-model-sel__item svg { flex-shrink: 0; }
</style>
