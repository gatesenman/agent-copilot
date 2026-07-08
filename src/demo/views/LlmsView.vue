<script setup lang="ts">
/**
 * AI 文档页 —— llms.txt 风格的一站式 AI 可读文档。
 * 把库的接入方式、组合式 API、事件协议与全组件 API 汇编成单份 Markdown，
 * 供用户复制给 AI 编码助手（Cursor / Copilot 等）或下载为 llms.txt。
 */
import { computed, ref } from 'vue'
import { generateLlmsDoc } from '../ai-docs/llms-doc'
import { buildAguiManifest, validateAguiManifest } from '../ai-docs/agui-manifest'
import { downloadText } from '../../lib/agent-copilot/utils/session-export'
import { copyText } from '../../lib/agent-copilot/utils/clipboard'
import MarkdownText from '../../lib/agent-copilot/components/chat/MarkdownText.vue'

/** 文档视图：rendered 真实渲染 Markdown；raw 原文（复制给 AI 用） */
const viewMode = ref<'rendered' | 'raw'>('rendered')

const doc = generateLlmsDoc()
const stats = computed(() => ({
  chars: doc.length,
  lines: doc.split('\n').length,
  tokens: Math.round(doc.length / 3.2), // 中英混排粗估
}))

// ---- AG-UI 机器可读清单（标准化元信息 + 自校验） ----
const manifest = buildAguiManifest()
const manifestIssues = validateAguiManifest(manifest)
const manifestStats = computed(() => ({
  components: manifest.components.length,
  events: manifest.protocolEvents.length,
  payloads: manifest.payloadTypes.length,
  issues: manifestIssues.length,
}))

const copied = ref(false)
async function copyAll() {
  if (await copyText(doc)) {
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  }
}

function download() {
  downloadText(doc, 'llms.txt')
}

const copiedJson = ref(false)
async function copyManifest() {
  if (await copyText(JSON.stringify(manifest, null, 2))) {
    copiedJson.value = true
    setTimeout(() => (copiedJson.value = false), 1600)
  }
}

function downloadManifest() {
  downloadText(JSON.stringify(manifest, null, 2), 'agui-manifest.json')
}
</script>

<template>
  <div class="llms">
    <div class="llms__inner">
      <header class="llms__head">
        <div class="llms__title-wrap">
          <h1 class="llms__title">AI 文档 · llms.txt</h1>
          <p class="llms__sub text-pretty">
            将本组件库的接入方式、组合式 API、事件流协议与全部组件 API 汇编成单份 AI 可读 Markdown。
            复制给 AI 编码助手（Cursor、GitHub Copilot 等）即可让其正确使用 agent-copilot 开发。
          </p>
        </div>
        <div class="llms__actions">
          <button type="button" class="llms__btn llms__btn--primary" @click="copyAll">
            {{ copied ? '已复制' : '复制全文' }}
          </button>
          <button type="button" class="llms__btn" @click="download">下载 llms.txt</button>
        </div>
      </header>

      <div class="llms__meta">
        <span>{{ stats.lines.toLocaleString() }} 行</span>
        <span>{{ stats.chars.toLocaleString() }} 字符</span>
        <span>约 {{ stats.tokens.toLocaleString() }} tokens</span>
        <span class="llms__meta-note">由「全组件 API 速查」同一数据源生成，随组件演进自动更新</span>
      </div>

      <section class="llms__manifest" aria-labelledby="manifest-title">
        <div class="llms__manifest-head">
          <div>
            <h2 id="manifest-title" class="llms__manifest-title">AG-UI 组件元信息清单（JSON）</h2>
            <p class="llms__manifest-desc text-pretty">
              标准化的机器可读清单：每个组件一条独立记录，含精确导入路径、分类、角色、
              消费的协议事件、载荷类型映射、逐项拆分的 Props / 事件 / 插槽与组合建议。
              适合喂给 AI Agent 做组件选型与代码生成，或作为 MCP 资源暴露。
            </p>
          </div>
          <div class="llms__actions">
            <button type="button" class="llms__btn llms__btn--primary" @click="copyManifest">
              {{ copiedJson ? '已复制' : '复制 JSON' }}
            </button>
            <button type="button" class="llms__btn" @click="downloadManifest">下载 agui-manifest.json</button>
          </div>
        </div>
        <div class="llms__meta">
          <span>{{ manifestStats.components }} 组件</span>
          <span>{{ manifestStats.events }} 协议事件</span>
          <span>{{ manifestStats.payloads }} 载荷类型</span>
          <span :class="['llms__check', manifestStats.issues === 0 ? 'llms__check--ok' : 'llms__check--bad']">
            自校验：{{ manifestStats.issues === 0 ? '通过' : `${manifestStats.issues} 个问题` }}
          </span>
        </div>
        <ul v-if="manifestIssues.length" class="llms__issues">
          <li v-for="issue in manifestIssues" :key="issue">{{ issue }}</li>
        </ul>
      </section>

      <div class="llms__view-bar" role="tablist" aria-label="文档视图切换">
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'rendered'"
          :class="['llms__view-btn', { 'llms__view-btn--active': viewMode === 'rendered' }]"
          @click="viewMode = 'rendered'"
        >
          渲染视图
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'raw'"
          :class="['llms__view-btn', { 'llms__view-btn--active': viewMode === 'raw' }]"
          @click="viewMode = 'raw'"
        >
          原文 llms.txt
        </button>
      </div>

      <div v-if="viewMode === 'rendered'" class="llms__doc llms__doc--rendered" aria-label="AI 可读文档（渲染）">
        <MarkdownText :content="doc" />
      </div>
      <pre v-else class="llms__doc" tabindex="0" aria-label="AI 可读文档全文">{{ doc }}</pre>
    </div>
  </div>
</template>

<style scoped>
.llms {
  height: 100%;
  overflow-y: auto;
  background: var(--ac-bg);
}
.llms__inner {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 24px 48px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.llms__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.llms__title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
}
.llms__sub {
  margin: 0;
  max-width: 640px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ac-muted);
}
.llms__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.llms__btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--ac-border);
  background: var(--ac-surface);
  color: var(--ac-fg);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.llms__btn:hover { border-color: var(--ac-primary); color: var(--ac-primary); }
.llms__btn--primary {
  background: var(--ac-primary);
  border-color: var(--ac-primary);
  color: var(--ac-primary-fg);
}
.llms__btn--primary:hover { opacity: 0.9; color: var(--ac-primary-fg); }
.llms__meta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--ac-muted);
}
.llms__meta-note { opacity: 0.8; }
.llms__manifest {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid var(--ac-border);
  border-radius: 12px;
  background: var(--ac-surface);
}
.llms__manifest-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.llms__manifest-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
}
.llms__manifest-desc {
  margin: 0;
  max-width: 560px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--ac-muted);
}
.llms__check { font-weight: 600; }
.llms__check--ok { color: var(--ac-success, #16a34a); }
.llms__check--bad { color: var(--ac-danger, #dc2626); }
.llms__issues {
  margin: 0;
  padding: 8px 12px 8px 28px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ac-danger, #dc2626) 8%, transparent);
  font-size: 12px;
  color: var(--ac-danger, #dc2626);
}
.llms__view-bar {
  display: flex;
  gap: 4px;
  align-self: flex-start;
  padding: 3px;
  border: 1px solid var(--ac-border);
  border-radius: 9px;
  background: var(--ac-surface);
}
.llms__view-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--ac-muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.llms__view-btn:hover { color: var(--ac-fg); }
.llms__view-btn--active {
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
}
.llms__doc {
  margin: 0;
  padding: 20px;
  border: 1px solid var(--ac-border);
  border-radius: 12px;
  background: var(--ac-surface);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--ac-fg);
}
.llms__doc--rendered {
  font-family: inherit;
  font-size: 13.5px;
  white-space: normal;
  padding: 24px 28px;
}
</style>
