<script setup lang="ts">
/**
 * 解决方案 · Coding Agent 工作台
 *
 * 用 AgentWorkspace 组合 Shell 搭建的完整编码代理场景：
 * 左侧会话列表 + 中间聊天（模式选择/思考块/工具卡）+ 右侧五面板
 * （变更审查/计划/任务/文件/终端），由脚本化运行时驱动确定性演示。
 */
import { ref } from 'vue'
import {
  AgentWorkspace, CopilotProvider, ModelSelector, SessionList,
  type SessionItem,
} from '../../lib/agent-copilot'
import { codingAgentRuntime, demoWorkspaceFiles } from '../solutions/coding-agent-runtime'

// 模型选择与模式选择同行（Cursor/VS Code 惯例）
const model = ref('openai')

const sessions = ref<SessionItem[]>([
  { id: 's1', title: '登录表单加校验', updatedAt: Date.now() - 60_000, pinned: true },
  { id: 's2', title: '重构 API 错误处理', updatedAt: Date.now() - 3600_000 },
  { id: 's3', title: '补充单元测试', updatedAt: Date.now() - 86400_000 },
])
const activeSession = ref('s1')

const config = {
  runtimeInstance: codingAgentRuntime,
  agentic: {
    mode: 'confirm_edits' as const,
    thinkingToggle: true,
    showThinking: true,
  },
  suggestions: {
    static: [
      { title: '加校验', message: '给登录表单添加校验和错误处理' },
      { title: '重构', message: '重构 API 层的错误处理逻辑' },
    ],
  },
  welcomeScreen: {
    title: 'Coding Agent 工作台',
    subtitle: '试试发送「给登录表单添加校验和错误处理」，观察右侧面板联动：计划 → 任务 → 文件变更 → 终端。',
  },
  persistence: { mode: 'none' as const },
}
</script>

<template>
  <div class="cw-root">
    <header class="cw-head">
      <div>
        <h2 class="cw-title">Coding Agent 工作台</h2>
        <p class="cw-desc">
          AgentWorkspace 组合 Shell — 模式选择 · 深度思考 · 计划执行 · 变更审查 · 文件 / 终端面板联动
        </p>
      </div>
      <span class="cw-badge">解决方案演示</span>
    </header>

    <div class="cw-body">
      <CopilotProvider :config="config">
        <AgentWorkspace
          :files="demoWorkspaceFiles"
          chat-title="Coding Agent"
          chat-placeholder="描述你要完成的编码任务…"
          show-mode-selector
          :visible-panels="['changes', 'plan', 'tasks', 'files', 'terminal']"
        >
          <template #toolbar>
            <ModelSelector v-model="model" class="cw-model" />
          </template>
          <template #sidebar>
            <SessionList
              :sessions="sessions"
              :active-id="activeSession"
              @select="(id: string) => (activeSession = id)"
              @create="sessions.unshift({ id: `s_${Date.now()}`, title: '新会话', updatedAt: Date.now() })"
              @delete="(id: string) => (sessions = sessions.filter((s) => s.id !== id))"
            />
          </template>
        </AgentWorkspace>
      </CopilotProvider>
    </div>
  </div>
</template>

<style scoped>
.cw-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}
.cw-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.cw-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--demo-fg, #1a1a2e);
}
.cw-desc {
  margin: 0;
  font-size: 13px;
  color: var(--demo-muted, #64748b);
  line-height: 1.6;
}
.cw-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, #0f6b54 10%, transparent);
  color: #0f6b54;
  font-size: 12px;
  font-weight: 600;
}
.cw-body {
  flex: 1;
  min-height: 0;
}
.cw-model { margin-left: auto; }
</style>
