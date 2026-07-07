/**
 * useFocusTrap — 弹层焦点管理（企业级无障碍基础设施）
 *
 * 能力：
 *  - Tab / Shift+Tab 焦点圈定在容器内（focus trap）
 *  - Escape 触发关闭回调
 *  - 激活时自动聚焦首个可聚焦元素（或 [data-autofocus] 标记元素）
 *  - 停用时将焦点还原到触发元素（focus restore）
 *
 * 用法：
 *   const containerRef = ref<HTMLElement | null>(null)
 *   useFocusTrap(containerRef, {
 *     active: () => props.open,
 *     onEscape: () => emit('close'),
 *   })
 */
import { nextTick, onBeforeUnmount, watch } from 'vue'
import type { Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface UseFocusTrapOptions {
  /** 是否激活（响应式 getter） */
  active: () => boolean
  /** Escape 键回调（通常用于关闭弹层） */
  onEscape?: () => void
  /** 激活时是否自动聚焦，默认 true。优先聚焦 [data-autofocus] 元素 */
  autoFocus?: boolean
  /** 停用时是否还原焦点到激活前的元素，默认 true */
  restoreFocus?: boolean
}

export function useFocusTrap(
  containerRef: Ref<HTMLElement | null>,
  options: UseFocusTrapOptions,
) {
  const { active, onEscape, autoFocus = true, restoreFocus = true } = options
  let previouslyFocused: HTMLElement | null = null
  let listening = false

  function focusables(): HTMLElement[] {
    const el = containerRef.value
    if (!el) return []
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (n) => n.offsetParent !== null || n === document.activeElement,
    )
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && onEscape) {
      e.stopPropagation()
      onEscape()
      return
    }
    if (e.key !== 'Tab') return
    const list = focusables()
    if (list.length === 0) {
      e.preventDefault()
      return
    }
    const first = list[0]
    const last = list[list.length - 1]
    const current = document.activeElement as HTMLElement | null
    // 焦点在容器外（如刚打开）：拉回容器
    if (!containerRef.value?.contains(current)) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
      return
    }
    if (e.shiftKey && current === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && current === last) {
      e.preventDefault()
      first.focus()
    }
  }

  async function activate() {
    if (listening) return
    previouslyFocused = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeydown, true)
    listening = true
    if (autoFocus) {
      await nextTick()
      const el = containerRef.value
      if (!el) return
      const preferred = el.querySelector<HTMLElement>('[data-autofocus]')
      const target = preferred ?? focusables()[0] ?? el
      // 容器本身兜底可聚焦
      if (target === el && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
      target.focus()
    }
  }

  function deactivate() {
    if (!listening) return
    document.removeEventListener('keydown', onKeydown, true)
    listening = false
    if (restoreFocus && previouslyFocused && document.contains(previouslyFocused)) {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }

  watch(active, (v) => (v ? activate() : deactivate()), { immediate: true })
  onBeforeUnmount(deactivate)

  return { activate, deactivate }
}
