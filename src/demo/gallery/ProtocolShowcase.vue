<script setup lang="ts">
/**
 * AI 行业协议专属组件演示：
 * A2A AgentCard / 任务状态徽章 / MCP 服务器面板 / 协议能力徽章。
 */
import AgentCardView from '../../lib/agent-copilot/components/protocol/AgentCardView.vue'
import TaskStatusBadge from '../../lib/agent-copilot/components/protocol/TaskStatusBadge.vue'
import McpServerPanel from '../../lib/agent-copilot/components/protocol/McpServerPanel.vue'
import ProtocolBadge from '../../lib/agent-copilot/components/protocol/ProtocolBadge.vue'
import type { A2AAgentCard } from '../../lib/agent-copilot/components/protocol/AgentCardView.vue'
import type { McpPrompt, McpResource, McpTool } from '../../lib/agent-copilot/protocols/mcp'

const agentCard: A2AAgentCard = {
  name: '供应链风险评估 Agent',
  description: '基于实时进度、资源与依赖数据评估交付风险，支持多轮追问。',
  url: 'https://agents.example.com/risk',
  version: '2.1.0',
  provider: { organization: 'Supply Chain AI Lab' },
  capabilities: { streaming: true, pushNotifications: true, stateTransitionHistory: true },
  skills: [
    { id: 'risk-assess', name: '交付风险评估', description: '输入工作项编号，输出风险等级与缓解建议' },
    { id: 'route-optimize', name: '物流路线优化', description: '综合成本与时效重新规划运输方案' },
  ],
}

const A2A_STATES = ['submitted', 'working', 'input-required', 'completed', 'failed', 'canceled']
const ACP_STATES = ['created', 'in-progress', 'awaiting', 'completed', 'failed', 'cancelled']

const mcpTools: McpTool[] = [
  { name: 'query_items', description: '按条件查询工作项', inputSchema: { type: 'object', properties: { status: { type: 'string' }, owner: { type: 'string' } }, required: ['status'] } },
  { name: 'get_team_profile', description: '获取团队档案与负载', inputSchema: { type: 'object', properties: { teamId: { type: 'string' } }, required: ['teamId'] } },
  { name: 'create_request', description: '创建申请单（需审批）', inputSchema: { type: 'object', properties: { items: { type: 'array' } } } },
]
const mcpResources: McpResource[] = [
  { uri: 'pm://items/2026', name: '2026 年工作项库', description: '实时同步的工作项数据', mimeType: 'application/json' },
  { uri: 'kb://policies/general', name: '企业制度知识库', mimeType: 'text/markdown' },
]
const mcpPrompts: McpPrompt[] = [
  { name: 'compare_options', description: '方案对比提示模板', arguments: [{ name: 'category', required: true }] },
]

const PROTOCOLS = ['a2a', 'acp', 'mcp', 'ag-ui', 'openai-assistants', 'langgraph', 'dify']
</script>

<template>
  <div class="proto-show">
    <section class="g-section">
      <h2>AgentCardView — A2A Agent 名片</h2>
      <p class="g-desc">
        渲染 A2A 协议 <code>/.well-known/agent-card.json</code> 的 Agent 元数据：能力开关、技能列表、提供方与版本。
      </p>
      <AgentCardView :card="agentCard" status="online" />
    </section>

    <section class="g-section">
      <h2>TaskStatusBadge — 任务状态徽章</h2>
      <p class="g-desc">A2A 六态与 ACP 状态自动归一化，运行态带脉冲动画。</p>
      <div class="proto-badges">
        <div class="proto-badge-row">
          <span class="proto-badge-label">A2A</span>
          <TaskStatusBadge v-for="s in A2A_STATES" :key="s" :state="s" protocol="A2A" />
        </div>
        <div class="proto-badge-row">
          <span class="proto-badge-label">ACP</span>
          <TaskStatusBadge v-for="s in ACP_STATES" :key="s" :state="s" protocol="ACP" />
        </div>
      </div>
    </section>

    <section class="g-section">
      <h2>McpServerPanel — MCP 服务器面板</h2>
      <p class="g-desc">
        浏览 MCP 服务器暴露的 Tools / Resources / Prompts。传入已连接的
        <code>McpClient</code> 可在线拉取，也支持静态数据模式（本演示）。
        点击「作为工具接入」可把 MCP 工具桥接为前端 Action。
      </p>
      <McpServerPanel
        server-name="erp-mcp-server"
        :tools="mcpTools"
        :resources="mcpResources"
        :prompts="mcpPrompts"
      />
    </section>

    <section class="g-section">
      <h2>ProtocolBadge — 协议能力徽章</h2>
      <p class="g-desc">标识消息/Agent 来源协议及其能力覆盖（流式/工具/HITL/状态/流水线）。</p>
      <div class="proto-badge-row proto-badge-row--wrap">
        <ProtocolBadge v-for="p in PROTOCOLS" :key="p" :protocol="p" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.proto-show {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.proto-badges {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.proto-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.proto-badge-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--ac-muted);
  width: 36px;
}
.g-section h2 { font-size: 17px; margin: 0 0 6px; }
.g-desc {
  color: var(--ac-muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 12px;
}
.g-desc code {
  background: var(--ac-surface);
  border: 1px solid var(--ac-border);
  border-radius: 4px;
  padding: 0 5px;
  font-size: 12px;
}
</style>
