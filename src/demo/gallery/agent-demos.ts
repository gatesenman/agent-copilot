/**
 * 四类 Agent 的真实交互演示定义：
 * 每个 Agent 一组前端 Action，handler 返回 __payload 触发生成式 UI 渲染，
 * 由硅基流动大模型真实驱动工具调用。
 */
import type { CopilotActionDef, CopilotConfig } from '../../lib/agent-copilot'
import { AGENT_CONFIG } from '../../config/agent.config'
import {
  sampleChart, sampleCitations, sampleCode, sampleDiff,
  sampleFileTree, sampleMetrics, samplePlan, sampleSqlResult,
  sampleTable, sampleTerminal,
} from './payload-samples'

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

// ============ Chat Agent（知识问答 + RAG 引用） ============

export const chatAgentConfig = baseConfig({
  agentType: 'chat',
  botName: '知识助手',
  systemPrompt:
    '你是企业知识助手。回答制度、流程类问题时必须先调用 search_knowledge 检索知识库，'
    + '再基于检索结果回答；需要给用户列办理步骤时调用 show_plan 展示步骤卡。回复使用简体中文。',
  welcomeScreen: {
    icon: '💬',
    title: '企业知识助手',
    subtitle: '演示 RAG 引用来源与计划步骤载荷',
    hints: ['差旅报销流程是什么？', '出差住宿标准是多少？'],
  },
})

export const chatAgentActions: CopilotActionDef[] = [
  {
    name: 'search_knowledge',
    description: '检索企业知识库，返回相关制度条款片段与来源',
    parameters: [{ name: 'query', type: 'string', description: '检索关键词', required: true }],
    handler: async ({ query }) => ({
      __payload: { ...sampleCitations, title: `「${query}」的参考来源` },
      results: (sampleCitations.data as any).items.map((i: any) => ({ title: i.title, snippet: i.snippet })),
    }),
  },
  {
    name: 'show_plan',
    description: '向用户展示一个分步骤办理计划卡片',
    parameters: [
      { name: 'topic', type: 'string', description: '计划主题', required: true },
      { name: 'steps', type: 'array', description: '步骤数组，每项 { title, description, status(todo/doing/done) }', required: true },
    ],
    handler: async ({ topic, steps }) => ({
      __payload: {
        type: 'plan' as const,
        title: String(topic),
        data: { steps: Array.isArray(steps) && steps.length ? steps : (samplePlan.data as any).steps },
      },
      ok: true,
    }),
  },
]

// ============ Code Agent（代码生成 + diff + 测试） ============

export const codeAgentConfig = baseConfig({
  agentType: 'code',
  botName: '代码助手',
  systemPrompt:
    '你是代码助手。生成代码请调用 show_code 展示；解释代码改动请调用 show_diff；'
    + '被要求运行测试时调用 run_tests。工具展示后用一两句话总结即可，不要在正文重复贴代码。回复使用简体中文。',
  welcomeScreen: {
    icon: '⌨',
    title: '代码助手',
    subtitle: '演示代码块、Diff、文件树与终端载荷',
    hints: ['写一个 TypeScript 防抖函数', '跑一下用户模块的测试'],
  },
})

export const codeAgentActions: CopilotActionDef[] = [
  {
    name: 'show_code',
    description: '以带行号和语法高亮的代码卡片展示代码',
    parameters: [
      { name: 'language', type: 'string', description: '语言，如 typescript/python', required: true },
      { name: 'filename', type: 'string', description: '文件名（可选）' },
      { name: 'code', type: 'string', description: '完整代码文本', required: true },
      { name: 'caption', type: 'string', description: '一句话说明（可选）' },
    ],
    handler: async ({ language, filename, code, caption }) => ({
      __payload: {
        type: 'code' as const,
        title: filename ? String(filename) : '生成的代码',
        data: { language, filename, code, caption, showLineNumbers: true },
      },
      ok: true,
    }),
  },
  {
    name: 'show_diff',
    description: '展示一个文件的修改 diff（示例数据）',
    parameters: [{ name: 'filename', type: 'string', description: '文件名', required: true }],
    handler: async ({ filename }) => ({
      __payload: { ...sampleDiff, title: `${filename} 的改动` },
      summary: '增加了 3 行错误处理，删除 1 行',
    }),
  },
  {
    name: 'run_tests',
    description: '运行测试并返回终端输出（模拟执行）',
    parameters: [{ name: 'filter', type: 'string', description: '测试过滤关键词（可选）' }],
    handler: async ({ filter }) => ({
      __payloads: [
        { ...sampleTerminal, title: filter ? `测试:${filter}` : '测试执行结果' },
        sampleFileTree,
      ],
      passed: 2, failed: 0,
    }),
  },
  {
    name: 'show_snippet_samples',
    description: '展示预置的代码卡片示例（当用户只想看看效果时）',
    parameters: [],
    handler: async () => ({ __payloads: [sampleCode, sampleDiff], ok: true }),
  },
]

// ============ Data Agent（SQL + 图表 + 指标） ============

export const dataAgentConfig = baseConfig({
  agentType: 'data',
  botName: '数据分析助手',
  systemPrompt:
    '你是数据分析助手，可访问企业数据集市。查询数据用 query_data（返回 SQL 结果卡）；'
    + '展示趋势或对比用 show_chart；汇报核心指标用 show_metrics；明细列表用 show_table。'
    + '先给结论，再让数据卡片说话。回复使用简体中文。',
  welcomeScreen: {
    icon: '📊',
    title: '数据分析助手',
    subtitle: '演示 SQL 结果、图表、指标与增强表格载荷',
    hints: ['本季度运营指标怎么样？', '查一下逾期未完成的工作项', '各部门费用支出画个图'],
  },
})

export const dataAgentActions: CopilotActionDef[] = [
  {
    name: 'show_metrics',
    description: '展示本季度运营关键指标卡',
    parameters: [],
    handler: async () => ({
      __payload: sampleMetrics,
      metrics: (sampleMetrics.data as any).items.map((i: any) => `${i.label}: ${i.value}${i.unit ?? ''}`),
    }),
  },
  {
    name: 'query_data',
    description: '执行数据查询，返回 SQL 与结果集（演示数据集市）',
    parameters: [{ name: 'question', type: 'string', description: '要查询的业务问题', required: true }],
    handler: async ({ question }) => ({
      __payload: { ...sampleSqlResult, title: `查询：${question}` },
      rows: (sampleSqlResult.data as any).rows,
    }),
  },
  {
    name: 'show_chart',
    description: '绘制图表。kind 支持 bar/line/pie',
    parameters: [
      { name: 'kind', type: 'string', description: 'bar=部门对比柱图 line=月度趋势线图 pie=部门费用占比饼图', required: true },
    ],
    handler: async ({ kind }) => {
      const { sampleLineChart, samplePieChart } = await import('./payload-samples')
      const map: Record<string, any> = { bar: sampleChart, line: sampleLineChart, pie: samplePieChart }
      return { __payload: map[String(kind)] ?? sampleChart, ok: true }
    },
  },
  {
    name: 'show_table',
    description: '展示团队交付明细表（可排序/筛选/分页/导出）',
    parameters: [],
    handler: async () => ({ __payload: sampleTable, rowCount: (sampleTable.data as any).rows.length }),
  },
]

// ============ 全能助手（一个复杂例子：聚合三域 Agent 全部工具） ============

export const omniAgentConfig = baseConfig({
  agentType: 'chat',
  botName: '全能助手',
  systemPrompt:
    '你是企业全能 AI 助手，同时具备知识问答、代码生成、数据分析能力。'
    + '根据用户意图主动调用对应工具渲染结构化卡片：知识问题先 search_knowledge 再回答并 show_plan；'
    + '���码请求用 show_code / show_diff / run_tests；数据请求用 show_metrics / run_sql / show_chart / show_table。'
    + '回复使用简体中文，简明扼要。',
  welcomeScreen: {
    title: '全能助手 · 复杂实时演示',
    subtitle: '组件库全部 67 个组件同屏组装 · 知识 / 代码 / 数据三域工具全量注册，模型按意图自动选择',
    hints: [
      '差旅报销流程是什么？',
      '写一个 TypeScript 防抖函数并跑测试',
      '本季度运营指标怎么样？画个部门对比图',
    ],
  },
  agentic: { showThinking: true },
})

export const omniAgentActions: CopilotActionDef[] = [
  ...chatAgentActions,
  ...codeAgentActions,
  ...dataAgentActions,
]
