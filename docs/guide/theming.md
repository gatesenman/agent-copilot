# 主题定制

组件库基于 **Design Tokens**（`--ac-*` CSS 变量）构建，提供三层定制能力，可叠加使用（后者覆盖前者）：

| 层级 | 配置项 | 适用场景 |
| --- | --- | --- |
| 预设主题 | `themePreset` | 一行切换整套配色 |
| 品牌色派生 | `brandColor` | 只有一个品牌主色，自动派生完整色板 |
| Token 覆盖 | `themeTokens` | 像素级精细控制，亮暗可分别配置 |

## 在线体验

[demo:theme-customizer]

## 1. 预设主题

内置 6 套预设：`default`（森绿）/ `ocean`（海蓝）/ `violet`（青紫）/ `amber`（琥珀）/ `rose`（玫红）/ `mono`（石墨），每套均含亮暗两种模式的品牌色与派生色。

```ts
const config: CopilotConfig = {
  themePreset: 'ocean',
}
```

## 2. 品牌色自动派生

只传一个主色，自动派生：主色上的文字色（按对比度选黑/白）、柔和底色（选中态）、暗色模式提亮变体。

```ts
const config: CopilotConfig = {
  brandColor: '#0b5fa5',
}
```

## 3. Token 细粒度覆盖

`themeTokens` 支持全部设计 token，顶层为亮暗共用，`light` / `dark` 键为模式专属覆盖：

```ts
const config: CopilotConfig = {
  themeTokens: {
    radius: 14,          // 数值自动补 px
    fontSize: 15,
    primary: '#5b4fc7',
    dark: {              // 暗色专属
      bg: '#12101f',
      surface: '#1b1830',
    },
  },
}
```

### 可用 Token 清单

| Token | CSS 变量 | 说明 |
| --- | --- | --- |
| `primary` | `--ac-primary` | 品牌主色 |
| `primaryFg` | `--ac-primary-fg` | 主色上的文字 |
| `primarySoft` | `--ac-primary-soft` | 主色柔和底 |
| `bg` / `fg` | `--ac-bg` / `--ac-fg` | 背景 / 主文字 |
| `muted` | `--ac-muted` | 次要文字 |
| `surface` / `border` | `--ac-surface` / `--ac-border` | 面板 / 边框 |
| `success` / `warn` / `danger` | `--ac-success` 等 | 语义色（含 `warnSoft` / `dangerSoft` / `infoSoft`） |
| `radius` / `fontSize` / `gap` | `--ac-radius` 等 | 形状与密度（数值自动补 px） |

## 4. CSS 变量直接覆盖

不经过配置，直接在样式层覆盖也完全等效（适合 SSR / 静态站）：

```css
.my-scope .ac-root {
  --ac-primary: #b45309;
  --ac-radius: 4px;
}
```

## 5. 嵌入场景

- **iframe / 分享链接**：URL 传 `?brand=%230b5fa5`（编码后的十六进制色）。
- **Script 气泡**：`agentCopilotConfig.brandColor` 同名字段。
- **Web Component**：`<agent-copilot-chat brand-color="#0b5fa5">`。

## 编程 API

```ts
import { THEME_PRESETS, deriveBrandTokens, resolveThemeVars } from '@od/agent-copilot-vue'

// 列出全部预设
Object.entries(THEME_PRESETS).forEach(([id, p]) => console.log(id, p.label))

// 由品牌色派生完整 token（亮/暗两套）
const { light, dark } = deriveBrandTokens('#5b4fc7')

// 解析最终 CSS 变量（preset + brandColor + tokens 合并结果）
const vars = resolveThemeVars('dark', { preset: 'ocean', tokens: { radius: 8 } })
```
