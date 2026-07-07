# AI 协议接入

[demo:protocol-badge]

组件库通过统一的适配层支持 **32 种接入方式**，分三类：

| 类别 | 协议 | 说明 |
| --- | --- | --- |
| A 类·模型协议 | openai-compatible（20 家厂商预设）、anthropic、gemini、ollama-native、cohere | 直连模型 API，前端跑 ReAct 循环 |
| B 类·Agent 框架 | ag-ui、langgraph、langserve、agentscope、ai-sdk、dify、coze、fastgpt | 对接后端 Agent 服务的私有流协议 |
| C 类·互操作协议 | **a2a、acp、openai-assistants** + **MCP 客户端** | AI 行业开放标准 |

## 快速切换

```ts
// 20 家厂商一行切换
const config: CopilotConfig = { provider: 'deepseek', apiKey: '...' }

// Agent 框架
const config: CopilotConfig = { protocol: 'dify', apiBase: '...', apiKey: '...' }
```

## A2A（Agent-to-Agent Protocol）

Google 发起、Linux 基金会托管的 Agent 互操作标准。基于 JSON-RPC 2.0 + SSE：

```ts
const config: CopilotConfig = {
  protocol: 'a2a',
  apiBase: 'https://agent.example.com',   // Agent Card 位于 /.well-known/agent-card.json
}
```

- `message/stream` 流式任务执行，状态机 `submitted → working → completed`；
- `input-required` 状态自动转为组件库的 HITL 中断（弹出审批/输入卡）；
- 配套 UI：`AgentCardView`（能力卡片）、`TaskStatusBadge`（任务状态机徽章）。

## ACP（Agent Communication Protocol / BeeAI）

IBM 发起、Linux 基金会托管。REST 风格 `POST /runs`：

```ts
const config: CopilotConfig = {
  protocol: 'acp',
  apiBase: 'http://localhost:8000',
  protocolOptions: { agentName: 'research-agent' },
}
```

`awaiting` 状态映射为 HITL 中断，`resume` 时携带用户输入继续运行。

## OpenAI Assistants API

```ts
const config: CopilotConfig = {
  protocol: 'openai-assistants',
  apiBase: 'https://api.openai.com/v1',
  apiKey: 'sk-...',
  protocolOptions: { assistantId: 'asst_xxx' },
}
```

Thread/Run 生命周期自动管理；`requires_action`（工具调用确认）转为 HITL 中断。

## MCP（Model Context Protocol）

MCP 是「模型 ↔ 工具/资源」协议，与聊天流正交，因此以 **独立客户端** 提供而不是 runtime 协议：

```ts
import { McpClient } from '@od/agent-copilot-vue'

const mcp = new McpClient({ endpoint: 'https://mcp.example.com/sse' })
await mcp.connect()

const tools = await mcp.listTools()        // 工具发现
const result = await mcp.callTool('search', { query: '电缆价格' })
const resources = await mcp.listResources() // 资源发现
```

把 MCP 工具桥接为组件库 Action，模型即可调用：

```ts
for (const tool of tools) {
  useCopilotAction({
    name: tool.name,
    description: tool.description ?? '',
    handler: (args) => mcp.callTool(tool.name, args),
  })
}
```

配套 UI：`McpServerPanel`——服务器连接状态 + 工具/资源/提示模板浏览器，支持在线调用工具查看结果。

## 其他行业协议

| 协议 | 状态 | 说明 |
| --- | --- | --- |
| ANP（Agent Network Protocol） | 观察中 | 去中心化 Agent 网络，W3C DID 身份，尚早期 |
| AITP（Agent Interaction & Transaction Protocol） | 观察中 | NEAR 发起，聚焦跨信任边界交易 |
| AG-UI | 已支持 | Agent ↔ 前端 UI 事件流协议（B 类） |

协议扩展点：`registerAgentProtocol(id, adapter)` 可注册任何自定义协议，无需改库代码。
