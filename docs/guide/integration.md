# 集成方式（SDK / 嵌入 / Web Component）

参照 Dify、Coze、Intercom、CopilotKit 等行业产品的标准做法，本组件库对外提供 **6 种集成方式**，覆盖从"两行脚本挂气泡"到"NPM 深度定制"的全部场景。

## 方式总览与选型

| # | 方式 | 行业对标 | 接入成本 | 定制能力 | 隔离性 | 适用场景 |
|---|------|---------|:---:|:---:|:---:|---------|
| 1 | NPM SDK 组件 | CopilotKit / assistant-ui | 中 | 最强 | 无隔离 | Vue 3 应用内深度集成，需要 Actions/生成式 UI/工作台 |
| 2 | Script 气泡嵌入 | Dify embed.min.js / Intercom | 最低 | 弱 | iframe | 任意网站（含非 Vue 技术栈、CMS、官网）快速挂客服/助手 |
| 3 | iframe 嵌入 | Dify iframe / Coze WebSDK | 低 | 中 | iframe | 自己控制入口按钮/布局，把对话窗嵌进任意页面区域 |
| 4 | Web Component | Coze `<coze-chat>` | 低 | 中 | DOM 级 | React / Angular / Svelte / 原生页面，不想引 iframe |
| 5 | 独立分享链接 | Dify 公开 WebApp | 零 | 弱 | 独立页 | 直接把链接发给用户 / 内网门户收藏 / 二维码 |
| 6 | 后端 API（Headless） | Dify REST API / AG-UI | 高 | 最强 | — | 完全自研 UI，仅复用协议与 Agent 后端 |

选型速记：**自己就是 Vue 项目 → 方式 1**；**别人的网站 / 非 Vue → 方式 2 或 4**；**只要个链接 → 方式 5**。

[demo:integration-live]

## 方式一：NPM SDK 组件集成

以 npm 包（或源码内联）引入，全部组件、Composables、三种 Runtime 与 32 种协议适配可用，定制能力最强。

```ts
import { CopilotProvider, CopilotChat } from '@od/agent-copilot-vue'
import type { CopilotConfig } from '@od/agent-copilot-vue'

const config: CopilotConfig = {
  runtime: 'http',              // 生产推荐：对接自有后端，Key 不出服务端
  endpoint: '/api/agent',
  theme: 'auto',
  botName: '企业助手',
}
```

```html
<CopilotProvider :config="config">
  <CopilotChat title="企业助手" />
</CopilotProvider>
```

一体化入口 `<AgentCopilot>`（Provider + 顶栏 + 多会话 + 工作台）适合"一个标签开箱即用"；细粒度拼装用 `CopilotProvider` + `CopilotChat / CopilotSidebar / CopilotPopup`。业务能力注册用 `useCopilotAction` / `useCopilotReadable`，详见「组件总览与快速开始」。

## 方式二：Script 气泡嵌入（embed.js）

对标 Dify 的 `embed.min.js`：在**任意网站**粘贴两段脚本，右下角出现悬浮气泡，点击展开对话窗（iframe 隔离，不污染宿主样式与全局变量）。

```html
<script>
  window.agentCopilotConfig = {
    baseUrl: 'https://your-copilot-host',  // 必填：本站点部署地址
    title: 'AI 助手',
    theme: 'auto',                          // light | dark | auto
    brand: '0f6b54',                        // 品牌色 hex（无 #）
    position: 'right',                      // 气泡位置 right | left
    endpoint: '',                           // 可选：自有后端 SSE 端点
    // 敏感配置走 postMessage 注入，不会出现在 URL：
    config: { /* apiKey: '...' */ },
    onMessage(msg) { /* { role, content } 消息回调，可做未读角标/埋点 */ },
  }
</script>
<script src="https://your-copilot-host/embed.js" defer></script>
```

运行时 API：

| API | 说明 |
|-----|------|
| `AgentCopilotEmbed.open()` | 展开对话窗 |
| `AgentCopilotEmbed.close()` | 收起对话窗 |
| `AgentCopilotEmbed.toggle()` | 切换开合 |
| `AgentCopilotEmbed.isOpen()` / `isReady()` | 状态查询 |
| `AgentCopilotEmbed.destroy()` | 移除气泡与 iframe |

## 方式三：iframe 嵌入

独立嵌入页 `/embed.html` 可被任何页面以 iframe 引用，入口按钮与布局完全由宿主控制：

```html
<iframe
  src="https://your-copilot-host/embed.html?layout=bubble&title=AI%20助手&theme=auto"
  style="width: 420px; height: 640px; border: none; border-radius: 14px"
  allow="clipboard-write"
></iframe>
```

### URL 参数

| 参数 | 取值 | 说明 |
|------|------|------|
| `layout` | `bubble` / `full` | 气泡窗版式 / 全屏分享页版式（默认 full） |
| `title` / `subtitle` | string | 窗口标题 / 副标题 |
| `theme` | `light` / `dark` / `auto` | 主题（默认 auto 跟随系统） |
| `brand` | hex（无 #） | 品牌主色，如 `0f6b54` |
| `placeholder` | string | 输入框占位文案 |
| `initialMessage` | string | 欢迎语 |
| `endpoint` | url | 有值即切换 http 模式对接自有后端 SSE |
| `botName` | string | 机器人名称 |

### postMessage 双向协议

| 方向 | 消息 | 说明 |
|------|------|------|
| 子 → 父 | `{ type: 'ac:ready' }` | 嵌入页挂载完成，可开始注入配置 |
| 子 → 父 | `{ type: 'ac:close' }` | 用户点击收起，宿主应隐藏 iframe |
| 子 → 父 | `{ type: 'ac:message', role, content }` | 每条消息完成时上报 |
| 父 → 子 | `{ type: 'ac:config', config: {...} }` | 合并注入 CopilotConfig（推荐传 apiKey 等敏感项） |

```js
// 宿主页示例：注入敏感配置 + 监听消息
iframe.contentWindow.postMessage({ type: 'ac:config', config: { apiKey: '...' } }, 'https://your-copilot-host')
window.addEventListener('message', (e) => {
  if (e.data?.type === 'ac:message') console.log(e.data.role, e.data.content)
})
```

## 方式四：Web Component

`<agent-copilot-chat>` 自定义元素，框架无关（React / Angular / Svelte / 原生均可），与宿主同文档运行（无 iframe），可用 CSS 变量深度定制主题。

```ts
import { registerAgentCopilotElements } from '@od/agent-copilot-vue'
registerAgentCopilotElements()   // 注册 <agent-copilot-chat>
```

```html
<agent-copilot-chat
  title="AI 助手"
  theme="auto"
  brand-color="#0f6b54"
  endpoint="/api/agent"
  style="display: block; height: 600px"
></agent-copilot-chat>

<script>
  document.querySelector('agent-copilot-chat')
    .addEventListener('message', (e) => console.log(e.detail)) // { role, content }
</script>
```

属性：`title` / `subtitle` / `placeholder` / `initial-message` / `theme` / `brand-color` / `bot-name` / `endpoint` / `api-base` / `api-key` / `model` / `show-header`。有 `endpoint` 走 http 模式，否则浏览器直连模型。

## 方式五：独立分享链接

`/embed.html?layout=full` 即一个完整的公开对话页（对标 Dify 公开 WebApp），直接分享链接、生成二维码或加入内网门户即可：

```text
https://your-copilot-host/embed.html?layout=full&title=企业知识助手&theme=auto
```

## 方式六：后端 API / Headless 集成

不使用本库 UI，仅复用协议层与 Agent 后端：

- **自有前端 + 本库运行时**：`createRuntime(config)` / `HttpAgentRuntime` 直接驱动你的 UI（AG-UI 风格 SSE 事件流：`RUN_STARTED` / `TEXT_MESSAGE_*` / `TOOL_CALL_*` / `INTERRUPT` / `RUN_FINISHED`）
- **直接调后端 SSE**：`POST {endpoint}/chat` 发起会话、`POST {endpoint}/resume` 恢复 HITL 中断、`POST {endpoint}/abort` 终止，协议详见「AI 协议接入」章节
- Headless Composable：`useCopilotChat()` 提供无 UI 的会话状态机

## 安全注意事项

1. **API Key 永远不要放进 URL 或前端代码**：iframe / embed.js 场景用 `ac:config` postMessage 注入，生产环境优先 `endpoint` http 模式，Key 只存服务端
2. **限制可嵌入域名**：部署时通过 `Content-Security-Policy: frame-ancestors` 白名单控制哪些站点可以 iframe 本页；postMessage 校验 `event.origin`
3. **embed.js 与嵌入页同源部署**，脚本内部已按 `baseUrl` 校验消息来源
4. **后端鉴权**：http 模式建议在 `headers` 中携带业务 token，服务端按会话校验
