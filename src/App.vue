<script setup lang="ts">
import { ref } from 'vue'
import CopilotProvider from './lib/agent-copilot/components/CopilotProvider.vue'
import ThemeToggle from './lib/agent-copilot/components/general/ThemeToggle.vue'
import { useTheme } from './lib/agent-copilot/composables/useTheme'
import type { CopilotConfig } from './lib/agent-copilot/types'
import { AGENT_CONFIG } from './config/agent.config'
import { ASSISTANT_SYSTEM_PROMPT } from './demo/prompt'
import HomeView from './demo/views/HomeView.vue'
import SolutionsView from './demo/views/SolutionsView.vue'
import GalleryView from './demo/views/GalleryView.vue'
import DocsView from './demo/views/DocsView.vue'
import PlaygroundView from './demo/views/PlaygroundView.vue'
import ProtocolTestView from './demo/views/ProtocolTestView.vue'
import LlmsView from './demo/views/LlmsView.vue'

/**
 * 运行时选择：
 * - runtime: 'browser' — 浏览器内 5+1 流水线模拟 + 直连硅基流动（本演示使用）
 * - runtime: 'http'    — 对接 AgentScope Java 后端（java-backend/），事件协议一致，零改动切换：
 *   { runtime: 'http', endpoint: AGENT_CONFIG.javaBackend.endpoint }
 */
const copilotConfig: CopilotConfig = {
  runtime: 'browser',
  apiBase: AGENT_CONFIG.siliconflow.apiBase,
  apiKey: AGENT_CONFIG.siliconflow.apiKey,
  model: AGENT_CONFIG.siliconflow.model,
  systemPrompt: ASSISTANT_SYSTEM_PROMPT,
  approvalMode: 'gate',
  botName: '企业 AI 助手',
  showTokenUsage: true,
}

type Tab = 'home' | 'gallery' | 'solutions' | 'playground' | 'protocol-test' | 'llms' | 'docs'
const tab = ref<Tab>('home')
const tabs: { key: Tab; label: string }[] = [
  { key: 'home', label: '首页' },
  { key: 'gallery', label: '组件' },
  { key: 'solutions', label: '解决方案' },
  { key: 'playground', label: '演练场' },
  { key: 'protocol-test', label: '协议测试' },
  { key: 'llms', label: 'AI 文档' },
  { key: 'docs', label: '帮助中心' },
]

function onNavigate(target: string) {
  if (['home', 'gallery', 'solutions', 'playground', 'protocol-test', 'llms', 'docs'].includes(target)) {
    tab.value = target as Tab
  }
}

// 主题切换：亮 / 暗 / 跟随系统，localStorage 持久化；默认亮色
const { mode: themeMode } = useTheme({ initial: 'light' })
</script>

<template>
  <CopilotProvider :config="copilotConfig">
    <div class="app-shell">
      <header class="app-header">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">AC</span>
          <div class="brand-text">
            <strong>Agent Copilot · 企业级 AI UI Kit</strong>
            <span>agent-copilot for Vue 3 · 通用 Agentic 组件库</span>
          </div>
        </div>
        <nav class="app-nav" aria-label="主导航">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            class="nav-btn"
            :class="{ active: tab === t.key }"
            @click="tab = t.key"
          >
            {{ t.label }}
          </button>
        </nav>
        <div class="header-right">
          <ThemeToggle v-model:mode="themeMode" size="sm" />
          <div class="runtime-badge" title="当前运行时">
            <span class="dot" aria-hidden="true" />
            BrowserAgentRuntime · 硅基流动
          </div>
        </div>
      </header>

      <main class="app-main" :class="{ 'app-main--scroll': tab === 'home' || tab === 'protocol-test' }">
        <HomeView v-if="tab === 'home'" @navigate="onNavigate" />
        <GalleryView v-else-if="tab === 'gallery'" />
        <SolutionsView v-else-if="tab === 'solutions'" />
        <PlaygroundView v-else-if="tab === 'playground'" />
        <ProtocolTestView v-else-if="tab === 'protocol-test'" />
        <LlmsView v-else-if="tab === 'llms'" />
        <DocsView v-else />
      </main>
    </div>
  </CopilotProvider>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ac-bg);
  color: var(--ac-fg);
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  height: 56px;
  border-bottom: 1px solid var(--ac-border);
  background: var(--ac-surface);
  flex-shrink: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
}
.brand-text strong {
  font-size: 14px;
  white-space: nowrap;
}
.brand-text span {
  font-size: 11px;
  color: var(--ac-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.app-nav {
  display: flex;
  gap: 4px;
}
.nav-btn {
  border: none;
  background: transparent;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--ac-muted);
  cursor: pointer;
}
.nav-btn:hover {
  color: var(--ac-fg);
  background: var(--ac-surface);
}
.nav-btn.active {
  color: var(--ac-primary);
  background: var(--ac-primary-soft);
  font-weight: 600;
}
.runtime-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ac-muted);
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  padding: 4px 10px;
  white-space: nowrap;
}
.runtime-badge .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ac-success);
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.app-main {
  flex: 1;
  min-height: 0;
}
.app-main--scroll {
  overflow-y: auto;
}

@media (max-width: 720px) {
  .brand-text span,
  .runtime-badge {
    display: none;
  }
}
</style>
