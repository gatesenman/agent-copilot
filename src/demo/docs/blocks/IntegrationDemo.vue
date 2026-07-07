<script setup lang="ts">
/**
 * IntegrationDemo —— 集成方式在线体验块。
 * 左侧切换集成方式，右侧展示可复制代码片段；iframe 方式内嵌真实 /embed.html 预览。
 */
import { computed, ref } from 'vue'

const origin = window.location.origin

const TABS = [
  { id: 'iframe', label: 'iframe 嵌入' },
  { id: 'script', label: 'Script 气泡' },
  { id: 'wc', label: 'Web Component' },
  { id: 'link', label: '分享链接' },
] as const

type TabId = (typeof TABS)[number]['id']
const active = ref<TabId>('iframe')

const embedUrl = `${origin}/embed.html?layout=full&title=${encodeURIComponent('AI 助手')}&theme=auto`

const SNIPPETS: Record<TabId, string> = {
  iframe: `<iframe
  src="${origin}/embed.html?layout=bubble&title=AI%20助手&theme=auto"
  style="width: 420px; height: 640px; border: none; border-radius: 14px"
  allow="clipboard-write"
></iframe>`,
  script: `<script>
  window.agentCopilotConfig = {
    baseUrl: '${origin}',
    title: 'AI 助手',
    theme: 'auto',
  }
<\/script>
<script src="${origin}/embed.js" defer><\/script>`,
  wc: `import { registerAgentCopilotElements } from '@od/agent-copilot-vue'
registerAgentCopilotElements()

<agent-copilot-chat
  title="AI 助手"
  theme="auto"
  style="display: block; height: 600px"
></agent-copilot-chat>`,
  link: embedUrl,
}

const snippet = computed(() => SNIPPETS[active.value])

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(snippet.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch { /* 剪贴板不可用时静默 */ }
}

function openShare() {
  window.open(embedUrl, '_blank', 'noopener')
}
</script>

<template>
  <section class="itg" aria-label="集成方式在线体验">
    <header class="itg__head">
      <p class="itg__title">在线体验</p>
      <div class="itg__tabs" role="tablist" aria-label="集成方式">
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          role="tab"
          class="itg__tab"
          :aria-selected="active === t.id"
          :class="{ 'itg__tab--on': active === t.id }"
          @click="active = t.id"
        >
          {{ t.label }}
        </button>
      </div>
    </header>

    <div class="itg__body">
      <div class="itg__code-wrap">
        <pre class="itg__code"><code>{{ snippet }}</code></pre>
        <div class="itg__actions">
          <button type="button" class="itg__btn" @click="copy">{{ copied ? '已复制' : '复制代码' }}</button>
          <button v-if="active === 'link'" type="button" class="itg__btn itg__btn--ghost" @click="openShare">
            新窗口打开
          </button>
        </div>
      </div>

      <!-- 真实 iframe 预览：嵌入页就是对外交付的 /embed.html -->
      <div class="itg__preview">
        <p class="itg__preview-label">实时预览（/embed.html）</p>
        <iframe
          :src="embedUrl"
          class="itg__frame"
          title="嵌入式对话预览"
          loading="lazy"
          allow="clipboard-write"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.itg {
  border: 1px solid var(--ac-border, #e2e8e5);
  border-radius: 12px;
  overflow: hidden;
  background: var(--ac-surface, #f6f8f7);
}
.itg__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ac-border, #e2e8e5);
}
.itg__title { margin: 0; font-size: 13px; font-weight: 600; color: var(--ac-fg, #1a1f1d); }
.itg__tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.itg__tab {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12.5px;
  color: var(--ac-muted, #5f6b66);
  cursor: pointer;
}
.itg__tab--on {
  background: var(--ac-bg, #fff);
  border-color: var(--ac-border, #e2e8e5);
  color: var(--ac-primary, #0f6b54);
  font-weight: 600;
}
.itg__body { display: flex; flex-direction: column; gap: 0; }
.itg__code-wrap { position: relative; }
.itg__code {
  margin: 0;
  padding: 14px 16px 46px;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  background: var(--ac-bg, #fff);
  color: var(--ac-fg, #1a1f1d);
  white-space: pre;
}
.itg__actions {
  position: absolute;
  bottom: 10px;
  right: 12px;
  display: flex;
  gap: 8px;
}
.itg__btn {
  border: 1px solid var(--ac-border, #e2e8e5);
  background: var(--ac-primary, #0f6b54);
  color: var(--ac-primary-fg, #fff);
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
}
.itg__btn--ghost {
  background: var(--ac-bg, #fff);
  color: var(--ac-fg, #1a1f1d);
}
.itg__preview {
  border-top: 1px solid var(--ac-border, #e2e8e5);
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.itg__preview-label { margin: 0; font-size: 12px; color: var(--ac-muted, #5f6b66); }
.itg__frame {
  width: 100%;
  height: 440px;
  border: 1px solid var(--ac-border, #e2e8e5);
  border-radius: 10px;
  background: var(--ac-bg, #fff);
}
</style>
