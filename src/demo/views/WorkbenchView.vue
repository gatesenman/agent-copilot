<script setup lang="ts">
import { ref } from 'vue'
import CopilotChat from '../../lib/agent-copilot/components/chat/CopilotChat.vue'
import SessionList from '../../lib/agent-copilot/components/general/SessionList.vue'
import type { SessionItem } from '../../lib/agent-copilot/components/general/SessionList.vue'
import { useDemoAgent } from '../useDemoAgent'

/** 注册全部通用 readable / actions / suggestions（工作项等数据仍可被助手查询） */
useDemoAgent()

// ---- 会话历史（演示数据，支持搜索 / 置顶 / 重命名 / 删除 / 新建） ----
const sessions = ref<SessionItem[]>([
  { id: 'ss1', title: '为 WI-2024-003 创建审批流', preview: '已生成三级审批流，待你确认节点顺序', updatedAt: Date.now() - 5 * 60_000, pinned: true },
  { id: 'ss2', title: '对比设备申请候选负责人', preview: '王一鸣与刘芳的负载对比已给出', updatedAt: Date.now() - 2 * 3600_000 },
  { id: 'ss3', title: '数据仓库权限开通进度', preview: 'WI-2024-002 当前在审批中，卡在数据安全组', updatedAt: Date.now() - 26 * 3600_000 },
  { id: 'ss4', title: 'Q3 预算申请材料整理', preview: '已汇总三季度活动与培训预算明细', updatedAt: Date.now() - 3 * 86400_000 },
  { id: 'ss5', title: '办公终端更新方案讨论', preview: '30 台终端分两批更换的草案', updatedAt: Date.now() - 6 * 86400_000 },
])
const activeSession = ref('ss1')

function createSession() {
  const s: SessionItem = { id: `ss_${Date.now()}`, title: '新会话', updatedAt: Date.now() }
  sessions.value.unshift(s)
  activeSession.value = s.id
}
</script>

<template>
  <div class="workbench">
    <!-- 左：会话历史 -->
    <aside class="wb-left">
      <SessionList
        :sessions="sessions"
        :active-id="activeSession"
        @select="(id: string) => (activeSession = id)"
        @create="createSession"
        @rename="(id: string, title: string) => { const s = sessions.find((x) => x.id === id); if (s) s.title = title }"
        @delete="(id: string) => (sessions = sessions.filter((s) => s.id !== id))"
        @pin="(id: string, pinned: boolean) => { const s = sessions.find((x) => x.id === id); if (s) s.pinned = pinned }"
      />
    </aside>

    <!-- 中：Copilot 对话 -->
    <section class="wb-center">
      <CopilotChat
        title="企业 AI 助手"
        subtitle="ReAct 执行 · HITL 审批"
        placeholder="例如：帮 WI-2024-003 创建审批流…"
        initial-message="你好，我是企业 AI 助手。我可以帮你查询工作项、对比候选负责人、创建审批流、指派执行。试试下面的建议，或直接告诉我你的需求。"
      />
    </section>
  </div>
</template>

<style scoped>
.workbench {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.wb-left {
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid var(--ac-border);
  overflow-y: auto;
  background: var(--ac-surface);
}
.wb-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
@media (max-width: 860px) {
  .wb-left {
    display: none;
  }
}
</style>
