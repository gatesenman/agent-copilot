<script setup lang="ts">
/**
 * 解决方案 — 按业界主流 Agent 产品形态分类演示（不绑定行业业务）：
 *   对话形态：Chat Assistant / RAG 检索问答
 *   执行形态：Deep Research / 工具编排（ReAct）
 *   工作台形态：Coding Agent / 数据分析 / HITL 人机协同 / 自主执行 Shell
 * 既有工作台视图直接复用；对话与执行形态由 agent-form-demos 驱动（真实模型）。
 */
import { computed, ref } from 'vue'
import WorkbenchView from './WorkbenchView.vue'
import CodingWorkbenchView from './CodingWorkbenchView.vue'
import DataWorkbenchView from './DataWorkbenchView.vue'
import AgenticShellView from './AgenticShellView.vue'
import SolutionWorkbench from '../solutions/SolutionWorkbench.vue'
import type { SolutionWorkbenchData } from '../solutions/solution-workbench-data'
import {
  chatAssistantActions, chatAssistantConfig, chatAssistantWb,
  deepResearchActions, deepResearchConfig, deepResearchWb,
  ragAgentActions, ragAgentConfig, ragAgentWb,
  toolUseActions, toolUseConfig, toolUseWb,
} from '../solutions/agent-form-demos'
import type { CopilotActionDef, CopilotConfig } from '../../lib/agent-copilot'

type SolutionId =
  | 'chat' | 'rag'
  | 'research' | 'tooluse'
  | 'coding' | 'data' | 'hitl' | 'autonomous'

interface PaneSolution {
  kind: 'pane'
  title: string
  desc: string
  tips: string[]
  config: CopilotConfig
  actions: CopilotActionDef[]
  /** 工作台装配数据：左栏业务上下文 + 右栏任务/来源/会话/用量 */
  workbench: SolutionWorkbenchData
}
interface ViewSolution { kind: 'view' }

interface Solution {
  id: SolutionId
  label: string
  desc: string
  detail: PaneSolution | ViewSolution
}

interface SolutionGroup {
  name: string
  hint: string
  items: Solution[]
}

const GROUPS: SolutionGroup[] = [
  {
    name: '对话形态',
    hint: '以多轮对话为核心交互的 Agent',
    items: [
      {
        id: 'chat',
        label: '对话助手 Chat Assistant',
        desc: '多轮对话 · 流式输出 · 建议追问',
        detail: {
          kind: 'pane',
          title: '对话助手（Chat Assistant）',
          desc: 'ChatGPT 式基础形态：多轮上下文对话、Token 流式渲染、Markdown 富文本、追问建议与反馈采集',
          tips: [
            '任意提问 → 流式 Markdown 回答',
            '连续追问 → 上下文记忆保持连贯',
            '回答下方 → 建议追问 + 点赞/点踩反馈',
          ],
          config: chatAssistantConfig,
          actions: chatAssistantActions,
          workbench: chatAssistantWb,
        },
      },
      {
        id: 'rag',
        label: 'RAG 检索问答',
        desc: '先检索后生成 · 引用溯源 · 拒绝幻觉',
        detail: {
          kind: 'pane',
          title: 'RAG 检索问答（Retrieval Agent）',
          desc: 'NotebookLM / Perplexity 式形态：回答前强制检索文档片段，答案带引用编号与相似度分数，检索不到即明确拒答',
          tips: [
            '「这套文档的整体架构是怎样的？」→ 引用来源卡 + 带引用回答',
            '「部署对资源规格有什么要求？」→ 片段检索 + 溯源',
            '右侧「来源」页签 → 全部已检索片段',
          ],
          config: ragAgentConfig,
          actions: ragAgentActions,
          workbench: ragAgentWb,
        },
      },
    ],
  },
  {
    name: '执行形态',
    hint: '模型自主规划并多步执行的 Agent',
    items: [
      {
        id: 'research',
        label: 'Deep Research 深度研究',
        desc: '研究计划 · 多轮检索 · 汇总报告',
        detail: {
          kind: 'pane',
          title: 'Deep Research（深度研究）',
          desc: 'OpenAI / Gemini Deep Research 式形态：主题拆解为研究计划 → 逐个子问题检索取证 → 汇总结构化报告，全程可旁观',
          tips: [
            '「研究一下大模型推理成本的优化路线」→ 计划卡 → 检索卡 → 报告',
            '过程中 → 计划步骤状态实时推进',
            '最终 → Markdown 结构化研究报告',
          ],
          config: deepResearchConfig,
          actions: deepResearchActions,
          workbench: deepResearchWb,
        },
      },
      {
        id: 'tooluse',
        label: '工具编排 Tool-use',
        desc: 'ReAct 循环 · 自主选工具 · 多工具串联',
        detail: {
          kind: 'pane',
          title: '工具编排（Tool-use Agent）',
          desc: 'Function Calling / MCP 基础形态：模型按 ReAct 循环自主决定调用哪些工具、以什么顺序串联，每个工具产出一张生成式 UI 卡',
          tips: [
            '「查一下最近四周的记录并画成趋势图」→ 表格 → 折线图（两工具串联）',
            '「算一下均值和标准差」→ 统计指标卡',
            '「查询→统计→可视化一次完成」→ 三工具链',
          ],
          config: toolUseConfig,
          actions: toolUseActions,
          workbench: toolUseWb,
        },
      },
    ],
  },
  {
    name: '工作台形态',
    hint: '带专属工作面板的重型 Agent',
    items: [
      {
        id: 'coding',
        label: 'Coding Agent',
        desc: '模式选择 · 计划执行 · 变更审查 · 终端',
        detail: { kind: 'view' },
      },
      {
        id: 'data',
        label: '数据分析 Agent',
        desc: '指标卡 · SQL 结果 · 图表 · 增强表格',
        detail: { kind: 'view' },
      },
      {
        id: 'hitl',
        label: 'HITL 人机协同',
        desc: '执行前审批 · 中断恢复 · 治理审计',
        detail: { kind: 'view' },
      },
      {
        id: 'autonomous',
        label: '自主执行 Shell',
        desc: '五面板工作台 · 计划/文件/终端/浏览器',
        detail: { kind: 'view' },
      },
    ],
  },
]

const active = ref<SolutionId>('chat')

const activeSolution = computed(() => {
  for (const g of GROUPS) {
    const found = g.items.find((s) => s.id === active.value)
    if (found) return found
  }
  return GROUPS[0].items[0]
})

const activePane = computed(() =>
  activeSolution.value.detail.kind === 'pane' ? (activeSolution.value.detail as PaneSolution) : null,
)
</script>

<template>
  <div class="sol">
    <!-- 左：行业分类导航 -->
    <nav class="sol-nav" aria-label="解决方案分类">
      <div v-for="g in GROUPS" :key="g.name" class="sol-group">
        <div class="sol-group__head">
          <span class="sol-group__name">{{ g.name }}</span>
          <span class="sol-group__hint">{{ g.hint }}</span>
        </div>
        <button
          v-for="s in g.items"
          :key="s.id"
          type="button"
          class="sol-item"
          :class="{ 'sol-item--active': active === s.id }"
          :aria-pressed="active === s.id"
          @click="active = s.id"
        >
          <span class="sol-item__label">{{ s.label }}</span>
          <span class="sol-item__desc">{{ s.desc }}</span>
        </button>
      </div>
    </nav>

    <!-- 右：场景内容 -->
    <div class="sol-body">
      <!-- 补充的行业场景：真实模型驱动的演示面 -->
      <template v-if="activePane">
        <div :key="activeSolution.id" class="sol-pane">
          <header class="sol-pane__head">
            <div>
              <h2 class="sol-pane__title">{{ activePane.title }}</h2>
              <p class="sol-pane__desc">{{ activePane.desc }}</p>
            </div>
            <span class="sol-pane__badge">真实模型驱动</span>
          </header>
          <ul class="sol-pane__tips">
            <li v-for="t in activePane.tips" :key="t">{{ t }}</li>
          </ul>
          <div class="sol-pane__demo">
            <SolutionWorkbench
              :config="activePane.config"
              :actions="activePane.actions"
              :sidebar="activePane.workbench.sidebar"
              :sidebar-title="activePane.workbench.sidebarTitle"
              :banner="activePane.workbench.banner"
              :tasks="activePane.workbench.tasks"
              :sources="activePane.workbench.sources"
              :sessions="activePane.workbench.sessions"
              :usage="activePane.workbench.usage"
            />
          </div>
        </div>
      </template>

      <!-- 复用的既有工作台 -->
      <WorkbenchView v-else-if="active === 'hitl'" />
      <CodingWorkbenchView v-else-if="active === 'coding'" />
      <DataWorkbenchView v-else-if="active === 'data'" />
      <AgenticShellView v-else />
    </div>
  </div>
</template>

<style scoped>
.sol {
  display: flex;
  gap: 20px;
  height: 100%;
  min-height: 0;
  padding: 16px 20px;
  box-sizing: border-box;
}

/* ---- 左侧分类导航 ---- */
.sol-nav {
  width: 248px;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 2px 4px 16px 2px;
}
.sol-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sol-group__head {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0 4px;
}
.sol-group__name {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--demo-fg, #111827);
}
.sol-group__hint {
  font-size: 11px;
  color: var(--demo-muted, #94a3b8);
}
.sol-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 12px;
  border: 1px solid var(--demo-border, #e2e8f0);
  border-radius: 10px;
  background: var(--demo-panel, #fff);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sol-item:hover { border-color: color-mix(in srgb, var(--ac-primary, #0f766e) 40%, transparent); }
.sol-item--active {
  border-color: var(--ac-primary, #0f766e);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ac-primary, #0f766e) 12%, transparent);
}
.sol-item__label { font-size: 13.5px; font-weight: 700; color: var(--demo-fg, #111827); }
.sol-item__desc { font-size: 11.5px; color: var(--demo-muted, #64748b); }

/* ---- 右侧内容（固定撑满视口剩余高度，所有方案统一） ---- */
.sol-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.sol-body > * {
  flex: 1;
  min-height: 0;
}

.sol-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}
.sol-pane__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.sol-pane__title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--ac-fg, #111827);
}
.sol-pane__desc {
  margin: 0;
  font-size: 13px;
  color: var(--ac-muted, #64748b);
  line-height: 1.6;
}
.sol-pane__badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ac-primary, #0f766e) 10%, transparent);
  color: var(--ac-primary, #0f766e);
  font-size: 12px;
  font-weight: 600;
}
.sol-pane__tips {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ac-muted, #64748b);
  columns: 2;
}
.sol-pane__demo { flex: 1; min-height: 0; }

@media (max-width: 900px) {
  .sol { flex-direction: column; }
  .sol-nav {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
  }
  .sol-group { flex: 1 1 200px; }
  .sol-pane__tips { columns: 1; }
}
</style>
