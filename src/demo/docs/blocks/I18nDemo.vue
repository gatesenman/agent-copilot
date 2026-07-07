<script setup lang="ts">
/**
 * 多语言实时演示：切换 locale 即时更新组件库全部 UI 文案。
 * key 复用同一 Provider 实例（locale 为响应式 prop，无需重建）。
 */
import { reactive, ref } from 'vue'
import { CopilotProvider, CopilotChat, SessionList, type SessionItem } from '../../../lib/agent-copilot'

const locale = ref<'zh-CN' | 'en-US'>('zh-CN')

const config = reactive({
  agentType: 'chat' as const,
  locale,
  suggestions: false as const,
})

const sessions = ref<SessionItem[]>([
  { id: 's1', title: '产品发布计划', preview: '帮我梳理 Q3 发布节奏…', updatedAt: Date.now() - 3600_000, pinned: true, unread: 2 },
  { id: 's2', title: 'Bug 分析', preview: '这个空指针是怎么触发的？', updatedAt: Date.now() - 86400_000 },
])
</script>

<template>
  <div class="i18n-demo">
    <div class="i18n-demo__bar">
      <span class="i18n-demo__label">locale</span>
      <button
        v-for="l in (['zh-CN', 'en-US'] as const)"
        :key="l"
        type="button"
        class="i18n-demo__btn"
        :class="{ 'is-active': locale === l }"
        @click="locale = l"
      >
        {{ l === 'zh-CN' ? '中文' : 'English' }}
      </button>
    </div>
    <CopilotProvider :config="config">
      <div class="i18n-demo__body">
        <div class="i18n-demo__sessions">
          <SessionList :sessions="sessions" active-id="s1" />
        </div>
        <div class="i18n-demo__chat">
          <CopilotChat height="320px" />
        </div>
      </div>
    </CopilotProvider>
  </div>
</template>

<style scoped>
.i18n-demo {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.i18n-demo__bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.i18n-demo__label {
  font-size: 12px;
  font-family: ui-monospace, monospace;
  color: var(--ac-muted, #6a737d);
}
.i18n-demo__btn {
  padding: 4px 14px;
  border: 1px solid var(--ac-border, #d0d7de);
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  color: inherit;
}
.i18n-demo__btn.is-active {
  background: var(--ac-primary, #1f6e52);
  border-color: var(--ac-primary, #1f6e52);
  color: var(--ac-primary-fg, #fff);
}
.i18n-demo__body {
  display: flex;
  gap: 10px;
  min-height: 320px;
}
.i18n-demo__sessions {
  width: 220px;
  flex-shrink: 0;
}
.i18n-demo__chat {
  flex: 1;
  min-width: 0;
}
</style>
