<script setup lang="ts">
/**
 * 解决方案 · Agentic 工作台示意 —— AgentWorkspace 组合 Shell 全要素静态示意。
 * 不调用模型：WorkspaceSeeder 预置思考块消息 / 计划 / 任务 / 变更审查 / 终端输出，
 * 展示左会话 + 中聊天 + 右五面板的完整信息架构。
 */
import { ref } from 'vue'
import {
  AgentWorkspace, CopilotProvider, ModelSelector, SessionList,
  type SessionItem,
} from '../../lib/agent-copilot'
import { demoWorkspaceFiles } from '../solutions/coding-agent-runtime'
import WorkspaceSeeder from '../solutions/WorkspaceSeeder.vue'

// 模型选择与模式选择同行（Cursor/VS Code 惯例）
const model = ref('openai')

const sessions = ref<SessionItem[]>([
  { id: 's1', title: '登录表单加校验', updatedAt: Date.now() - 60_000, pinned: true },
  { id: 's2', title: '重构 API 错误处理', updatedAt: Date.now() - 3600_000 },
  { id: 's3', title: '数据看板需求梳理', updatedAt: Date.now() - 86400_000 },
])
const activeSession = ref('s1')

const config = {
  botName: 'Agentic 助手',
  agentic: {
    mode: 'confirm_edits' as const,
    thinkingToggle: true,
    showThinking: true,
  },
  persistence: { mode: 'none' as const },
}
</script>

<template>
  <div class="as-root">
    <header class="as-head">
      <div>
        <h2 class="as-title">Agentic 工作台示意</h2>
        <p class="as-desc">
          AgentWorkspace 组合 Shell 全要素静态示意 — 左会话列表 · 中聊天（思考块/模式选择）·
          右五面板（变更审查 / 计划 / 任务 / 文件 / 终端）均已预置演示数据，无需等待模型
        </p>
      </div>
      <span class="as-badge">静态示意</span>
    </header>

    <div class="as-body">
      <CopilotProvider :config="config">
        <WorkspaceSeeder />
        <AgentWorkspace
          :files="demoWorkspaceFiles"
          chat-title="Agentic 助手"
          chat-placeholder="示意视图：右侧面板已预置演示数据"
          show-mode-selector
          :visible-panels="['changes', 'plan', 'tasks', 'files', 'terminal']"
        >
          <template #toolbar>
            <ModelSelector v-model="model" class="as-model" />
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
.as-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}
.as-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.as-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--ac-fg);
}
.as-desc {
  margin: 0;
  font-size: 13px;
  color: var(--ac-muted);
  line-height: 1.6;
  max-width: 720px;
  text-wrap: pretty;
}
.as-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, #92400e 10%, transparent);
  color: #92400e;
  font-size: 12px;
  font-weight: 600;
}
.as-body {
  flex: 1;
  min-height: 0;
}
.as-model { margin-left: auto; }
</style>
