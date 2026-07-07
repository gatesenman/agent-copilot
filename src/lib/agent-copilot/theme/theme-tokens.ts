/**
 * 主题定制体系 —— Design Tokens
 *
 * 三层定制能力（低 → 高优先级）：
 * 1. themePreset  内置预设主题（default / ocean / violet / amber / rose / mono）
 * 2. brandColor   品牌主色，自动派生 soft 底色与暗色模式变体
 * 3. themeTokens  细粒度 token 覆盖（亮暗可分别配置），映射为 --ac-* CSS 变量
 */

/** 可覆盖的设计 token（对应 --ac-* CSS 变量，camelCase → kebab-case） */
export interface ThemeTokens {
  /** 品牌主色 */
  primary?: string
  /** 主色上的文字色 */
  primaryFg?: string
  /** 主色柔和底（选中态/信息底） */
  primarySoft?: string
  /** 页面背景 */
  bg?: string
  /** 主文字 */
  fg?: string
  /** 次要文字 */
  muted?: string
  /** 卡片/面板表面 */
  surface?: string
  /** 边框 */
  border?: string
  /** 成功 */
  success?: string
  /** 警告 */
  warn?: string
  /** 警告柔和底 */
  warnSoft?: string
  /** 危险 */
  danger?: string
  /** 危险柔和底 */
  dangerSoft?: string
  /** 信息柔和底 */
  infoSoft?: string
  /** 圆角基准（px 数值或 CSS 长度） */
  radius?: string | number
  /** 基准字号 */
  fontSize?: string | number
  /** 间距基准 */
  gap?: string | number
}

/** 亮暗分离的 token 配置；不分离时视为两种模式共用 */
export interface ThemeTokensConfig extends ThemeTokens {
  /** 暗色模式专属覆盖（优先级高于顶层同名 token） */
  dark?: ThemeTokens
  /** 亮色模式专属覆盖 */
  light?: ThemeTokens
}

/** 内置预设主题 ID */
export type ThemePresetId = 'default' | 'ocean' | 'violet' | 'amber' | 'rose' | 'mono'

/** 预设主题：亮/暗两套品牌色与派生色 */
export const THEME_PRESETS: Record<ThemePresetId, { label: string; light: ThemeTokens; dark: ThemeTokens }> = {
  default: {
    label: '默认 · 森绿',
    light: { primary: '#0f6b54', primaryFg: '#ffffff', primarySoft: '#e6f2ee' },
    dark: { primary: '#34d3a6', primaryFg: '#05231a', primarySoft: '#103b30' },
  },
  ocean: {
    label: '海蓝',
    light: { primary: '#0b5fa5', primaryFg: '#ffffff', primarySoft: '#e3eff9' },
    dark: { primary: '#4db3f2', primaryFg: '#04213a', primarySoft: '#0d3252' },
  },
  violet: {
    label: '青紫',
    light: { primary: '#5b4fc7', primaryFg: '#ffffff', primarySoft: '#ecebf9' },
    dark: { primary: '#a49bf0', primaryFg: '#191447', primarySoft: '#292260' },
  },
  amber: {
    label: '琥珀',
    light: { primary: '#b45309', primaryFg: '#ffffff', primarySoft: '#fdf0e0' },
    dark: { primary: '#f5a94b', primaryFg: '#3a1f03', primarySoft: '#4a3110' },
  },
  rose: {
    label: '玫红',
    light: { primary: '#be2f5b', primaryFg: '#ffffff', primarySoft: '#fbe9ef' },
    dark: { primary: '#f27a9f', primaryFg: '#420a1b', primarySoft: '#521527' },
  },
  mono: {
    label: '石墨',
    light: { primary: '#1f2937', primaryFg: '#ffffff', primarySoft: '#e9ecef' },
    dark: { primary: '#c8d2dc', primaryFg: '#111827', primarySoft: '#2b3540' },
  },
}

// ---------- 颜色派生工具 ----------

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** 与白色混合出柔和底色（ratio 为原色占比） */
function softOf(hex: string, ratio = 0.12, base: [number, number, number] = [255, 255, 255]): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const mix = rgb.map((c, i) => Math.round(c * ratio + base[i] * (1 - ratio)))
  return `#${mix.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** 相对亮度（用于自动决定主色上的文字用黑或白） */
function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** 由单个品牌色派生完整品牌 token（亮/暗两套） */
export function deriveBrandTokens(brandColor: string): { light: ThemeTokens; dark: ThemeTokens } {
  const fg = luminance(brandColor) > 0.45 ? '#111827' : '#ffffff'
  return {
    light: {
      primary: brandColor,
      primaryFg: fg,
      primarySoft: softOf(brandColor, 0.1),
    },
    dark: {
      // 暗色模式提亮品牌色保证对比度
      primary: softOf(brandColor, 0.65, [255, 255, 255]),
      primaryFg: softOf(brandColor, 0.85, [0, 0, 0]),
      primarySoft: softOf(brandColor, 0.35, [14, 20, 18]),
    },
  }
}

// ---------- token → CSS 变量 ----------

const TOKEN_VAR_MAP: Record<keyof ThemeTokens, string> = {
  primary: '--ac-primary',
  primaryFg: '--ac-primary-fg',
  primarySoft: '--ac-primary-soft',
  bg: '--ac-bg',
  fg: '--ac-fg',
  muted: '--ac-muted',
  surface: '--ac-surface',
  border: '--ac-border',
  success: '--ac-success',
  warn: '--ac-warn',
  warnSoft: '--ac-warn-soft',
  danger: '--ac-danger',
  dangerSoft: '--ac-danger-soft',
  infoSoft: '--ac-info-soft',
  radius: '--ac-radius',
  fontSize: '--ac-font-size',
  gap: '--ac-gap',
}

const PX_TOKENS = new Set<keyof ThemeTokens>(['radius', 'fontSize', 'gap'])

/** 将 token 对象转换为 CSS 变量键值对 */
export function tokensToVars(tokens: ThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [key, value] of Object.entries(tokens) as [keyof ThemeTokens, string | number][]) {
    const varName = TOKEN_VAR_MAP[key]
    if (!varName || value === undefined || value === null) continue
    vars[varName] = typeof value === 'number' && PX_TOKENS.has(key) ? `${value}px` : String(value)
  }
  return vars
}

/**
 * 解析最终生效的 CSS 变量。
 * 合并顺序（后者覆盖前者）：preset → brandColor 派生 → themeTokens 共用层 → themeTokens 模式层
 */
export function resolveThemeVars(
  mode: 'light' | 'dark',
  options: {
    preset?: ThemePresetId
    brandColor?: string
    tokens?: ThemeTokensConfig
  },
): Record<string, string> {
  let merged: ThemeTokens = {}
  if (options.preset && options.preset !== 'default' && THEME_PRESETS[options.preset]) {
    merged = { ...THEME_PRESETS[options.preset][mode] }
  }
  if (options.brandColor) {
    merged = { ...merged, ...deriveBrandTokens(options.brandColor)[mode] }
  }
  if (options.tokens) {
    const { dark, light, ...shared } = options.tokens
    merged = { ...merged, ...shared, ...(mode === 'dark' ? dark : light) }
  }
  return tokensToVars(merged)
}
