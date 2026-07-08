<script setup lang="ts">
/**
 * OmniCardsPanel — 全能助手「卡片」页签。
 * 直接渲染全部 generative-ui 结构化载荷卡片（16 种 payload 卡）
 * + CompareView 对比视图 + MarkdownText 富文本，覆盖生成式 UI 全域。
 */
import { ref } from 'vue'
import PayloadCard from '../../lib/agent-copilot/components/generative-ui/PayloadCard.vue'
import CodeBlockCard from '../../lib/agent-copilot/components/generative-ui/CodeBlockCard.vue'
import DataTableCard from '../../lib/agent-copilot/components/generative-ui/DataTableCard.vue'
import ChartCard from '../../lib/agent-copilot/components/generative-ui/ChartCard.vue'
import MetricsCard from '../../lib/agent-copilot/components/generative-ui/MetricsCard.vue'
import DiffCard from '../../lib/agent-copilot/components/generative-ui/DiffCard.vue'
import FileTreeCard from '../../lib/agent-copilot/components/generative-ui/FileTreeCard.vue'
import TerminalCard from '../../lib/agent-copilot/components/generative-ui/TerminalCard.vue'
import SqlResultCard from '../../lib/agent-copilot/components/generative-ui/SqlResultCard.vue'
import TimelineCard from '../../lib/agent-copilot/components/generative-ui/TimelineCard.vue'
import CitationsCard from '../../lib/agent-copilot/components/generative-ui/CitationsCard.vue'
import PlanCard from '../../lib/agent-copilot/components/generative-ui/PlanCard.vue'
import FormCard from '../../lib/agent-copilot/components/generative-ui/FormCard.vue'
import ImageCard from '../../lib/agent-copilot/components/generative-ui/ImageCard.vue'
import AudioCard from '../../lib/agent-copilot/components/generative-ui/AudioCard.vue'
import VideoCard from '../../lib/agent-copilot/components/generative-ui/VideoCard.vue'
import CompareView from '../../lib/agent-copilot/components/general/CompareView.vue'
import MarkdownText from '../../lib/agent-copilot/components/chat/MarkdownText.vue'
import type { StructuredPayload } from '../../lib/agent-copilot/types'

/** 每张卡：直接组件引用 + 演示 payload（统一 payload 协议） */
const p = (type: StructuredPayload['type'], title: string, data: unknown): StructuredPayload =>
  ({ type, title, data }) as StructuredPayload

const codePayload = p('code', 'debounce.ts', {
  language: 'typescript', filename: 'src/utils/debounce.ts', highlightLines: [2],
  code: `export function debounce(fn: () => void, wait = 300) {\n  let timer: number | null = null\n  return () => {\n    if (timer) clearTimeout(timer)\n    timer = window.setTimeout(fn, wait)\n  }\n}`,
})
const tablePayload = p('table', '季度指标', {
  columns: [{ key: 'dept', label: '部门' }, { key: 'kpi', label: '达成率' }, { key: 'trend', label: '环比' }],
  rows: [
    { dept: '运营', kpi: '92%', trend: '+4%' },
    { dept: '研发', kpi: '88%', trend: '+2%' },
    { dept: '市场', kpi: '81%', trend: '-1%' },
  ],
})
const chartPayload = p('chart', '部门达成率', {
  kind: 'bar', labels: ['运营', '研发', '市场', '设计'],
  series: [{ name: '达成率', values: [92, 88, 81, 90] }],
})
const metricsPayload = p('metrics', '核心指标', {
  items: [
    { label: '月活', value: '12.4万', delta: '+8.2%', tone: 'up' },
    { label: '留存', value: '46%', delta: '+1.4%', tone: 'up' },
    { label: '客诉率', value: '0.3%', delta: '-0.1%', tone: 'down' },
  ],
})
const diffPayload = p('diff', 'dashboard.vue', {
  lines: [
    { type: 'ctx', text: 'const metrics = ref<Metric[]>([])' },
    { type: 'del', text: 'onMounted(() => fetchMetrics())' },
    { type: 'add', text: 'const loading = ref(true)' },
    { type: 'add', text: 'onMounted(async () => { metrics.value = await fetchMetrics(); loading.value = false })' },
  ],
})
const fileTreePayload = p('file_tree', '变更文件', {
  root: [
    {
      name: 'src', kind: 'dir', children: [
        { name: 'utils', kind: 'dir', children: [{ name: 'debounce.ts', kind: 'file', badge: 'A' }] },
        { name: 'pages', kind: 'dir', children: [{ name: 'dashboard.vue', kind: 'file', badge: 'M' }] },
      ],
    },
  ],
})
const terminalPayload = p('terminal', 'vitest', {
  lines: [
    { kind: 'cmd', text: 'pnpm vitest run debounce.test.ts' },
    { kind: 'out', text: '✓ 延迟触发 (12ms)\n✓ 重复调用只执行最后一次 (8ms)' },
    { kind: 'info', text: 'Tests  2 passed' },
  ],
})
const sqlPayload = p('sql_result', '近四周订单', {
  sql: 'SELECT week, COUNT(*) AS orders FROM orders GROUP BY week ORDER BY week DESC LIMIT 4',
  columns: ['week', 'orders'],
  rows: [['W28', 1284], ['W27', 1190], ['W26', 1211], ['W25', 1094]],
})
const timelinePayload = p('timeline_events', '发布时间线', {
  events: [
    { time: '09:00', title: '需求评审通过', status: 'done' },
    { time: '11:30', title: '灰度发布 10%', status: 'done' },
    { time: '14:00', title: '全量发布', status: 'active' },
  ],
})
const citationsPayload = p('citations', '引用来源', {
  items: [
    { id: 'c1', title: '差旅费用管理办法', snippet: '报销时需附发票原件与行程单……', location: '企业制度库 · 第 3 页', score: 0.94 },
    { id: 'c2', title: '报销时限规定', snippet: '差旅结束后 30 日内完成报销……', location: '企业制度库 · 第 5 页', score: 0.87 },
  ],
})
const planPayload = p('plan', '改版执行计划', {
  steps: [
    { id: 'p1', title: '梳理信息架构', status: 'done' },
    { id: 'p2', title: '输出设计 Token', status: 'active' },
    { id: 'p3', title: '组件重构与灰度', status: 'pending' },
  ],
})
const formPayload = p('form', '需求收集', {
  fields: [
    { key: 'goal', label: '目标描述', type: 'text', required: true, placeholder: '想要达成什么？' },
    { key: 'scope', label: '范围', type: 'select', options: [{ label: '全站', value: 'all' }, { label: '首页', value: 'home' }] },
  ],
  submitLabel: '提交需求',
})
const imagePayload = p('image', '架构示意图', {
  src: '/images/omni-arch.png', alt: '全能助手三域聚合架构示意图', caption: '知识 / 代码 / 数据 三域聚合',
})
const audioPayload = p('audio', '语音摘要', { src: 'data:audio/mp3;base64,', duration: 12 })
const videoPayload = p('video', '功能演示', { src: '', poster: '/images/omni-arch.png' })
const cardPayload = p('card', '通用信息卡', {
  fields: [{ label: '负责人', value: '知识官' }, { label: '截止', value: '本周五' }],
})

/** CompareView 状态 */
const voted = ref<'left' | 'right' | 'tie' | undefined>()

const MD_SAMPLE = `**MarkdownText** 支持表格 / 数学 / 代码：

| 能力 | 状态 |
| ---- | ---- |
| GFM 表格 | ✅ |
| 数学公式 | ✅ |

行内公式 $E = mc^2$，代码 \`debounce()\`。`
</script>

<template>
  <div class="ocards">
    <p class="ocards__intro">生成式 UI 全域：16 种结构化载荷卡片 + 对比视图 + 富文本渲染,均可由 Agent 事件流直接驱动。</p>

    <section class="ocards__sec" data-comp="PayloadCard（分发器 / loading / error 态）">
      <PayloadCard :payload="cardPayload" />
      <PayloadCard :payload="p('chart', '生成中…', { kind: 'bar', labels: [], series: [] })" loading />
      <PayloadCard :payload="p('table', '加载失败示例', {})" error="数据源超时，可重试" />
    </section>

    <section class="ocards__sec" data-comp="CodeBlockCard + DiffCard + FileTreeCard + TerminalCard">
      <CodeBlockCard :payload="codePayload" />
      <DiffCard :payload="diffPayload" />
      <FileTreeCard :payload="fileTreePayload" />
      <TerminalCard :payload="terminalPayload" />
    </section>

    <section class="ocards__sec" data-comp="DataTableCard + ChartCard + MetricsCard + SqlResultCard">
      <DataTableCard :payload="tablePayload" />
      <ChartCard :payload="chartPayload" />
      <MetricsCard :payload="metricsPayload" />
      <SqlResultCard :payload="sqlPayload" />
    </section>

    <section class="ocards__sec" data-comp="TimelineCard + CitationsCard + PlanCard + FormCard">
      <TimelineCard :payload="timelinePayload" />
      <CitationsCard :payload="citationsPayload" />
      <PlanCard :payload="planPayload" />
      <FormCard :payload="formPayload" />
    </section>

    <section class="ocards__sec" data-comp="ImageCard + AudioCard + VideoCard">
      <ImageCard :payload="imagePayload" />
      <AudioCard :payload="audioPayload" />
      <VideoCard :payload="videoPayload" />
    </section>

    <section class="ocards__sec" data-comp="CompareView（A/B 对比投票）">
      <CompareView
        question="哪种防抖实现更好？"
        :left="{ label: '方案 A · 闭包', content: '用闭包保存 timer,实现简洁,**推荐**。' }"
        :right="{ label: '方案 B · 类', content: '面向对象封装,适合需要 cancel/flush 的场景。' }"
        :voted="voted"
        votable
        @vote="(v) => (voted = v)"
      />
    </section>

    <section class="ocards__sec" data-comp="MarkdownText（GFM / 数学 / 代码高亮）">
      <MarkdownText :content="MD_SAMPLE" />
    </section>
  </div>
</template>

<style scoped>
.ocards { display: flex; flex-direction: column; gap: 14px; padding: 10px; }
.ocards__intro { margin: 0; font-size: 12px; color: var(--ac-muted, #64748b); }
.ocards__sec {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 8px 8px;
  border: 1px dashed color-mix(in srgb, var(--ac-primary, #2563eb) 25%, transparent);
  border-radius: 10px;
}
.ocards__sec::before {
  content: attr(data-comp);
  position: absolute;
  top: -1px;
  left: 8px;
  font-size: 10px;
  font-weight: 650;
  color: var(--ac-primary, #2563eb);
  background: color-mix(in srgb, var(--ac-primary, #2563eb) 8%, var(--ac-bg, #fff));
  border: 1px solid color-mix(in srgb, var(--ac-primary, #2563eb) 30%, transparent);
  border-top: none;
  border-radius: 0 0 6px 6px;
  padding: 1px 8px;
  max-width: 92%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
