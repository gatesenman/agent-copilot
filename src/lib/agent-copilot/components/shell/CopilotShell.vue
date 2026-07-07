<script setup lang="ts">
/**
 * CopilotShell —— AgentCopilot 的内层 Shell（必须在 CopilotProvider 内）。
 *
 * 渲染完整应用式布局：
 *   顶栏（标题 / 模型切换 / 用量 / 主题 / 设置）
 *   + 左侧会话边栏（多会话管理，内置消息快照切换）
 *   + 中间对话（或带右侧面板的完整工作台）
 *   + 内置设置弹窗（温度 / 系统提示 / 主题）
 *
 * 一般不直接使用本组件，请使用外层 <AgentCopilot>。
 */
import { computed, ref, watch } from 'vue'
import { useCopilot } from '../../composables/useCopilot'
import { useTheme } from '../../composables/useTheme'
import type { ChatMessage } from '../../types'
import type { WorkspaceFile } from '../../types'
import CopilotChat from '../chat/CopilotChat.vue'
import AgentWorkspace from '../workspace/AgentWorkspace.vue'
import SessionList, { type SessionItem } from '../general/SessionList.vue'
import ModelSelector from '../general/ModelSelector.vue'
import UsageMeter from '../general/UsageMeter.vue'
import ThemeToggle from '../general/ThemeToggle.vue'
import SettingsDialog, { type SettingSection } from '../general/SettingsDialog.vue'
import type { ProviderPreset } from '../../protocols/types'

type PanelId = 'changes' | 'plan' | 'tasks' | 'files' | 'terminal' | 'browser'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    /** 功能开关 */
    showHeader?: boolean
    showSessions?: boolean
    showModelSelector?: boolean
    showUsage?: boolean
    showThemeToggle?: boolean
    showSettings?: boolean
    /** 右侧工作台面板；false = 纯对话模式 */
    panels?: PanelId[] | false
    /** 工作台数据透传 */
    files?: WorkspaceFile[]
    browserSrc?: string
    browserScreenshot?: string
    browserTitle?: string
    /** 对话配置透传 */
    chatPlaceholder?: string
    initialMessage?: string
    /** 用量配额（tokens） */
    quota?: number
    /** 限定可选 provider 预设 */
    providers?: string[]
    /** 当前 provider id（模型切换器显示用） */
    providerId?: string
    sidebarWidth?: string
  }>(),
  {
    title: 'AI 助手',
    subtitle: undefined,
    showHeader: true,
    showSessions: true,
    showModelSelector: true,
    showUsage: true,
    showThemeToggle: true,
    showSettings: true,
    panels: false,
    files: () => [],
    browserSrc: undefined,
    browserScreenshot: undefined,
    browserTitle: undefined,
    chatPlaceholder: undefined,
    initialMessage: undefined,
    quota: undefined,
    providers: undefined,
    providerId: undefined,
    sidebarWidth: '248px',
  },
)

const emit = defineEmits<{
  (e: 'providerChange', preset: ProviderPreset): void
  (e: 'sessionChange', id: string): void
  (e: 'settingsChange', values: Record<string, unknown>): void
  (e: 'terminalCommand', cmd: string): void
  (e: 'browserNavigate', url: string): void
}>()

const store = useCopilot()
const theme = useTheme()

// ================= 会话管理（内置消息快照切换） =================

interface InternalSession extends SessionItem {
  snapshot: ChatMessage[]
}

let seq = 0
function newSession(title = '新会话'): InternalSession {
  seq += 1
  return { id: `s-${Date.now()}-${seq}`, title, snapshot: [], updatedAt: Date.now() }
}

const sessions = ref<InternalSession[]>([newSession()])
const activeSessionId = ref(sessions.value[0].id)
const sidebarCollapsed = ref(false)

const sessionItems = computed<SessionItem[]>(() =>
  sessions.value.map(({ snapshot: _s, ...item }) => item),
)

function activeSession(): InternalSession | undefined {
  return sessions.value.find((s) => s.id === activeSessionId.value)
}

/** 把当前 store 消息回写到活动会话快照 */
function snapshotCurrent() {
  const s = activeSession()
  if (!s) return
  s.snapshot = [...store.messages.value]
  const lastText = [...store.messages.value].reverse().find((m) => m.content)?.content ?? ''
  s.preview = lastText.slice(0, 60)
  s.updatedAt = Date.now()
  const firstUser = store.messages.value.find((m) => m.role === 'user')
  if (firstUser && s.title === '新会话') s.title = firstUser.content.slice(0, 24)
}

// 消息变化时实时回写快照（标题/摘要跟随）
watch(
  () => store.messages.value,
  () => snapshotCurrent(),
  { deep: false },
)

function switchSession(id: string) {
  if (id === activeSessionId.value) return
  store.stop()
  snapshotCurrent()
  const target = sessions.value.find((s) => s.id === id)
  if (!target) return
  activeSessionId.value = id
  store.clearAgenticState()
  store.messages.value = [...target.snapshot]
  emit('sessionChange', id)
}

function createSession() {
  store.stop()
  snapshotCurrent()
  const s = newSession()
  sessions.value = [s, ...sessions.value]
  activeSessionId.value = s.id
  store.clearAgenticState()
  store.messages.value = []
  emit('sessionChange', s.id)
}

function renameSession(id: string, title: string) {
  const s = sessions.value.find((x) => x.id === id)
  if (s) s.title = title
}

function deleteSession(id: string) {
  sessions.value = sessions.value.filter((s) => s.id !== id)
  if (sessions.value.length === 0) sessions.value = [newSession()]
  if (id === activeSessionId.value) {
    const next = sessions.value[0]
    activeSessionId.value = next.id
    store.clearAgenticState()
    store.messages.value = [...next.snapshot]
    emit('sessionChange', next.id)
  }
}

function pinSession(id: string, pinned: boolean) {
  const s = sessions.value.find((x) => x.id === id)
  if (s) s.pinned = pinned
}

// ================= 模型切换 =================

const providerModel = ref(props.providerId ?? '')
watch(
  () => props.providerId,
  (v) => { if (v) providerModel.value = v },
)

function onProviderChange(preset: ProviderPreset) {
  emit('providerChange', preset)
}

// ================= 内置设置 =================

const settingsOpen = ref(false)

const settingsSections: SettingSection[] = [
  {
    id: 'appearance',
    title: '外观',
    fields: [
      {
        key: 'theme', label: '主题', type: 'radio',
        options: [
          { label: '亮色', value: 'light' },
          { label: '暗色', value: 'dark' },
          { label: '跟随系统', value: 'system' },
        ],
      },
    ],
  },
  {
    id: 'generation',
    title: '生成',
    fields: [
      { key: 'temperature', label: '温度', type: 'slider', min: 0, max: 2, step: 0.1, description: '越高越发散，越低越确定' },
      { key: 'systemPrompt', label: '系统提示', type: 'text', placeholder: '自定义系统提示（下一轮对话生效）' },
    ],
  },
]

const settingsValues = ref<Record<string, unknown>>({
  theme: theme.mode.value,
  temperature: store.config.temperature ?? 0.7,
  systemPrompt: store.config.systemPrompt ?? '',
})

function onSettingsUpdate(values: Record<string, unknown>) {
  settingsValues.value = values
  theme.setMode(values.theme as 'light' | 'dark' | 'system')
  store.config.temperature = Number(values.temperature)
  store.config.systemPrompt = String(values.systemPrompt ?? '') || undefined
  emit('settingsChange', values)
}
</script>

<template>
  <div class="ac-shell">
    <!-- ============ 顶栏 ============ -->
    <header v-if="showHeader" class="ac-shell__header">
      <div class="ac-shell__head-left">
        <button
          v-if="showSessions"
          type="button"
          class="ac-shell__icon-btn"
          :aria-label="sidebarCollapsed ? '展开会话边栏' : '折叠会话边栏'"
          :aria-expanded="!sidebarCollapsed"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" />
            <path d="M6 2.5v11" stroke="currentColor" />
          </svg>
        </button>
        <div class="ac-shell__titles">
          <span class="ac-shell__title">{{ title }}</span>
          <span v-if="subtitle" class="ac-shell__subtitle">{{ subtitle }}</span>
        </div>
      </div>

      <div class="ac-shell__head-right">
        <slot name="header-actions" />
        <ModelSelector
          v-if="showModelSelector"
          v-model="providerModel"
          :providers="providers"
          @change="onProviderChange"
        />
        <UsageMeter
          v-if="showUsage"
          compact
          :prompt-tokens="store.totalUsage.promptTokens"
          :completion-tokens="store.totalUsage.completionTokens"
          :quota="quota"
        />
        <ThemeToggle
          v-if="showThemeToggle"
          size="sm"
          :mode="theme.mode.value"
          @update:mode="(m) => { theme.setMode(m); settingsValues.theme = m }"
        />
        <button
          v-if="showSettings"
          type="button"
          class="ac-shell__icon-btn"
          aria-label="打开设置"
          aria-haspopup="dialog"
          @click="settingsOpen = true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="2.2" stroke="currentColor" />
            <path d="M8 1.8v2M8 12.2v2M14.2 8h-2M3.8 8h-2M12.4 3.6l-1.4 1.4M5 11l-1.4 1.4M12.4 12.4L11 11M5 5 3.6 3.6" stroke="currentColor" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </header>

    <!-- ============ 主体 ============ -->
    <div class="ac-shell__body">
      <!-- 会话边栏 -->
      <aside
        v-if="showSessions && !sidebarCollapsed"
        class="ac-shell__sidebar"
        :style="{ width: sidebarWidth }"
        aria-label="会话列表"
      >
        <SessionList
          :sessions="sessionItems"
          :active-id="activeSessionId"
          @select="switchSession"
          @create="createSession"
          @rename="renameSession"
          @delete="deleteSession"
          @pin="pinSession"
        />
        <div v-if="$slots['sidebar-footer']" class="ac-shell__sidebar-footer">
          <slot name="sidebar-footer" />
        </div>
      </aside>

      <!-- 对话 / 工作台 -->
      <main class="ac-shell__main">
        <AgentWorkspace
          v-if="panels && panels.length > 0"
          :visible-panels="panels"
          :files="files"
          :browser-src="browserSrc"
          :browser-screenshot="browserScreenshot"
          :browser-title="browserTitle"
          :chat-placeholder="chatPlaceholder"
          height="100%"
          @terminal-command="(cmd) => emit('terminalCommand', cmd)"
          @browser-navigate="(url) => emit('browserNavigate', url)"
        />
        <CopilotChat
          v-else
          class="ac-shell__chat"
          :placeholder="chatPlaceholder"
          :initial-message="initialMessage"
        />
      </main>
    </div>

    <!-- ============ 内置设置弹窗 ============ -->
    <SettingsDialog
      :open="settingsOpen"
      :sections="settingsSections"
      :values="settingsValues"
      @update:open="settingsOpen = $event"
      @update:values="onSettingsUpdate"
    />
  </div>
</template>

<style scoped>
.ac-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  overflow: hidden;
}

/* ---- 顶栏 ---- */
.ac-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ac-border);
  background: var(--ac-surface);
  flex-shrink: 0;
}
.ac-shell__head-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.ac-shell__head-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.ac-shell__titles { display: flex; flex-direction: column; min-width: 0; }
.ac-shell__title {
  font-weight: 650;
  font-size: 0.95rem;
  color: var(--ac-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ac-shell__subtitle { font-size: 0.74rem; color: var(--ac-muted); }
.ac-shell__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.6);
  background: transparent;
  color: var(--ac-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.ac-shell__icon-btn:hover { color: var(--ac-primary); border-color: var(--ac-primary); }

/* ---- 主体 ---- */
.ac-shell__body { display: flex; flex: 1; min-height: 0; }
.ac-shell__sidebar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ac-border);
  background: var(--ac-surface);
  overflow: hidden;
}
.ac-shell__sidebar > :deep(.ac-sessions) { flex: 1; min-height: 0; border: none; border-radius: 0; }
.ac-shell__sidebar-footer { border-top: 1px solid var(--ac-border); padding: 10px; }
.ac-shell__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ac-shell__main > :deep(.ac-workspace) { flex: 1; min-height: 0; border: none; border-radius: 0; }
.ac-shell__chat { flex: 1; min-height: 0; }
.ac-shell__main > :deep(.ac-chat) { border: none; border-radius: 0; }

@media (max-width: 780px) {
  .ac-shell__sidebar { position: absolute; inset: 0 auto 0 0; z-index: 20; box-shadow: var(--ac-shadow, 0 8px 24px rgba(0, 0, 0, 0.18)); }
  .ac-shell__body { position: relative; }
  .ac-shell__head-right :deep(.ac-usage) { display: none; }
}
</style>
