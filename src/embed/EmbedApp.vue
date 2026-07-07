<script setup lang="ts">
/**
 * EmbedApp —— 独立嵌入对话页（iframe 嵌入 / 独立分享链接的载体）
 *
 * 配置来源（优先级从低到高）：
 *  1. URL 查询参数：layout / title / subtitle / theme / brand / placeholder /
 *     initialMessage / endpoint / runtime / botName
 *  2. 父窗口 postMessage `{ type: 'ac:config', config: {...} }`
 *     （推荐用于注入 apiKey 等敏感项，避免出现在 URL 中）
 *
 * postMessage 协议（与父窗口）：
 *  子 → 父：ac:ready（挂载完成）、ac:close（用户点击收起）、
 *           ac:message（{ role, content } 每条消息完成时）
 *  父 → 子：ac:config（合并运行时配置并重建会话上下文）
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CopilotConfig } from '../lib/agent-copilot'
import { CopilotProvider, CopilotChat } from '../lib/agent-copilot'
import { AGENT_CONFIG } from '../config/agent.config'
import EmbedBridge from './EmbedBridge.vue'

const params = new URLSearchParams(window.location.search)

/** bubble = 气泡窗（配合 embed.js / 自建悬浮按钮）；full = 全屏分享页 */
const layout = params.get('layout') === 'bubble' ? 'bubble' : 'full'
const title = params.get('title') ?? 'AI 助手'
const subtitle = params.get('subtitle') ?? ''
const placeholder = params.get('placeholder') ?? ''
const initialMessage = params.get('initialMessage') ?? ''

function themeParam(): CopilotConfig['theme'] {
  const t = params.get('theme')
  return t === 'dark' || t === 'light' ? t : 'auto'
}

/** URL 参数推导的基础配置（浏览器直连为默认，endpoint 参数切 http 模式） */
function baseConfig(): CopilotConfig {
  const endpoint = params.get('endpoint')
  const cfg: CopilotConfig = {
    theme: themeParam(),
    botName: params.get('botName') ?? title,
    suggestions: false,
  }
  const brand = params.get('brand')
  if (brand) cfg.brandColor = `#${brand.replace(/^#/, '')}`
  if (endpoint) {
    cfg.runtime = 'http'
    cfg.endpoint = endpoint
  } else {
    cfg.runtime = 'browser'
    cfg.apiBase = AGENT_CONFIG.siliconflow.apiBase
    cfg.apiKey = AGENT_CONFIG.siliconflow.apiKey
    cfg.model = AGENT_CONFIG.siliconflow.model
  }
  return cfg
}

const config = ref<CopilotConfig>(baseConfig())
/** 配置变化时重建 Provider（runtime 在 store 创建时固定） */
const configVersion = ref(0)

const isEmbedded = window.self !== window.top

function postToParent(payload: Record<string, unknown>) {
  if (isEmbedded) window.parent.postMessage(payload, '*')
}

function onMessage(e: MessageEvent) {
  const data = e.data
  if (!data || typeof data !== 'object') return
  if (data.type === 'ac:config' && data.config && typeof data.config === 'object') {
    config.value = { ...config.value, ...(data.config as Partial<CopilotConfig>) }
    configVersion.value++
  }
}

function requestClose() {
  postToParent({ type: 'ac:close' })
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  postToParent({ type: 'ac:ready' })
})
onBeforeUnmount(() => window.removeEventListener('message', onMessage))

const rootClass = computed(() => (layout === 'bubble' ? 'embed embed--bubble' : 'embed embed--full'))
</script>

<template>
  <div :class="rootClass">
    <CopilotProvider :key="configVersion" :config="config">
      <EmbedBridge />
      <div class="embed__chat">
        <!-- 气泡态：右上角收起按钮通知父页面隐藏 iframe -->
        <button
          v-if="layout === 'bubble' && isEmbedded"
          type="button"
          class="embed__collapse"
          aria-label="收起对话窗口"
          @click="requestClose"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
        <CopilotChat
          :title="title"
          :subtitle="subtitle"
          :placeholder="placeholder"
          :initial-message="initialMessage"
          :show-header="true"
          :show-reset="true"
        />
      </div>
    </CopilotProvider>
  </div>
</template>

<style scoped>
.embed {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.embed :deep(.ac-root) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.embed__chat {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--ac-bg, #fff);
}
.embed__chat :deep(.ac-chat) {
  flex: 1;
  min-height: 0;
}
/* 全屏分享页：居中限宽，接近 Dify 公开 WebApp 版式 */
.embed--full .embed__chat {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
}
@media (min-width: 900px) {
  .embed--full { padding: 16px; box-sizing: border-box; background: var(--ac-surface, #f6f8f7); }
  .embed--full .embed__chat {
    border: 1px solid var(--ac-border, #e2e8e5);
    border-radius: 14px;
    overflow: hidden;
  }
}
.embed__collapse {
  position: absolute;
  top: 10px;
  right: 44px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ac-muted, #5f6b66);
  cursor: pointer;
}
.embed__collapse:hover { background: var(--ac-surface, #f6f8f7); color: var(--ac-fg, #1a1f1d); }
</style>
