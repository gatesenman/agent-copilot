<script setup lang="ts">
/**
 * AgentWorkspace —— Agentic Coding 工作台组合 Shell。
 *
 * 布局：左侧可选边栏（slot: sidebar）+ 中间 CopilotChat + 右侧多页签面板。
 * 右侧面板自动接线 store：变更审查 / 计划 / 任务 / 终端，
 * 文件与浏览器面板由外部传入数据（files / browserSrc / browserScreenshot）。
 *
 * 必须在 <CopilotProvider> 内使用。
 */
import { computed } from 'vue'
import { useCopilot } from '../../composables/useCopilot'
import type { WorkspaceFile } from '../../types'
import CopilotChat from '../chat/CopilotChat.vue'
import ModeSelector from '../agentic/ModeSelector.vue'
import ChangeReviewPanel from '../agentic/ChangeReviewPanel.vue'
import PlanPanel from '../agentic/PlanPanel.vue'
import TaskTracker from '../agentic/TaskTracker.vue'
import PanelContainer, { type PanelTab } from './PanelContainer.vue'
import FilePanel from './FilePanel.vue'
import TerminalPanel from './TerminalPanel.vue'
import BrowserPanel from './BrowserPanel.vue'

const props = withDefaults(
  defineProps<{
    /** 工作区文件树（文件面板数据） */
    files?: WorkspaceFile[]
    /** 浏览器面板 iframe 地址 */
    browserSrc?: string
    /** 浏览器面板截图 */
    browserScreenshot?: string
    /** 浏览器面板页面标题 */
    browserTitle?: string
    /** 显示哪些右侧面板（顺序即页签顺序） */
    visiblePanels?: ('changes' | 'plan' | 'tasks' | 'files' | 'terminal' | 'browser')[]
    /** 右侧面板宽度 */
    panelWidth?: string
    /** 边栏宽度（有 sidebar slot 时生效） */
    sidebarWidth?: string
    /** 聊天标题 */
    chatTitle?: string
    /** 聊天占位 */
    chatPlaceholder?: string
    /** 显示模式选择器 */
    showModeSelector?: boolean
    /** 终端可交互 */
    terminalInteractive?: boolean
    /** 整体高度 */
    height?: string
    /** 面板标签文案覆写 */
    panelLabels?: Partial<Record<'changes' | 'plan' | 'tasks' | 'files' | 'terminal' | 'browser', string>>
  }>(),
  {
    files: () => [],
    browserSrc: undefined,
    browserScreenshot: undefined,
    browserTitle: undefined,
    visiblePanels: () => ['changes', 'plan', 'tasks', 'files', 'terminal', 'browser'],
    panelWidth: '420px',
    sidebarWidth: '240px',
    chatTitle: undefined,
    chatPlaceholder: undefined,
    showModeSelector: true,
    terminalInteractive: false,
    height: '100%',
  },
)

const emit = defineEmits<{
  (e: 'terminalCommand', cmd: string): void
  (e: 'browserNavigate', url: string): void
}>()

const store = useCopilot()

const DEFAULT_LABELS: Record<string, string> = {
  changes: '变更',
  plan: '计划',
  tasks: '任务',
  files: '文件',
  terminal: '终端',
  browser: '浏览器',
}

const pendingChanges = computed(() => store.fileChanges.value.filter((c) => c.status === 'pending').length)
const activeTasks = computed(() => store.tasks.value.filter((t) => t.status === 'active' || t.status === 'pending').length)

const panelTabs = computed<PanelTab[]>(() =>
  props.visiblePanels.map((id) => ({
    id,
    label: props.panelLabels?.[id] ?? DEFAULT_LABELS[id],
    badge: id === 'changes' ? pendingChanges.value : id === 'tasks' ? activeTasks.value : undefined,
    badgeTone: id === 'changes' ? ('warning' as const) : undefined,
  })),
)

function clearTerminal() {
  store.terminal.value = []
}
</script>

<template>
  <div class="ac-workspace" :style="{ height }">
    <!-- 左侧边栏（可选） -->
    <aside v-if="$slots.sidebar" class="ac-workspace__sidebar" :style="{ width: sidebarWidth }">
      <slot name="sidebar" />
    </aside>

    <!-- 中间：模式选择 + 聊天 -->
    <div class="ac-workspace__center">
      <div v-if="showModeSelector" class="ac-workspace__toolbar">
        <ModeSelector
          :mode="store.agentMode.value"
          :available-modes="store.config.agentic?.availableModes"
          @update:mode="store.setAgentMode"
        />
        <slot name="toolbar" />
      </div>
      <div class="ac-workspace__chat">
        <CopilotChat :title="chatTitle" :placeholder="chatPlaceholder" />
      </div>
    </div>

    <!-- 右侧：多页签面板 -->
    <aside class="ac-workspace__panels" :style="{ width: panelWidth }">
      <PanelContainer :panels="panelTabs" height="100%">
        <template #changes>
          <div class="ac-workspace__pane-pad">
            <ChangeReviewPanel
              :changes="store.fileChanges.value"
              @review="(id, d) => store.reviewFileChange(id, d)"
            />
          </div>
        </template>
        <template #plan>
          <div class="ac-workspace__pane-pad">
            <PlanPanel
              v-if="store.plan.value"
              :plan="store.plan.value"
              editable
              @approve="(steps) => store.decidePlan('approved', Array.isArray(steps) ? steps : undefined)"
              @reject="store.decidePlan('rejected')"
            />
            <p v-else class="ac-workspace__empty">暂无计划</p>
          </div>
        </template>
        <template #tasks>
          <div class="ac-workspace__pane-pad">
            <TaskTracker :tasks="store.tasks.value" />
          </div>
        </template>
        <template #files>
          <FilePanel :files="files" height="100%" />
        </template>
        <template #terminal>
          <div class="ac-workspace__pane-pad ac-workspace__pane-pad--full">
            <TerminalPanel
              :entries="store.terminal.value"
              :interactive="terminalInteractive"
              height="100%"
              @command="(cmd) => emit('terminalCommand', cmd)"
              @clear="clearTerminal"
            />
          </div>
        </template>
        <template #browser>
          <div class="ac-workspace__pane-pad ac-workspace__pane-pad--full">
            <BrowserPanel
              :src="browserSrc"
              :screenshot="browserScreenshot"
              :page-title="browserTitle"
              height="100%"
              @navigate="(url) => emit('browserNavigate', url)"
            />
          </div>
        </template>
      </PanelContainer>
    </aside>
  </div>
</template>

<style scoped>
.ac-workspace {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-bg);
}
.ac-workspace__sidebar {
  flex-shrink: 0;
  border-right: 1px solid var(--ac-border);
  overflow-y: auto;
  background: var(--ac-surface);
}
.ac-workspace__center { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ac-workspace__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ac-border);
  background: var(--ac-surface);
}
.ac-workspace__chat { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.ac-workspace__chat > :deep(.ac-chat) { flex: 1; min-height: 0; border: none; border-radius: 0; }
.ac-workspace__panels {
  flex-shrink: 0;
  border-left: 1px solid var(--ac-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* 已用 .ac-workspace__pane-pad 控制各页签内边距，关闭 PanelContainer 的默认 padding 防止叠加 */
  --ac-panel-pad: 0;
}
.ac-workspace__pane-pad { padding: 10px; }
.ac-workspace__pane-pad--full { height: 100%; box-sizing: border-box; }
.ac-workspace__empty { color: var(--ac-muted); font-size: 0.82rem; text-align: center; padding: 20px 0; }

@media (max-width: 900px) {
  .ac-workspace { flex-direction: column; }
  .ac-workspace__sidebar { display: none; }
  .ac-workspace__panels { width: 100% !important; border-left: none; border-top: 1px solid var(--ac-border); max-height: 45%; }
}
</style>
