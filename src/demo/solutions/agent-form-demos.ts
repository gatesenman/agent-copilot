/**
 * 通用 Agent 形态演示 —— 对齐业界主流 Agent 产品形态，不绑定任何行业业务：
 *   1. 对话助手（Chat Assistant）：ChatGPT 形态，纯多轮对话
 *   2. RAG 检索问答（Retrieval Agent）：先检索后回答 + 引用溯源
 *   3. Deep Research（深度研究）：计划 → 多轮检索 → 汇总报告
 *   4. 工具编排（Tool-use Agent）：模型自主决定调用哪些工具完成任务
 * 与 industry-demos 同构：handler 返回 __payload 触发生成式 UI，由真实模型驱动。
 */
import type { CopilotActionDef, CopilotConfig } from '../../lib/agent-copilot'
import type { AgentTask, StructuredPayload } from '../../lib/agent-copilot'
import type { SourceChunk } from '../../lib/agent-copilot/components/general/SourcePanel.vue'
import type { SessionItem } from '../../lib/agent-copilot/components/general/SessionList.vue'
import type { SolutionWorkbenchData } from './solution-workbench-data'
import { AGENT_CONFIG } from '../../config/agent.config'

function baseConfig(partial: Partial<CopilotConfig>): CopilotConfig {
  return {
    runtime: 'browser',
    apiBase: AGENT_CONFIG.siliconflow.apiBase,
    apiKey: AGENT_CONFIG.siliconflow.apiKey,
    model: AGENT_CONFIG.siliconflow.model,
    approvalMode: 'auto',
    showTokenUsage: false,
    suggestions: false,
    ...partial,
  }
}

const now = Date.now()
const H = 3600_000
const D = 86400_000

// ============ 1. 对话助手（Chat Assistant） ============

export const chatAssistantConfig = baseConfig({
  agentType: 'chat',
  botName: '对话助手',
  systemPrompt:
    '你是一个通用对话助手。回答清晰、结构化，多轮对话时保持上下文连贯；'
    + '合适时使用 Markdown 列表、表格或代码块组织信息。回复使用简体中文。',
  welcomeScreen: {
    icon: 'M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5zM9 12h.01M13 12h.01M17 12h.01',
    title: '对话助手',
    subtitle: '多轮对话 · 流式输出 · Markdown 渲染',
    hints: ['用通俗语言解释什么是向量数据库', '帮我把这句话润色得更正式一些', '头脑风暴：周报可以怎么写得更有条理'],
  },
  suggestions: { maxSuggestions: 3 },
})

export const chatAssistantActions: CopilotActionDef[] = []

export const chatAssistantWb: SolutionWorkbenchData = {
  sidebarTitle: '形态解剖',
  sidebar: [
    {
      type: 'card',
      title: '对话助手形态要素',
      data: {
        交互模式: '多轮对话（Chat）',
        输出方式: '流式 Token + Markdown',
        上下文: '会话内记忆',
        典型产品: 'ChatGPT / Claude / 文心一言',
      },
    },
    {
      type: 'timeline_events',
      title: '单轮对话生命周期',
      data: {
        events: [
          { title: '用户输入', description: '文本 / 附件 / 引用上下文', time: '①' },
          { title: '提示词组装', description: '系统提示 + 历史消息 + 当前输入', time: '②' },
          { title: '模型流式生成', description: 'Token 逐步渲染，可随时停止', time: '③' },
          { title: '后处理', description: 'Markdown 渲染 / 建议问题 / 反馈采集', time: '④' },
        ],
      },
    },
    {
      type: 'metrics',
      title: '体验关键指标',
      data: {
        columns: 2,
        items: [
          { label: '首 Token 延迟', value: '380ms', delta: -12, invertDelta: true },
          { label: '生成速率', value: '42 t/s', delta: 8 },
          { label: '多轮保持率', value: '96%', delta: 2 },
          { label: '停止响应', value: '<50ms' },
        ],
      },
    },
    {
      type: 'comparison',
      title: '上下文策略对比',
      data: {
        columns: [
          { key: 'strategy', label: '策略' },
          { key: 'cost', label: '成本' },
          { key: 'coherence', label: '连贯性' },
          { key: 'fit', label: '适用' },
        ],
        rows: [
          { strategy: '全量历史', cost: '高', coherence: '最好', fit: '短会话' },
          { strategy: '滑动窗口', cost: '中', coherence: '好', fit: '通用默认' },
          { strategy: '摘要压缩', cost: '低', coherence: '中', fit: '超长会话' },
        ],
      },
    },
    {
      type: 'code',
      title: '最小接入（SDK）',
      data: {
        language: 'vue',
        code: `<CopilotChat\n  :config="{\n    agentType: 'chat',\n    botName: '对话助手',\n    systemPrompt: '…',\n  }"\n/>`,
      },
    },
  ] as StructuredPayload[],
  tasks: [
    { id: 't1', title: '接收输入并组装上下文', status: 'done' },
    { id: 't2', title: '流式生成回复', status: 'active' },
    { id: 't3', title: '生成追问建议', status: 'pending' },
  ] as AgentTask[],
  sessions: [
    { id: 's1', title: '概念解释', preview: '向量数据库通过embedding近似检索…', updatedAt: now - 20 * 60_000, pinned: true },
    { id: 's2', title: '文本润色', preview: '已给出三个正式程度递进的版本', updatedAt: now - 3 * H },
    { id: 's3', title: '头脑风暴', preview: '周报结构：进展/风险/计划三段式', updatedAt: now - 1 * D },
  ] as SessionItem[],
  usage: { promptTokens: 8_200, completionTokens: 4_100, quota: 200_000 },
}

// ============ 2. RAG 检索问答（Retrieval Agent） ============

export const ragAgentConfig = baseConfig({
  agentType: 'chat',
  botName: '检索问答',
  systemPrompt:
    '你是一个 RAG 检索增强问答 Agent。回答任何知识性问题前，必须先调用 retrieve_chunks 从已挂载的文档集检索相关片段，'
    + '再基于检索结果作答，并在答案中标注引用编号。检索不到时明确说明"文档中未找到"，不要编造。回复使用简体中文。',
  welcomeScreen: {
    icon: 'M4 19V5a2 2 0 0 1 2-2h13v14H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13M9 7h6',
    title: 'RAG 检索问答',
    subtitle: '先检索后生成 · 引用溯源 · 拒绝幻觉',
    hints: ['这套文档的整体架构是怎样的？', '部署一节里对资源规格有什么要求？', '文档里有没有提到灰度发布策略？'],
  },
})

export const ragAgentActions: CopilotActionDef[] = [
  {
    name: 'retrieve_chunks',
    description: '从已挂载的文档集中检索与问题最相关的片段，返回带相似度分数的引用列表',
    parameters: [{ name: 'query', type: 'string', description: '检索关键词', required: true }],
    handler: async ({ query }) => ({
      __payload: {
        type: 'citations' as const,
        title: `「${query}」检索到的文档片段`,
        data: {
          items: [
            { title: '第 2 章 · 系统架构总览', snippet: '整体采用网关-服务-存储三层架构，服务间通过消息队列解耦，读写路径分离…', source: '架构设计文档 v3.2', score: 0.94 },
            { title: '第 5 章 · 部署与资源规格', snippet: '生产环境建议 4C8G 起步，副本数不低于 3，存储层需开启多可用区容灾…', source: '部署手册 v3.2', score: 0.87 },
            { title: '附录 B · 发布策略', snippet: '支持按流量百分比灰度发布，观察窗口默认 30 分钟，指标异常自动回滚…', source: '运维规范 v2.0', score: 0.81 },
          ],
        },
      },
      results: '检索到 3 个相关片段，请基于片段回答并标注引用',
    }),
  },
]

export const ragAgentWb: SolutionWorkbenchData = {
  sidebarTitle: '形态解剖',
  sidebar: [
    {
      type: 'card',
      title: 'RAG 形态要素',
      data: {
        核心约束: '先检索，后生成',
        溯源方式: '引用卡 + 相似度分数',
        幻觉治理: '检索不到即明确拒答',
        典型产品: 'NotebookLM / Perplexity / 企业知识库',
      },
    },
    {
      type: 'timeline_events',
      title: 'RAG 流水线',
      data: {
        events: [
          { title: 'Query 改写', description: '补全指代、拆分多跳问题', time: '①' },
          { title: '向量检索', description: 'Top-K 片段 + 相似度分数', time: '②' },
          { title: '重排与截断', description: 'Rerank 后按上下文窗口裁剪', time: '③' },
          { title: '带引用生成', description: '答案中标注引用编号可溯源', time: '④' },
        ],
      },
    },
    {
      type: 'chart',
      title: '召回质量分布（Top-5 相似度）',
      data: {
        kind: 'bar',
        labels: ['#1', '#2', '#3', '#4', '#5'],
        series: [{ name: '相似度', values: [0.94, 0.87, 0.81, 0.66, 0.52] }],
      },
    },
    {
      type: 'file_tree',
      title: '已挂载文档集',
      data: {
        defaultExpanded: true,
        root: [
          {
            name: 'knowledge-base', type: 'dir', children: [
              { name: '架构设计文档-v3.2.md', type: 'file', badge: 'modified' },
              { name: '部署手册-v3.2.md', type: 'file' },
              { name: '运维规范-v2.0.md', type: 'file' },
              { name: 'FAQ.md', type: 'file', badge: 'new' },
            ],
          },
        ],
      },
    },
    {
      type: 'comparison',
      title: 'RAG vs 纯 LLM 问答',
      data: {
        columns: [
          { key: 'dim', label: '维度' },
          { key: 'llm', label: '纯 LLM' },
          { key: 'rag', label: 'RAG' },
        ],
        rows: [
          { dim: '知识时效', llm: '训练截止', rag: '随文档更新' },
          { dim: '可溯源', llm: '否', rag: '引用编号回跳' },
          { dim: '幻觉率', llm: '较高', rag: '显著降低' },
          { dim: '私域知识', llm: '无', rag: '文档集注入' },
        ],
      },
    },
  ] as StructuredPayload[],
  tasks: [
    { id: 't1', title: '解析问题并改写检索词', status: 'done' },
    { id: 't2', title: '检索文档片段', status: 'done' },
    { id: 't3', title: '基于片段生成带引用回答', status: 'active' },
    { id: 't4', title: '引用点击回跳原文', status: 'pending' },
  ] as AgentTask[],
  sources: [
    { id: 'c1', title: '架构设计文档 v3.2', snippet: '整体采用网关-服务-存储三层架构…', location: '文档集 / 架构', score: 0.94 },
    { id: 'c2', title: '部署手册 v3.2', snippet: '生产环境建议 4C8G 起步，副本数不低于 3…', location: '文档集 / 部署', score: 0.87 },
    { id: 'c3', title: '运维规范 v2.0', snippet: '支持按流量百分比灰度发布，观察窗口默认 30 分钟…', location: '文档集 / 运维', score: 0.81 },
  ] as SourceChunk[],
  usage: { promptTokens: 15_600, completionTokens: 5_400, quota: 200_000 },
}

// ============ 3. Deep Research（深度研究） ============

export const deepResearchConfig = baseConfig({
  agentType: 'custom',
  botName: '研究 Agent',
  systemPrompt:
    '你是一个 Deep Research 深度研究 Agent。收到研究主题后按固定流程工作：'
    + '先调用 make_research_plan 产出研究计划；然后调用 run_search 执行多轮检索（至少一次）；'
    + '最后调用 compose_report 汇总为结构化研究报告。每一步之间用一两句话说明进展。回复使用简体中文。',
  welcomeScreen: {
    icon: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5M11 8v3l2 2',
    title: 'Deep Research',
    subtitle: '研究计划 · 多轮检索 · 汇总报告',
    hints: ['研究一下大模型推理成本的优化路线', '调研浏览器端运行 LLM 的可行性', '综述 Agent 记忆机制的主流方案'],
  },
})

export const deepResearchActions: CopilotActionDef[] = [
  {
    name: 'make_research_plan',
    description: '将研究主题拆解为分步研究计划',
    parameters: [{ name: 'topic', type: 'string', description: '研究主题', required: true }],
    handler: async ({ topic }) => ({
      __payload: {
        type: 'plan' as const,
        title: `研究计划：${topic}`,
        data: {
          steps: [
            { title: '界定问题范围', description: '明确研究边界与关键子问题', status: 'done' },
            { title: '多源检索', description: '论文 / 技术博客 / 开源实现交叉检索', status: 'doing' },
            { title: '证据整理', description: '按子问题归类证据并标注可信度', status: 'todo' },
            { title: '汇总报告', description: '输出结构化结论与开放问题', status: 'todo' },
          ],
        },
      },
      ok: '计划已生成，开始检索',
    }),
  },
  {
    name: 'run_search',
    description: '对某个子问题执行一轮检索，返回带来源的证据片段',
    parameters: [{ name: 'query', type: 'string', description: '子问题检索词', required: true }],
    handler: async ({ query }) => ({
      __payload: {
        type: 'citations' as const,
        title: `检索：${query}`,
        data: {
          items: [
            { title: '综述论文（2025）', snippet: '主流路线可归纳为量化压缩、投机解码、KV 缓存复用三类，分别作用于不同瓶颈…', source: 'arXiv', score: 0.92 },
            { title: '工程实践博客', snippet: '生产环境中三类手段叠加可将单位推理成本降低 60% 以上，但需权衡首 Token 延迟…', source: '技术博客', score: 0.85 },
            { title: '开源框架文档', snippet: '框架内置连续批处理与前缀缓存，配置层面即可启用…', source: '开源文档', score: 0.8 },
          ],
        },
      },
      results: '本轮检索完成，可继续下一个子问题或汇总',
    }),
  },
  {
    name: 'compose_report',
    description: '将多轮检索证据汇总为结构化研究报告',
    parameters: [{ name: 'topic', type: 'string', description: '研究主题', required: true }],
    handler: async ({ topic }) => ({
      __payload: {
        type: 'document' as const,
        title: `研究报告：${topic}`,
        data: {
          format: 'markdown',
          content:
            `# ${topic}\n\n## 核心结论\n\n1. 主流方案可按作用层次分为三类，相互正交可叠加使用\n2. 工程落地的关键权衡是成本与首 Token 延迟\n3. 开源生态已提供开箱即用的组合实现\n\n## 证据来源\n\n- 综述论文（arXiv, 2025）\n- 工程实践博客\n- 开源框架文档\n\n## 开放问题\n\n- 不同负载形态下的最优组合尚无统一基准\n- 长上下文场景的缓存策略仍在快速演进`,
        },
      },
      ok: '报告已生成',
    }),
  },
]

export const deepResearchWb: SolutionWorkbenchData = {
  sidebarTitle: '形态解剖',
  sidebar: [
    {
      type: 'card',
      title: 'Deep Research 形态要素',
      data: {
        执行方式: '计划驱动的多步自主执行',
        中间产物: '研究计划 / 检索证据 / 报告',
        用户角色: '发起主题，过程可旁观可打断',
        典型产品: 'OpenAI / Gemini Deep Research',
      },
    },
    {
      type: 'plan',
      title: '实时研究计划（计划驱动核心）',
      data: {
        steps: [
          { title: '界定问题范围', description: '明确研究边界与关键子问题', status: 'done' },
          { title: '多源检索', description: '论文 / 博客 / 开源实现交叉检索', status: 'doing' },
          { title: '证据充分性反思', description: '不足则针对性补检索', status: 'todo' },
          { title: '汇总报告', description: '结构化结论 + 开放问题', status: 'todo' },
        ],
      },
    },
    {
      type: 'timeline_events',
      title: '研究循环',
      data: {
        events: [
          { title: '计划', description: '主题拆解为子问题', time: '①' },
          { title: '检索', description: '每个子问题一到多轮检索', time: '②' },
          { title: '反思', description: '证据是否充分？不足则补检索', time: '③' },
          { title: '报告', description: '结构化汇总 + 开放问题', time: '④' },
        ],
      },
    },
    {
      type: 'metrics',
      title: '本次研究统计',
      data: {
        columns: 2,
        items: [
          { label: '子问题', value: 4 },
          { label: '检索轮次', value: 7 },
          { label: '证据片段', value: 21 },
          { label: '预计耗时', value: '3m40s' },
        ],
      },
    },
    {
      type: 'chart',
      title: '各子问题证据覆盖度',
      data: {
        kind: 'bar',
        labels: ['范围界定', '技术路线', '工程实践', '开放问题'],
        series: [{ name: '证据数', values: [6, 8, 5, 2] }],
      },
    },
    {
      type: 'document',
      title: '报告骨架（最终产物）',
      data: {
        format: 'markdown',
        content: '# 研究报告\n\n## 核心结论\n1. …\n2. …\n\n## 证据来源\n- 综述论文 / 博客 / 开源文档\n\n## 开放问题\n- …',
      },
    },
  ] as StructuredPayload[],
  tasks: [
    { id: 't1', title: '生成研究计划', status: 'done' },
    { id: 't2', title: '子问题多轮检索', status: 'active', detail: '第 2/4 个子问题' },
    { id: 't3', title: '证据充分性反思', status: 'pending' },
    { id: 't4', title: '汇总研究报告', status: 'pending' },
  ] as AgentTask[],
  usage: { promptTokens: 42_800, completionTokens: 18_600, quota: 200_000 },
}

// ============ 4. 工具编排（Tool-use Agent） ============

export const toolUseConfig = baseConfig({
  agentType: 'custom',
  botName: '工具 Agent',
  systemPrompt:
    '你是一个工具编排 Agent，可用工具：query_records（查询结构化记录）、run_calculation（执行计算）、'
    + 'render_chart（绘制图表）。根据用户意图自主决定调用哪些工具、以什么顺序调用，可以串联多个工具完成一个任务。'
    + '每次调用后用一句话解释结果。回复使用简体中文。',
  welcomeScreen: {
    icon: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2.4-2.4z',
    title: '工具编排 Agent',
    subtitle: '意图理解 · 自主选择工具 · 多工具串联',
    hints: ['查一下最近四周的记录并画成趋势图', '算一下这组数据的均值和标准差', '先查记录再统计再可视化，一次完成'],
  },
})

export const toolUseActions: CopilotActionDef[] = [
  {
    name: 'query_records',
    description: '查询结构化记录，返回数据表格',
    parameters: [{ name: 'range', type: 'string', description: '查询范围描述', required: true }],
    handler: async ({ range }) => ({
      __payload: {
        type: 'table' as const,
        title: `记录查询：${range}`,
        data: {
          columns: [
            { key: 'week', label: '周期' },
            { key: 'value', label: '数值', align: 'right' },
            { key: 'delta', label: '环比', align: 'right' },
          ],
          rows: [
            { week: 'W23', value: 1240, delta: '+4%' },
            { week: 'W24', value: 1310, delta: '+6%' },
            { week: 'W25', value: 1275, delta: '-3%' },
            { week: 'W26', value: 1420, delta: '+11%' },
          ],
        },
      },
      rows: [1240, 1310, 1275, 1420],
    }),
  },
  {
    name: 'run_calculation',
    description: '对一组数值执行统计计算（均值/标准差/极值）',
    parameters: [{ name: 'values', type: 'string', description: '逗号分隔的数值序列', required: true }],
    handler: async ({ values }) => {
      const nums = String(values).split(',').map(Number).filter((n) => !Number.isNaN(n))
      const mean = nums.reduce((a, b) => a + b, 0) / (nums.length || 1)
      const sd = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length || 1))
      return {
        __payload: {
          type: 'metrics' as const,
          title: '统计结果',
          data: {
            columns: 2,
            items: [
              { label: '样本数', value: nums.length },
              { label: '均值', value: mean.toFixed(1) },
              { label: '标准差', value: sd.toFixed(1) },
              { label: '最大值', value: Math.max(...nums) },
            ],
          },
        },
        mean: mean.toFixed(1),
        sd: sd.toFixed(1),
      }
    },
  },
  {
    name: 'render_chart',
    description: '将数值序列渲染为趋势折线图',
    parameters: [
      { name: 'labels', type: 'string', description: '逗号分隔的横轴标签', required: true },
      { name: 'values', type: 'string', description: '逗号分隔的数值序列', required: true },
    ],
    handler: async ({ labels, values }) => ({
      __payload: {
        type: 'chart' as const,
        title: '趋势图',
        data: {
          kind: 'line',
          labels: String(labels).split(',').map((s) => s.trim()),
          series: [{ name: '数值', values: String(values).split(',').map((v) => Number(v.trim()) || 0) }],
        },
      },
      ok: '图表已渲染',
    }),
  },
]

export const toolUseWb: SolutionWorkbenchData = {
  sidebarTitle: '形态解剖',
  sidebar: [
    {
      type: 'card',
      title: '工具编排形态要素',
      data: {
        决策方: '模型自主选择工具与顺序',
        协议基础: 'Function Calling / MCP',
        结果呈现: '每个工具产出一张生成式 UI 卡',
        典型产品: 'GPTs / Claude 工具调用 / MCP 客户端',
      },
    },
    {
      type: 'timeline_events',
      title: 'ReAct 工具循环',
      data: {
        events: [
          { title: 'Reason', description: '模型思考需要什么信息', time: '①' },
          { title: 'Act', description: '发起工具调用（含参数）', time: '②' },
          { title: 'Observe', description: '读取工具结果注入上下文', time: '③' },
          { title: 'Repeat / Answer', description: '继续调用或给出最终回答', time: '④' },
        ],
      },
    },
    {
      type: 'code',
      title: '工具契约（Function Schema）',
      data: {
        language: 'json',
        code: `{\n  "name": "query_records",\n  "description": "查询结构化记录",\n  "parameters": {\n    "type": "object",\n    "properties": {\n      "range": { "type": "string" }\n    },\n    "required": ["range"]\n  }\n}`,
      },
    },
    {
      type: 'terminal',
      title: '工具调用轨迹（实时）',
      data: {
        cwd: 'react-loop',
        lines: [
          { kind: 'out', text: 'reason: 需要先查询记录再统计' },
          { kind: 'cmd', text: 'call query_records({ range: "近四周" })' },
          { kind: 'out', text: '4 rows returned (32ms)' },
          { kind: 'cmd', text: 'call run_calculation({ values: "1240,1310,…" })' },
          { kind: 'out', text: 'mean=1311.3 sd=66.9 (5ms)' },
          { kind: 'cmd', text: 'call render_chart({ … })' },
          { kind: 'out', text: 'rendering…' },
        ],
      },
    },
    {
      type: 'table',
      title: '已注册工具',
      data: {
        columns: [
          { key: 'tool', label: '工具' },
          { key: 'calls', label: '调用', align: 'right' },
          { key: 'p95', label: 'P95', align: 'right' },
        ],
        rows: [
          { tool: 'query_records', calls: 1, p95: '32ms' },
          { tool: 'run_calculation', calls: 1, p95: '5ms' },
          { tool: 'render_chart', calls: 1, p95: '48ms' },
        ],
      },
    },
  ] as StructuredPayload[],
  tasks: [
    { id: 't1', title: '理解意图并规划工具链', status: 'done' },
    { id: 't2', title: '查询记录', status: 'done' },
    { id: 't3', title: '统计计算', status: 'active' },
    { id: 't4', title: '图表渲染', status: 'pending' },
  ] as AgentTask[],
  usage: { promptTokens: 21_300, completionTokens: 7_800, quota: 200_000 },
}
