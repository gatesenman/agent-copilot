/**
 * useTheme —— 主题切换（light / dark / system）。
 *
 * 通过在挂载点（默认 documentElement）切换 data-ac-theme 属性驱动 CSS 变量，
 * system 模式跟随 prefers-color-scheme，可选 localStorage 持久化。
 */
import { computed, onScopeDispose, ref, watchEffect, type Ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface UseThemeOptions {
  /** 初始模式，默认 system */
  initial?: ThemeMode
  /** 属性挂载元素，默认 document.documentElement */
  target?: HTMLElement
  /** localStorage 键；传 false 关闭持久化，默认 'agent-copilot:theme' */
  storageKey?: string | false
}

export interface UseThemeReturn {
  /** 当前模式（可写） */
  mode: Ref<ThemeMode>
  /** 实际生效的主题（system 已解析） */
  resolved: Ref<'light' | 'dark'>
  /** 在 light/dark 间切换（system 态按当前解析值翻转） */
  toggle: () => void
  setMode: (mode: ThemeMode) => void
}

export function useTheme(options: UseThemeOptions = {}): UseThemeReturn {
  const storageKey = options.storageKey === false ? null : (options.storageKey ?? 'agent-copilot:theme')

  const stored = storageKey && typeof localStorage !== 'undefined'
    ? (localStorage.getItem(storageKey) as ThemeMode | null)
    : null
  const mode = ref<ThemeMode>(stored ?? options.initial ?? 'system')

  const systemDark = ref(false)
  let mql: MediaQueryList | null = null
  if (typeof window !== 'undefined' && window.matchMedia) {
    mql = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = mql.matches
    const onChange = (e: MediaQueryListEvent) => { systemDark.value = e.matches }
    mql.addEventListener('change', onChange)
    onScopeDispose(() => mql?.removeEventListener('change', onChange))
  }

  const resolved = computed<'light' | 'dark'>(() =>
    mode.value === 'system' ? (systemDark.value ? 'dark' : 'light') : mode.value,
  )

  watchEffect(() => {
    const el = options.target ?? (typeof document !== 'undefined' ? document.documentElement : null)
    if (!el) return
    el.setAttribute('data-ac-theme', resolved.value)
    if (storageKey && typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, mode.value)
    }
  })

  function setMode(m: ThemeMode) { mode.value = m }
  function toggle() { mode.value = resolved.value === 'dark' ? 'light' : 'dark' }

  return { mode, resolved, toggle, setMode }
}
