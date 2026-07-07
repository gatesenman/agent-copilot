<script setup lang="ts">
/**
 * 组合式解决方案工作台 —— 充分复用库组件组合出行业工作面：
 *   左栏：SafetyBanner（合规提示）+ PayloadCard 栈（业务上下文：指标 / 表格 / 实体 / 时间线）
 *   中栏：CopilotProvider + CopilotChat（真实模型驱动对话）
 *   右栏：PanelContainer 页签（TaskTracker 任务 / SourcePanel 来源 / SessionList 会话 / UsageMeter 用量）
 * 每个行业方案通过 data 差异化装配，而非各自手写布局。
 */
import { computed, ref } from 'vue'
import type {
  AgentTask,
  CopilotActionDef,
  CopilotConfig,
  StructuredPayload,
} from '../../lib/agent-copilot'
import CopilotProvider from '../../lib/agent-copilot/components/CopilotProvider.vue'
import CopilotChat from '../../lib/agent-copilot/components/chat/CopilotChat.vue'
import PayloadCard from '../../lib/agent-copilot/components/generative-ui/PayloadCard.vue'
import TaskTracker from '../../lib/agent-copilot/components/agentic/TaskTracker.vue'
import SafetyBanner from '../../lib/agent-copilot/components/general/SafetyBanner.vue'
import SourcePanel from '../../lib/agent-copilot/components/general/SourcePanel.vue'
import type { SourceChunk } from '../../lib/agent-copilot/components/general/SourcePanel.vue'
import SessionList from '../../lib/agent-copilot/components/general/SessionList.vue'
import type { SessionItem } from '../../lib/agent-copilot/components/general/SessionList.vue'
import UsageMeter from '../../lib/agent-copilot/components/general/UsageMeter.vue'
import PanelContainer from '../../lib/agent-copilot/components/workspace/PanelContainer.vue'
import type { PanelTab } from '../../lib/agent-copilot/components/workspace/PanelContainer.vue'
import ActionRegistrar from '../gallery/ActionRegistrar.vue'

export interface SolutionBanner {
  level: 'info' | 'warning' | 'blocked'
  title: string
  detail?: string
  policy?: string
}

export interface SolutionUsage {
  promptTokens: number
  completionTokens: number
  quota?: number
}

const props = defineProps<{
  config: CopilotConfig
  actions: CopilotActionDef[]
  /** 左栏业务上下文载荷（PayloadCard 渲染） */
  sidebar: StructuredPayload[]
  sidebarTitle?: string
  /** 合规 / 安全横幅（法务、医疗、金融等强合规域） */
  banner?: SolutionBanner
  /** 右栏：任务清单 */
  tasks?: AgentTask[]
  /** 右栏：知识来源 */
  sources?: SourceChunk[]
  /** 右栏：历史会话 */
  sessions?: SessionItem[]
  /** 右栏：用量计 */
  usage?: SolutionUsage
}>()

const sessionsLocal = ref<SessionItem[]>(props.sessions ? [...props.sessions] : [])
const activeSession = ref(sessionsLocal.value[0]?.id ?? '')

const panelTabs = computed<PanelTab[]>(() => {
  const tabs: PanelTab[] = []
  if (props.tasks?.length) {
    tabs.push({
      id: 'tasks',
      label: '任务',
      badge: props.tasks.filter((t) => t.status !== 'done').length,
    })
  }
  if (props.sources?.length) tabs.push({ id: 'sources', label: '来源', badge: props.sources.length })
  if (sessionsLocal.value.length) tabs.push({ id: 'sessions', label: '会话' })
  if (props.usage) tabs.push({ id: 'usage', label: '用量' })
  return tabs
})
const activePanel = ref('')
const hasRight = computed(() => panelTabs.value.length > 0)
</script>

<template>
  <CopilotProvider :config="config">
    <ActionRegistrar :actions="actions" />
    <div class="swb">
      <!-- 左：业务上下文 -->
      <aside class="swb__side" aria-label="业务上下文">
        <SafetyBanner
          v-if="banner"
          :level="banner.level"
          :title="banner.title"
          :detail="banner.detail"
          :policy="banner.policy"
        />
        <h3 class="swb__side-title">{{ sidebarTitle ?? '业务上下文' }}</h3>
        <PayloadCard v-for="(p, i) in sidebar" :key="i" :payload="p" />
      </aside>

      <!-- 中：对话 -->
      <section class="swb__chat" aria-label="AI 对话">
        <CopilotChat :show-reset="true" />
      </section>

      <!-- 右：任务 / 来源 / 会话 / 用量 -->
      <aside v-if="hasRight" class="swb__right" aria-label="辅助面板">
        <PanelContainer
          :panels="panelTabs"
          :active-id="activePanel || panelTabs[0]?.id"
          height="100%"
          @update:active-id="(id: string) => (activePanel = id)"
        >
          <template #tasks>
            <TaskTracker v-if="tasks?.length" :tasks="tasks" title="场景任务" :collapsible="false" />
          </template>
          <template #sources>
            <SourcePanel v-if="sources?.length" :sources="sources" />
          </template>
          <template #sessions>
            <SessionList
              :sessions="sessionsLocal"
              :active-id="activeSession"
              @select="(id: string) => (activeSession = id)"
              @create="() => {
                const s = { id: `s_${Date.now()}`, title: '新会话', updatedAt: Date.now() }
                sessionsLocal.unshift(s)
                activeSession = s.id
              }"
              @delete="(id: string) => (sessionsLocal = sessionsLocal.filter((s) => s.id !== id))"
            />
          </template>
          <template #usage>
            <UsageMeter
              v-if="usage"
              :prompt-tokens="usage.promptTokens"
              :completion-tokens="usage.completionTokens"
              :quota="usage.quota"
            />
          </template>
        </PanelContainer>
      </aside>
    </div>
  </CopilotProvider>
</template>

<style scoped>
.swb {
  display: flex;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.swb__side {
  width: 292px;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px;
}
.swb__side-title {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ac-muted, #64748b);
}

.swb__chat {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  background: var(--ac-bg, #fff);
}
.swb__chat :deep(.ac-chat) { height: 100%; }

.swb__right {
  width: 300px;
  flex-shrink: 0;
  min-height: 0;
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  background: var(--ac-bg, #fff);
}

@media (max-width: 1200px) {
  .swb__right { display: none; }
}
@media (max-width: 900px) {
  .swb { flex-direction: column; }
  .swb__side { width: 100%; max-height: 300px; }
}
</style>
