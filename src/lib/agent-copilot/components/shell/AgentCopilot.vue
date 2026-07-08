<script setup lang="ts">
/**
 * AgentCopilot —— 一体化聚合大组件（开箱即用）。
 *
 * 一个标签 = Provider + 顶栏 + 多会话边栏 + 对话 / 工作台 + 设置弹窗：
 *
 *   <AgentCopilot :config="{ runtime: 'browser', agentType: 'assistant' }" />
 *
 * 全功能形态（带右侧工作台面板）：
 *
 *   <AgentCopilot
 *     :config="config"
 *     title="数据平台助手"
 *     :panels="['changes', 'plan', 'tasks', 'terminal']"
 *     :quota="200000"
 *     @provider-change="onSwitch"
 *   />
 *
 * 所有区块都可通过 show* 开关裁剪；需要更细粒度的拼装时，
 * 仍可退回使用 CopilotProvider + 各独立组件（渐进式 API）。
 */
import type { CopilotConfig, WorkspaceFile } from '../../types'
import type { ProviderPreset } from '../../protocols/types'
import CopilotProvider from '../CopilotProvider.vue'
import CopilotShell from './CopilotShell.vue'

type PanelId = 'changes' | 'plan' | 'tasks' | 'files' | 'terminal' | 'browser'

withDefaults(
  defineProps<{
    /** Copilot 配置（runtime / provider / agentType / systemPrompt 等） */
    config: CopilotConfig
    /** 顶栏标题 */
    title?: string
    /** 顶栏副标题 */
    subtitle?: string
    /** 整体高度 */
    height?: string
    /** 显示顶栏 */
    showHeader?: boolean
    /** 显示多会话边栏 */
    showSessions?: boolean
    /** 显示模型/协议切换器 */
    showModelSelector?: boolean
    /** 显示 Token 用量 */
    showUsage?: boolean
    /** 显示主题切换 */
    showThemeToggle?: boolean
    /** 显示设置按钮与内置设置弹窗 */
    showSettings?: boolean
    /** 右侧工作台面板（如 ['changes','plan','tasks','terminal']）；false = 纯对话 */
    panels?: PanelId[] | false
    /** 工作台文件树 */
    files?: WorkspaceFile[]
    /** 浏览器面板地址 / 截图 / 标题 */
    browserSrc?: string
    browserScreenshot?: string
    browserTitle?: string
    /** 输入框占位 */
    chatPlaceholder?: string
    /** 开场欢迎语 */
    initialMessage?: string
    /** Token 配额（显示用量进度条） */
    quota?: number
    /** 限定模型切换器可选的 provider 预设 id */
    providers?: string[]
    /** 当前 provider id */
    providerId?: string
    /** 会话边栏宽度 */
    sidebarWidth?: string
  }>(),
  {
    title: undefined,
    subtitle: undefined,
    height: '640px',
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
  /** 用户在顶栏切换 provider（宿主可据此重建 config） */
  (e: 'providerChange', preset: ProviderPreset): void
  /** 切换 / 新建会话 */
  (e: 'sessionChange', id: string): void
  /** 内置设置弹窗值变化 */
  (e: 'settingsChange', values: Record<string, unknown>): void
  /** 工作台终端输入命令 */
  (e: 'terminalCommand', cmd: string): void
  /** 工作台浏览器导航 */
  (e: 'browserNavigate', url: string): void
}>()
</script>

<template>
  <CopilotProvider :config="config" class="ac-app-provider" :style="{ height }">
    <div class="ac-app">
      <CopilotShell
        :title="title"
        :subtitle="subtitle"
        :show-header="showHeader"
        :show-sessions="showSessions"
        :show-model-selector="showModelSelector"
        :show-usage="showUsage"
        :show-theme-toggle="showThemeToggle"
        :show-settings="showSettings"
        :panels="panels"
        :files="files"
        :browser-src="browserSrc"
        :browser-screenshot="browserScreenshot"
        :browser-title="browserTitle"
        :chat-placeholder="chatPlaceholder"
        :initial-message="initialMessage"
        :quota="quota"
        :providers="providers"
        :provider-id="providerId"
        :sidebar-width="sidebarWidth"
        @provider-change="(p) => emit('providerChange', p)"
        @session-change="(id) => emit('sessionChange', id)"
        @settings-change="(v) => emit('settingsChange', v)"
        @terminal-command="(cmd) => emit('terminalCommand', cmd)"
        @browser-navigate="(url) => emit('browserNavigate', url)"
      >
        <template v-if="$slots['header-actions']" #header-actions>
          <slot name="header-actions" />
        </template>
        <template v-if="$slots['sidebar-footer']" #sidebar-footer>
          <slot name="sidebar-footer" />
        </template>
      </CopilotShell>
    </div>
  </CopilotProvider>
</template>

<style scoped>
/* 高度挂在 Provider 根（.ac-root），保证 height 百分比 / 固定值都能贯通到内部 */
.ac-app-provider { display: flex; flex-direction: column; }
.ac-app { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.ac-app > :deep(.ac-shell) { flex: 1; min-height: 0; }
</style>
