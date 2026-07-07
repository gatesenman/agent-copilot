<script setup lang="ts">
/**
 * ModeSelector —— Agent 运行模式选择器。
 * 对齐 Cursor/Claude Code 权限模型：变更前确认 / 自动编辑 / 计划模式 / 完全访问。
 * 支持受控（v-model:mode）；文案可经 labels/options 全量定制。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AgentMode, AgentModeOption } from '../../types'

const props = withDefaults(
  defineProps<{
    /** 当前模式（v-model:mode） */
    mode: AgentMode
    /** 可用模式（不传则四种全开） */
    availableModes?: AgentMode[]
    /** 自定义模式选项（覆盖默认文案/图标/说明） */
    options?: AgentModeOption[]
    /** 禁用（运行中等场景） */
    disabled?: boolean
    /** 尺寸 */
    size?: 'sm' | 'md'
    /** 菜单弹出方向：auto 根据视口空间自动翻转（默认），up 向上，down 向下 */
    placement?: 'auto' | 'up' | 'down'
    /** 是否在下拉菜单中显示模式描述与权限提示（关闭后为紧凑单行菜单） */
    showDescription?: boolean
  }>(),
  { size: 'md', placement: 'auto', showDescription: true },
)

const emit = defineEmits<{
  (e: 'update:mode', mode: AgentMode): void
}>()

const DEFAULT_OPTIONS: AgentModeOption[] = [
  {
    id: 'confirm_edits', label: '变更前确认',
    description: '每次文件变更都需要你审查确认后才应用',
    permissionHint: '最安全：所有写操作均需批准',
  },
  {
    id: 'auto_edit', label: '自动编辑',
    description: 'Agent 自动应用文件编辑，命令执行仍需确认',
    permissionHint: '写文件自动，执行命令需批准',
  },
  {
    id: 'plan', label: '计划模式',
    description: '先产出执行计划，批准后才开始动手',
    permissionHint: '只读分析，产出计划等待批准',
  },
  {
    id: 'full_access', label: '完全访问',
    description: 'Agent 自主执行所有操作，无需逐项确认',
    permissionHint: '风险最高：写文件与命令全自动',
  },
]

/** 内置字体图标（内联 SVG，零依赖）：自定义 options 传 icon 字符串时优先按原样渲染 */
const MODE_ICON_PATHS: Record<AgentMode, { d: string; fill?: boolean }> = {
  // 盾形对勾：审查确认
  confirm_edits: { d: 'M8 1.5 13.5 3.5v4c0 3.2-2.3 5.8-5.5 7-3.2-1.2-5.5-3.8-5.5-7v-4L8 1.5Z M5.5 7.8l1.8 1.8 3.2-3.4' },
  // 闪电：自动执行
  auto_edit: { d: 'M8.8 1.5 3.2 9h3.6l-1.6 5.5L11 7H7.4l1.4-5.5Z' },
  // 清单：计划模式
  plan: { d: 'M5.5 4h8M5.5 8h8M5.5 12h5.5M2.5 4h.01M2.5 8h.01M2.5 12h.01' },
  // 播放三角：完全访问自动运行
  full_access: { d: 'M4.5 3.2v9.6L12.8 8 4.5 3.2Z' },
}

function iconPath(id: AgentMode) {
  return MODE_ICON_PATHS[id] ?? MODE_ICON_PATHS.confirm_edits
}

const resolvedOptions = computed<AgentModeOption[]>(() => {
  const base = props.options ?? DEFAULT_OPTIONS
  if (!props.availableModes) return base
  return base.filter((o) => props.availableModes!.includes(o.id))
})

const current = computed(() => resolvedOptions.value.find((o) => o.id === props.mode) ?? resolvedOptions.value[0])

const open = ref(false)
const rootRef = ref<HTMLElement>()
const activeIndex = ref(0)
/** 实际弹出方向（placement=auto 时打开瞬间根据视口空间计算） */
const dropUp = ref(true)

/** 菜单预估高度：带描述 4 × 约 64px；紧凑单行 4 × 约 38px */
const menuEstHeight = computed(() => (props.showDescription ? 280 : 160))

function resolveDirection() {
  if (props.placement === 'up') { dropUp.value = true; return }
  if (props.placement === 'down') { dropUp.value = false; return }
  const rect = rootRef.value?.getBoundingClientRect()
  if (!rect) { dropUp.value = true; return }
  const spaceAbove = rect.top
  const spaceBelow = window.innerHeight - rect.bottom
  // 上方放得下则向上（输入区场景的默认习惯）；否则选空间更大的一侧
  dropUp.value = spaceAbove >= menuEstHeight.value || spaceAbove >= spaceBelow
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    resolveDirection()
    activeIndex.value = resolvedOptions.value.findIndex((o) => o.id === props.mode)
  }
}

function select(option: AgentModeOption) {
  emit('update:mode', option.id)
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') { open.value = false; e.stopPropagation() }
  else if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex.value = Math.min(activeIndex.value + 1, resolvedOptions.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex.value = Math.max(activeIndex.value - 1, 0) }
  else if (e.key === 'Enter') { e.preventDefault(); select(resolvedOptions.value[activeIndex.value]) }
}

function onOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onOutside))
</script>

<template>
  <div ref="rootRef" class="ac-mode" :class="[`ac-mode--${size}`]" @keydown="onKeydown">
    <button
      type="button"
      class="ac-mode__trigger"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-label="`当前模式：${current?.label}`"
      @click="toggle"
    >
      <span class="ac-mode__icon" aria-hidden="true">
        <template v-if="current?.icon">{{ current.icon }}</template>
        <svg v-else-if="current" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path :d="iconPath(current.id).d" />
        </svg>
      </span>
      <span class="ac-mode__label">{{ current?.label }}</span>
      <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div
      v-if="open"
      class="ac-mode__menu"
      :class="[dropUp ? 'ac-mode__menu--up' : 'ac-mode__menu--down', { 'ac-mode__menu--compact': !showDescription }]"
      role="listbox"
      aria-label="选择运行模式"
    >
      <button
        v-for="(opt, i) in resolvedOptions"
        :key="opt.id"
        type="button"
        role="option"
        class="ac-mode__item"
        :aria-selected="opt.id === mode"
        :class="{ 'ac-mode__item--active': i === activeIndex, 'ac-mode__item--current': opt.id === mode }"
        @mouseenter="activeIndex = i"
        @click="select(opt)"
      >
        <span class="ac-mode__item-head">
          <span class="ac-mode__icon" aria-hidden="true">
            <template v-if="opt.icon">{{ opt.icon }}</template>
            <svg v-else viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path :d="iconPath(opt.id).d" />
            </svg>
          </span>
          <span class="ac-mode__item-label">{{ opt.label }}</span>
          <svg v-if="opt.id === mode" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m3 8 3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span v-if="showDescription" class="ac-mode__item-desc">{{ opt.description }}</span>
        <span v-if="showDescription && opt.permissionHint" class="ac-mode__item-hint">{{ opt.permissionHint }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ac-mode { position: relative; display: inline-block; }
.ac-mode__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
  color: var(--ac-fg);
  border-radius: calc(var(--ac-radius) * 0.8);
  padding: 5px 10px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.15s;
}
.ac-mode--sm .ac-mode__trigger { padding: 3px 8px; font-size: 0.76rem; }
.ac-mode__trigger:hover:not(:disabled) { border-color: var(--ac-primary); }
.ac-mode__trigger:disabled { opacity: 0.55; cursor: not-allowed; }
.ac-mode__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  color: var(--ac-primary);
  font-size: 0.85em;
}
.ac-mode__menu {
  position: absolute;
  left: 0;
  width: 280px;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  box-shadow: 0 8px 30px rgb(0 0 0 / 0.14);
  z-index: 40;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ac-mode__menu--up { bottom: calc(100% + 6px); }
.ac-mode__menu--down { top: calc(100% + 6px); }
.ac-mode__menu--compact { width: 200px; }
.ac-mode__menu--compact .ac-mode__item { padding: 8px 12px; }
.ac-mode__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: var(--ac-fg);
  border-bottom: 1px solid var(--ac-border);
}
.ac-mode__item:last-child { border-bottom: none; }
.ac-mode__item--active { background: var(--ac-surface); }
.ac-mode__item--current .ac-mode__item-label { color: var(--ac-primary); }
.ac-mode__item-head { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.82rem; }
.ac-mode__item-head svg { margin-left: auto; color: var(--ac-primary); }
.ac-mode__item-desc { font-size: 0.76rem; color: var(--ac-muted); line-height: 1.45; }
.ac-mode__item-hint { font-size: 0.7rem; color: var(--ac-warning); }
</style>
