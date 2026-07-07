<script setup lang="ts">
/**
 * 组件能力演示 —— 全部组件直接铺开展示（无 Agent 页签）：
 * 顶部是一个复杂实时演示（全能助手：知识/代码/数据三域工具全量注册，真实模型驱动），
 * 之后所有组件分区依次直铺，左侧锚点导航快速跳转。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CopilotSidebar from '../../lib/agent-copilot/components/chat/CopilotSidebar.vue'
import CopilotPopup from '../../lib/agent-copilot/components/chat/CopilotPopup.vue'
import CopilotTextarea from '../../lib/agent-copilot/components/textarea/CopilotTextarea.vue'
import ToolActionCard from '../../lib/agent-copilot/components/agentic/ToolActionCard.vue'
import PayloadCard from '../../lib/agent-copilot/components/generative-ui/PayloadCard.vue'
import type { ToolCallState } from '../../lib/agent-copilot/types'
import OmniComposedDemo from '../gallery/OmniComposedDemo.vue'
import ProtocolMatrix from '../gallery/ProtocolMatrix.vue'
import EnterpriseGalleryPane from '../gallery/EnterpriseGalleryPane.vue'
import AgenticGalleryPane from '../gallery/AgenticGalleryPane.vue'
import MarkdownShowcase from '../gallery/MarkdownShowcase.vue'
import ProtocolShowcase from '../gallery/ProtocolShowcase.vue'
import { SAMPLES_BY_AGENT } from '../gallery/payload-samples'
import { omniAgentActions, omniAgentConfig } from '../gallery/agent-demos'
// 组件用法文档块（用法指导 + 属性表 + 在线改配置驱动预览）
import ModeSelectorDemo from '../docs/blocks/ModeSelectorDemo.vue'
import ThinkingBlockDemo from '../docs/blocks/ThinkingBlockDemo.vue'
import TaskTrackerDemo from '../docs/blocks/TaskTrackerDemo.vue'
import PlanPanelDemo from '../docs/blocks/PlanPanelDemo.vue'
import ChangeReviewDemo from '../docs/blocks/ChangeReviewDemo.vue'
import AgentFormDemo from '../docs/blocks/AgentFormDemo.vue'
import InputToolbarDemo from '../docs/blocks/InputToolbarDemo.vue'
import MarkdownLiveDemo from '../docs/blocks/MarkdownLiveDemo.vue'
import ProtocolBadgeDemo from '../docs/blocks/ProtocolBadgeDemo.vue'
import SessionListDemo from '../docs/blocks/SessionListDemo.vue'
import UsageMeterDemo from '../docs/blocks/UsageMeterDemo.vue'
import ApiReferencePane from '../gallery/ApiReference.vue'

// ---- 锚点导航（按组件库行业标准分组：总览 → 开发者参考 → 按功能域分类） ----
interface NavGroup { label: string; items: { id: string; label: string }[] }
const NAV_GROUPS: NavGroup[] = [
  {
    label: '总览',
    items: [{ id: 'live', label: '综合实时演示' }],
  },
  {
    label: '开发者参考',
    items: [
      { id: 'api', label: 'API 速查（全组件）' },
      { id: 'docs', label: '交互式用法文档' },
    ],
  },
  {
    label: '对话与输入',
    items: [{ id: 'general', label: '智能输入 · 流程反馈' }],
  },
  {
    label: '数据展示',
    items: [
      { id: 'payloads', label: '生成式 UI 载荷卡' },
      { id: 'markdown', label: 'Markdown 渲染' },
    ],
  },
  {
    label: '智能体工作台',
    items: [{ id: 'agentic', label: 'Agentic 组件' }],
  },
  {
    label: '企业与治理',
    items: [{ id: 'enterprise', label: '企业治理组件' }],
  },
  {
    label: '协议与集成',
    items: [
      { id: 'protocol-ui', label: '协议组件（A2A / MCP）' },
      { id: 'protocols', label: '接入矩阵（32 厂商）' },
    ],
  },
]
const SECTIONS = NAV_GROUPS.flatMap((g) => g.items)

const activeSection = ref('live')
const scrollEl = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { activeSection.value = e.target.id; break }
      }
    },
    { root: scrollEl.value, rootMargin: '0px 0px -70% 0px', threshold: 0 },
  )
  for (const s of SECTIONS) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
})
onBeforeUnmount(() => observer?.disconnect())

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ---- 全部载荷示例（三域 + 通用直铺） ----
const ALL_PAYLOAD_GROUPS = [
  { key: 'chat', label: 'Chat — RAG 引用 · 计划步骤', items: SAMPLES_BY_AGENT.chat },
  { key: 'code', label: 'Code — 代码块 · Diff · 文件树 · 终端', items: SAMPLES_BY_AGENT.code },
  { key: 'data', label: 'Data — 指标 · 图表 · SQL · 表格', items: SAMPLES_BY_AGENT.data },
  { key: 'general', label: '通用 — 图像 · 方案对比', items: SAMPLES_BY_AGENT.general },
] as const

// ---- 通用组件静态演示数据 ----
const draft = ref('')

// ---- CopilotTextarea 演示 mock provider（无 API Key 也可体验） ----
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function demoSuggest(text: string): Promise<string> {
  await sleep(450)
  if (/进展|进度/.test(text)) return '目前核心模块已完成联调，预计本周五前交付测试环境。'
  if (/您好|你好/.test(text)) return '感谢各位本周的紧密配合，以下同步项目最新进展。'
  if (/问题|风险/.test(text)) return '主要集中在接口联调延迟，已协调后端团队优先处理。'
  return '如有任何疑问，欢迎随时与我联系。'
}

async function demoTransform(instruction: string, selection: string): Promise<string> {
  await sleep(700)
  if (/精简|压缩/.test(instruction)) return selection.length > 20 ? selection.slice(0, Math.ceil(selection.length / 2)) + '……（已精简）' : selection
  if (/英文|翻译|译/.test(instruction)) return '[EN] Thanks for your support this week. Here is the latest project update.'
  if (/扩写/.test(instruction)) return selection + '具体而言，我们在本阶段完成了需求评审、技术方案定稿与核心链路开发，并同步启动了自动化回归。'
  return selection.replace(/。$/, '') + '（已按"' + instruction.slice(0, 12) + '"润色）。'
}

const demoToolCall: ToolCallState = {
  id: 'tc_demo',
  name: 'search_suppliers',
  args: { category: '办公用品', qualified: true },
  status: 'succeeded',
  result: { count: 3, top: '晨光文具' },
  origin: 'frontend',
}

</script>

<template>
  <div ref="scrollEl" class="gallery">
    <div class="gallery-inner">
      <!-- 左侧锚点导航（视觉打平，分组仅保留在数据结构中） -->
      <nav class="g-anchor" aria-label="组件分区导航">
        <span class="g-anchor__title">组件分区</span>
        <button
          v-for="s in SECTIONS"
          :key="s.id"
          type="button"
          class="g-anchor__item"
          :class="{ 'is-active': activeSection === s.id }"
          @click="jumpTo(s.id)"
        >
          {{ s.label }}
        </button>
      </nav>

      <!-- 主内容：全部分区直铺 -->
      <main class="g-main">
        <header class="g-head">
          <h1>组件能力演示</h1>
          <p>
            全部组件直接铺开展示：顶部是一个复杂实时演示（三域工具全量注册、真实模型驱动），
            其后 16 种生成式 UI 载荷卡、Agentic 工作台、企业组件、Markdown、协议组件依次呈现。
          </p>
        </header>

        <!-- ============ 复杂实时演示（一个例子覆盖全部能力） ============ -->
        <section id="live" class="g-block">
          <h2 class="g-block__title">复杂实时演示 — 全能助手（显式组装 · 真实调用）</h2>
          <p class="g-desc">
            这个对话面<strong>没有使用封装好的 CopilotChat 整件</strong>，而是用库中的原子组件逐块拼装：
            MessageBubble、ApprovalCard、ChatSuggestions、ChatInput、UsageMeter，
            全部通过 useCopilot() 共享同一会话状态（每个块右上角标注了所用组件，底部可查看约 25 行的组装代码）。
            Agent 同时注册知识检索、代码生成、数据分析等多域工具，模型按意图自动选卡渲染。试试下面任意一句：
          </p>
          <ul class="g-tips">
            <li>「差旅报销流程是什么？」→ RAG 检索 + 引用来源卡 + 步骤计划卡</li>
            <li>「写一个 TypeScript 防抖函数并跑测试」→ 代码卡 + 终端卡 + 文件树</li>
            <li>「本季度运营指标怎么样？画个部门对比图」→ 指标卡 + 图表卡 + SQL 结果</li>
          </ul>
          <OmniComposedDemo :config="omniAgentConfig" :actions="omniAgentActions" height="560px" />
        </section>

        <!-- ============ 全组件 API 速查 ============ -->
        <section id="api" class="g-block g-block--narrow">
          <h2 class="g-block__title">全组件 API 速查 — Props / 事件 / 插槽</h2>
          <p class="g-desc">
            覆盖库中全部组件域（对话、输入、Agentic、工作台、生成式 UI、企业、协议）的
            完整 API 参考，从库源码 defineProps / defineEmits 提取整理。支持关键字搜索（组件名、属性名、说明均可命中），
            每个组件附「何时用」的选型指导。
          </p>
          <ApiReferencePane />
        </section>

        <!-- ============ 组件用法文档：用法指导 + 属性表 + 在线改配置 ============ -->
        <section id="docs" class="g-block g-block--narrow">
          <h2 class="g-block__title">组件用法文档 — 在线改配置驱动</h2>
          <p class="g-desc">
            每个组件带用法指导（何时用/怎么接）、完整属性 API 表，右侧属性编辑器实时驱动预览，底部自动生成可复制的使用代码。
          </p>
          <ModeSelectorDemo />
          <ThinkingBlockDemo />
          <TaskTrackerDemo />
          <PlanPanelDemo />
          <ChangeReviewDemo />
          <AgentFormDemo />
          <InputToolbarDemo />
          <MarkdownLiveDemo />
          <ProtocolBadgeDemo />
          <SessionListDemo />
          <UsageMeterDemo />
        </section>

        <!-- ============ 对话与输入：智能输入 · 流程反馈 ============ -->
        <section id="general" class="g-block g-block--narrow">
          <h2 class="g-block__title">对话与输入 — 智能输入 · 流程反馈</h2>

          <div class="g-sub">
            <h3>CopilotTextarea — AI 智能文本域</h3>
            <p class="g-desc">
              输入停顿约 1 秒出现灰色幽灵补全：<kbd>Tab</kbd> 全部接受、<kbd>Ctrl+→</kbd> 逐词接受、<kbd>Esc</kbd> 忽略；
              选中一段文本唤起 AI 工具条（润色 / 精简 / 扩写 / 译英 / 自定义指令，<kbd>Ctrl+K</kbd> 快捷唤起）；
              任何 AI 写入可一键撤销。本演示接入 mock provider，无需 API Key 即可体验。
            </p>
            <CopilotTextarea
              v-model="draft"
              purpose="撰写一段发给合作团队的项目进度邮件（中文商务语气）"
              placeholder="试试输入：您好，本周项目进展如下…（停顿 1 秒看补全）"
              :rows="6"
              :max-length="500"
              :suggestion-provider="demoSuggest"
              :transform-provider="demoTransform"
            />
          </div>

          <div class="g-sub">
            <h3>ToolActionCard — 工具调用卡（语义化）</h3>
            <p class="g-desc">按工具名自动推断种类图标与主参数摘要，是库中工具调用渲染的唯一标准组件。</p>
            <ToolActionCard :tool-call="demoToolCall" />
          </div>

          <p class="g-note">
            右下角是 <strong>CopilotPopup</strong>，右侧边缘是 <strong>CopilotSidebar</strong>
            的开关，两者与顶部全能助手共享同一个 Agent 会话上下文。
          </p>
        </section>

        <!-- ============ 数据展示：生成式 UI 载荷卡 ============ -->
        <section id="payloads" class="g-block">
          <h2 class="g-block__title">生成式 UI 载荷卡 — 16 种结构化载荷</h2>
          <p class="g-desc">全部载荷组件按领域直铺展示（静态示例数据），也可通过 registerPayloadRenderer 注册自定义渲染。</p>
          <div v-for="group in ALL_PAYLOAD_GROUPS" :key="group.key" class="g-payload-group">
            <h3 class="g-payload-group__label">{{ group.label }}</h3>
            <div class="g-payload-grid">
              <PayloadCard v-for="(p, i) in group.items" :key="i" :payload="p" />
            </div>
          </div>
        </section>

        <!-- ============ 数据展示：Markdown 渲染 ============ -->
        <section id="markdown" class="g-block g-block--narrow">
          <h2 class="g-block__title">Markdown 渲染</h2>
          <MarkdownShowcase />
        </section>

        <!-- ============ 智能体工作台 ============ -->
        <section id="agentic" class="g-block">
          <h2 class="g-block__title">智能体工作台 — Agentic 组件</h2>
          <AgenticGalleryPane />
        </section>

        <!-- ============ 企业与治理 ============ -->
        <section id="enterprise" class="g-block">
          <h2 class="g-block__title">企业与治理 — 企业治理组件</h2>
          <EnterpriseGalleryPane />
        </section>

        <!-- ============ 协议与集成：协议组件 ============ -->
        <section id="protocol-ui" class="g-block">
          <h2 class="g-block__title">协议组件 — A2A / MCP</h2>
          <ProtocolShowcase />
        </section>

        <!-- ============ 协议与集成：接入矩阵 ============ -->
        <section id="protocols" class="g-block g-block--narrow">
          <h2 class="g-block__title">协议接入矩阵 — 32 种厂商 / 框架</h2>
          <ProtocolMatrix />
        </section>
      </main>
    </div>

    <!-- 悬浮组件（真实可用，与全局会话共享） -->
    <CopilotSidebar title="侧栏助手" subtitle="CopilotSidebar 演示" />
    <CopilotPopup title="AI 助手" subtitle="CopilotPopup 演示" />
  </div>
</template>

<style scoped>
.gallery {
  height: 100%;
  overflow-y: auto;
  background: var(--ac-bg);
  scroll-behavior: smooth;
}
.gallery-inner {
  max-width: 1360px;
  margin: 0 auto;
  padding: 28px 24px 120px;
  display: flex;
  gap: 28px;
  align-items: flex-start;
}

/* 锚点导航 */
.g-anchor {
  position: sticky;
  top: 0;
  flex-shrink: 0;
  width: 176px;
  display: none;
  flex-direction: column;
  gap: 2px;
  padding: 12px 0;
}
@media (min-width: 1080px) {
  .g-anchor { display: flex; }
}
.g-anchor__title {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ac-muted);
  padding: 0 12px 8px;
}
.g-anchor__item {
  text-align: left;
  padding: 7px 12px;
  border: none;
  border-left: 2px solid var(--ac-border);
  background: transparent;
  font-size: 13px;
  color: var(--ac-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.g-anchor__item:hover { color: var(--ac-fg); }
.g-anchor__item.is-active {
  color: var(--ac-primary);
  border-left-color: var(--ac-primary);
  font-weight: 650;
}

/* 主内容 */
.g-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 44px;
}
.g-head h1 { font-size: 24px; margin: 0 0 8px; }
.g-head p {
  color: var(--ac-muted);
  line-height: 1.6;
  margin: 0;
  max-width: 760px;
  text-wrap: pretty;
}

.g-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
  scroll-margin-top: 16px;
}
.g-block--narrow { max-width: 880px; }
.g-block__title {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: var(--ac-fg);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ac-border);
}
.g-desc {
  color: var(--ac-muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
  text-wrap: pretty;
}
.g-tips {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ac-muted);
}

/* 载荷卡分组 */
.g-payload-group { display: flex; flex-direction: column; gap: 10px; }
.g-payload-group__label {
  margin: 6px 0 0;
  font-size: 14px;
  font-weight: 650;
  color: var(--ac-fg);
}
.g-payload-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  align-items: start;
}
@media (min-width: 1080px) {
  .g-payload-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}

/* 通用组件子块 */
.g-sub { display: flex; flex-direction: column; gap: 8px; }
.g-sub h3 { font-size: 15.5px; margin: 0; }
.g-gap { height: 12px; }
.g-note {
  font-size: 13px;
  line-height: 1.7;
  color: var(--ac-muted);
  border: 1px dashed var(--ac-border);
  border-radius: 10px;
  padding: 12px 14px;
  margin: 0;
  text-wrap: pretty;
}
kbd {
  background: var(--ac-surface);
  border: 1px solid var(--ac-border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 12px;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
}
</style>
