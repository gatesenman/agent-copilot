<script setup lang="ts">
/**
 * 主题定制实时演示：
 * 左侧调整预设 / 品牌色 / 圆角 / 字号 / 亮暗，右侧 CopilotChat 即时反映。
 */
import { computed, reactive } from 'vue'
import type { CopilotConfig } from '../../../lib/agent-copilot'
import { THEME_PRESETS, type ThemePresetId } from '../../../lib/agent-copilot'
import CopilotProvider from '../../../lib/agent-copilot/components/CopilotProvider.vue'
import CopilotChat from '../../../lib/agent-copilot/components/chat/CopilotChat.vue'

const state = reactive({
  preset: 'default' as ThemePresetId,
  brandColor: '',
  radius: 10,
  fontSize: 14,
  theme: 'light' as 'light' | 'dark',
})

const presetIds = Object.keys(THEME_PRESETS) as ThemePresetId[]

const config = computed<CopilotConfig>(() => ({
  agentType: 'chat',
  botName: '主题预览',
  theme: state.theme,
  themePreset: state.preset,
  brandColor: state.brandColor || undefined,
  themeTokens: {
    radius: state.radius,
    fontSize: state.fontSize,
  },
  suggestions: {
    static: [
      { title: '建议问题', message: '这是一条建议问题' },
      { title: '主题预览', message: '主题色随配置实时变化' },
    ],
  },
}))

function presetSwatch(id: ThemePresetId) {
  return THEME_PRESETS[id][state.theme].primary
}
</script>

<template>
  <div class="tc">
    <div class="tc__controls">
      <div class="tc__group">
        <span class="tc__label">预设主题</span>
        <div class="tc__presets">
          <button
            v-for="id in presetIds"
            :key="id"
            type="button"
            class="tc__preset"
            :class="{ 'tc__preset--active': state.preset === id && !state.brandColor }"
            :title="THEME_PRESETS[id].label"
            @click="state.preset = id; state.brandColor = ''"
          >
            <span class="tc__swatch" :style="{ background: presetSwatch(id) }" />
            <span>{{ THEME_PRESETS[id].label.split(' · ').pop() }}</span>
          </button>
        </div>
      </div>

      <div class="tc__group">
        <span class="tc__label">自定义品牌色（覆盖预设）</span>
        <div class="tc__row">
          <input
            v-model="state.brandColor"
            type="color"
            class="tc__color"
            aria-label="品牌色"
            @input="(e) => (state.brandColor = (e.target as HTMLInputElement).value)"
          />
          <code class="tc__code">{{ state.brandColor || '未设置' }}</code>
          <button v-if="state.brandColor" type="button" class="tc__clear" @click="state.brandColor = ''">清除</button>
        </div>
      </div>

      <div class="tc__group">
        <span class="tc__label">圆角 {{ state.radius }}px</span>
        <input v-model.number="state.radius" type="range" min="0" max="20" aria-label="圆角" />
      </div>

      <div class="tc__group">
        <span class="tc__label">字号 {{ state.fontSize }}px</span>
        <input v-model.number="state.fontSize" type="range" min="12" max="17" aria-label="字号" />
      </div>

      <div class="tc__group">
        <span class="tc__label">模式</span>
        <div class="tc__row">
          <button
            type="button"
            class="tc__mode"
            :class="{ 'tc__mode--active': state.theme === 'light' }"
            @click="state.theme = 'light'"
          >
            亮色
          </button>
          <button
            type="button"
            class="tc__mode"
            :class="{ 'tc__mode--active': state.theme === 'dark' }"
            @click="state.theme = 'dark'"
          >
            暗色
          </button>
        </div>
      </div>
    </div>

    <div class="tc__preview">
      <CopilotProvider :config="config">
        <div class="tc__pane">
          <CopilotChat :show-reset="true" />
        </div>
      </CopilotProvider>
    </div>
  </div>
</template>

<style scoped>
.tc {
  display: flex;
  gap: 16px;
  align-items: stretch;
}
.tc__controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 240px;
  flex-shrink: 0;
}
.tc__group { display: flex; flex-direction: column; gap: 6px; }
.tc__label { font-size: 12px; font-weight: 600; color: var(--ac-muted, #5f6b66); }
.tc__presets { display: flex; flex-wrap: wrap; gap: 6px; }
.tc__preset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--ac-border, #e2e8e5);
  border-radius: 8px;
  background: var(--ac-bg, #fff);
  font-size: 12px;
  cursor: pointer;
  color: var(--ac-fg, #1a1f1d);
}
.tc__preset--active { border-color: var(--ac-primary, #0f6b54); box-shadow: 0 0 0 1px var(--ac-primary, #0f6b54); }
.tc__swatch { width: 12px; height: 12px; border-radius: 50%; }
.tc__row { display: flex; align-items: center; gap: 8px; }
.tc__color { width: 36px; height: 28px; padding: 0; border: 1px solid var(--ac-border, #e2e8e5); border-radius: 6px; background: none; cursor: pointer; }
.tc__code { font-size: 12px; color: var(--ac-muted, #5f6b66); }
.tc__clear {
  padding: 2px 8px;
  border: 1px solid var(--ac-border, #e2e8e5);
  border-radius: 6px;
  background: none;
  font-size: 11px;
  cursor: pointer;
  color: var(--ac-muted, #5f6b66);
}
.tc__mode {
  padding: 5px 14px;
  border: 1px solid var(--ac-border, #e2e8e5);
  border-radius: 8px;
  background: var(--ac-bg, #fff);
  font-size: 12px;
  cursor: pointer;
  color: var(--ac-fg, #1a1f1d);
}
.tc__mode--active {
  background: var(--ac-primary, #0f6b54);
  color: var(--ac-primary-fg, #fff);
  border-color: var(--ac-primary, #0f6b54);
}
.tc__preview { flex: 1; min-width: 0; }
.tc__pane {
  height: 440px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ac-border, #e2e8e5);
  border-radius: 12px;
  overflow: hidden;
  background: var(--ac-bg, #fff);
}
.tc__pane :deep(.ac-chat) { height: 100%; }

@media (max-width: 720px) {
  .tc { flex-direction: column; }
  .tc__controls { width: 100%; }
}
</style>
