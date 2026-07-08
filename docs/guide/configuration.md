# 标准集成与传参（分层配置模型)

组件库的全部参数走同一条**五层配置链**,层级越高优先级越高,相邻层之间**深合并**(嵌套段按键合并,不会整段覆盖)。这是官方唯一推荐的传参方式。

## 五层模型总览

| 层 | 载体 | 谁来配 | 典型内容 |
|---|------|-------|---------|
| 1 | `DEFAULT_CONFIG` | 组件库内置 | 兜底默认值,无需关心 |
| 2 | `agentType` 预设 | 实例声明 | chat / code / design / data 场景化预设 |
| 3 | `app.use(createCopilot({...}))` | **应用入口一次性** | endpoint、locale、theme、showTimestamps 等应用级共性 |
| 4 | `config` prop | **每个组件实例** | agentType、model、persistence、botName 等实例差异 |
| 5 | `store.updateConfig(patch)` | 运行时代码 | 用户在设置面板改 model / 温度等程序化微调 |

**决策口诀:全应用相同的参数放第 3 层,实例间有差异的放第 4 层,用户运行时可改的走第 5 层。**

## 第 3 层:应用级插件(推荐起点)

```ts
// main.ts
import { createApp } from 'vue'
import { createCopilot, defineCopilotConfig } from '@od/agent-copilot-vue'

createApp(App)
  .use(createCopilot(defineCopilotConfig({
    runtime: 'http',
    endpoint: '/api/copilot',   // 应用级 Agent 后端,配一次
    locale: 'zh-CN',
    theme: 'auto',
  })))
  .mount('#app')
```

- `defineCopilotConfig` 是纯类型助手(identity 函数),把配置抽到独立文件时仍有完整补全;
- 未安装插件时组件行为完全不变(第 3 层为空),**存量代码零迁移成本**;
- 同页多实例(Sidebar + Popup + Textarea)自动继承,不再重复传 endpoint/locale。

## 第 4 层:实例 config prop(深合并覆盖)

```html
<!-- 只传差异:endpoint/locale/theme 已由插件层提供 -->
<CopilotSidebar :config="{ agentType: 'code', model: 'gpt-5', botName: '代码助手' }" />
<CopilotPopup  :config="{ agentType: 'chat', persistence: { mode: 'local' } }" />
```

深合并规则:

- 普通嵌套对象**按键递归合并**——`:config="{ markdown: { mermaid: true } }"` 只覆盖 `mermaid`,不丢失全局层的其他 markdown 配置;
- 数组、函数、`runtimeInstance`、`false`(显式关闭段如 `messageActions: false`)**整体替换**;
- `undefined` 视为"未提供",不会击穿低层的值。

## 第 5 层:运行时 updateConfig

```ts
const store = useCopilot()
store.updateConfig({ model: 'gpt-5-mini', temperature: 0.3 })   // 即时生效
store.updateConfig({ endpoint: '/api/copilot-v2' })             // 重建 runtime,对新会话生效
```

## 响应式生效边界

`config` prop 变更与 `updateConfig` 都会按键自动分流:

| 类别 | 键 | 生效方式 |
|------|----|---------|
| **响应式键** | model、temperature、maxTokens、systemPrompt、theme、brandColor、themePreset、locale、labels、botName、suggestions、markdown、streaming、messageActions 等 | **变更即时生效**,进行中的会话不受影响 |
| **结构键** | runtime、runtimeInstance、provider、protocol、endpoint、apiBase、apiKey、headers、persistence、agentType | **重建 runtime**,对**新会话**生效(dev 环境有 console 提示) |

```html
<!-- 宿主直接改绑定值即可,无需 :key 强制重建 -->
<CopilotChat :config="{ model: currentModel, theme: currentTheme }" />
```

## dev 校验告警

开发环境下自动校验合并结果并 `console.warn`(生产零开销):

- `runtime: 'http'` 或 B 类 Agent 协议缺 `endpoint`;
- `browser` 模式携带 `apiKey`(前端暴露密钥风险提示);
- `approvalMode` 与 `approval.mode` 冲突;
- `temperature` 越界、未知 `runtime` 值、`runtimeInstance` 与 provider/protocol 同时提供等。

## 三种典型接入形态

**A. 全局插件 + 多实例差异(推荐,中大型应用)**

```ts
app.use(createCopilot({ runtime: 'http', endpoint: '/api/copilot', locale: 'zh-CN' }))
```
```html
<CopilotSidebar :config="{ agentType: 'code' }" />
<CopilotTextarea :config="{ purpose: '邮件撰写' }" />
```

**B. 单实例纯 prop(小工具页/快速验证)**

```html
<AgentCopilot :config="{ provider: 'deepseek', apiKey: key, model: 'deepseek-chat' }" />
```

**C. 混合:配置文件 + 运行时面板(企业应用)**

```ts
// copilot.config.ts —— 类型安全的配置文件
export default defineCopilotConfig({ runtime: 'http', endpoint: '/api/copilot' })
```
```ts
// 设置面板保存时
store.updateConfig(userSettings)
```
