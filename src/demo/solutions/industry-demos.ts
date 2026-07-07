/**
 * 行业解决方案的真实交互演示定义（智能客服 / 电商导购 / 金融投研）。
 * 与 gallery/agent-demos.ts 同构：每个方案一组前端 Action，
 * handler 返回 __payload 触发生成式 UI，由大模型真实驱动工具调用。
 */
import type { CopilotActionDef, CopilotConfig } from '../../lib/agent-copilot'
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

// ============ 智能客服与工单（Customer Service） ============

export const customerServiceConfig = baseConfig({
  agentType: 'chat',
  botName: '客服助手',
  systemPrompt:
    '你是电信运营商的智能客服。用户咨询套餐、账单、故障类问题时先调用 search_faq 检索知识库再回答；'
    + '用户要报障或投诉时调用 create_ticket 创建工单并告知工单号；'
    + '用户查询工单进度时调用 show_ticket_progress。回复简洁友好，使用简体中文。',
  welcomeScreen: {
    icon: '🎧',
    title: '智能客服与工单',
    subtitle: 'FAQ 检索 · 工单创建 · 进度跟踪',
    hints: ['宽带无法上网怎么办？', '帮我报修：家里宽带断网了', '查一下我昨天报修的工单进度'],
  },
})

export const customerServiceActions: CopilotActionDef[] = [
  {
    name: 'search_faq',
    description: '检索客服知识库，返回相关 FAQ 条目与来源',
    parameters: [{ name: 'query', type: 'string', description: '用户问题关键词', required: true }],
    handler: async ({ query }) => ({
      __payload: {
        type: 'citations' as const,
        title: `「${query}」的知识库检索结果`,
        data: {
          items: [
            { title: '宽带故障自助排查指引', snippet: '第一步检查光猫指示灯：LOS 红灯常亮表示光路故障，请直接报修…', source: '客服知识库 · 故障类', score: 0.96 },
            { title: '路由器重启操作手册', snippet: '断电 10 秒后重新上电，等待 2 分钟观察 WiFi 信号是否恢复…', source: '客服知识库 · 自助服务', score: 0.88 },
            { title: '故障报修服务时效说明', snippet: '城区故障 24 小时内上门，乡镇 48 小时内上门…', source: '服务协议', score: 0.79 },
          ],
        },
      },
      results: '已检索到 3 条相关知识',
    }),
  },
  {
    name: 'create_ticket',
    description: '为用户创建报障/投诉工单，返回工单摘要卡片',
    parameters: [
      { name: 'category', type: 'string', description: '工单类别：报障/投诉/咨询', required: true },
      { name: 'summary', type: 'string', description: '问题概述', required: true },
    ],
    handler: async ({ category, summary }) => {
      const id = `TK-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`
      return {
        __payload: {
          type: 'card' as const,
          title: '工单创建成功',
          data: {
            工单号: id,
            类别: String(category),
            问题描述: String(summary),
            优先级: '高',
            预计上门: '24 小时内',
            状态: '已派单',
          },
        },
        ticketId: id,
      }
    },
  },
  {
    name: 'show_ticket_progress',
    description: '展示指定工单的处理进度步骤卡',
    parameters: [{ name: 'ticketId', type: 'string', description: '工单号，未知时可传空', required: false }],
    handler: async ({ ticketId }) => ({
      __payload: {
        type: 'plan' as const,
        title: `工单 ${ticketId || 'TK-2026-1024'} 处理进度`,
        data: {
          steps: [
            { title: '工单受理', description: '客服已记录问题并生成工单', status: 'done' },
            { title: '远程诊断', description: '检测到光衰超标，需上门处理', status: 'done' },
            { title: '装维上门', description: '师傅已预约今天 14:00-16:00 上门', status: 'doing' },
            { title: '修复回访', description: '修复后 24 小时内电话回访确认', status: 'todo' },
          ],
        },
      },
      ok: true,
    }),
  },
]

// ============ 电商智能导购（E-commerce） ============

export const commerceConfig = baseConfig({
  agentType: 'chat',
  botName: '导购助手',
  systemPrompt:
    '你是电商平台的智能导购。用户描述需求时调用 recommend_products 推荐商品；'
    + '用户想对比商品时调用 compare_products；用户决定购买时调用 create_order 生成订单确认卡。'
    + '推荐后用一两句话点出核心差异，帮助用户决策。回复使用简体中文。',
  welcomeScreen: {
    icon: '🛍️',
    title: '电商智能导购',
    subtitle: '需求理解 · 商品推荐 · 对比下单',
    hints: ['预算 3000 左右，推荐一台降噪耳机', '对比一下前两款的差异', '就买第一款，帮我下单'],
  },
})

export const commerceActions: CopilotActionDef[] = [
  {
    name: 'recommend_products',
    description: '按用户需求推荐商品，返回可排序筛选的商品表格',
    parameters: [
      { name: 'keyword', type: 'string', description: '品类或需求关键词', required: true },
      { name: 'budget', type: 'number', description: '预算上限（元），可选', required: false },
    ],
    handler: async ({ keyword }) => ({
      __payload: {
        type: 'table' as const,
        title: `「${keyword}」精选推荐`,
        data: {
          sortable: true,
          filterable: true,
          pageSize: 5,
          columns: [
            { key: 'name', label: '商品' },
            { key: 'price', label: '到手价(元)', align: 'right' },
            { key: 'rating', label: '好评率' },
            { key: 'feature', label: '核心卖点' },
            { key: 'stock', label: '库存' },
          ],
          rows: [
            { name: 'SoundMax Pro 旗舰降噪', price: 2899, rating: '98%', feature: '-48dB 深度降噪 / 40h 续航', stock: '现货' },
            { name: 'AirWave S3 轻量款', price: 2199, rating: '96%', feature: '168g 超轻 / 空间音频', stock: '现货' },
            { name: 'BassKing Studio 监听级', price: 3099, rating: '97%', feature: 'LDAC 无损 / 监听调音', stock: '预售 3 天' },
            { name: 'Quiet+ 通勤版', price: 1599, rating: '94%', feature: '高性价比 / 通话降噪', stock: '现货' },
          ],
        },
      },
      count: 4,
    }),
  },
  {
    name: 'compare_products',
    description: '对比两款商品的关键维度差异',
    parameters: [
      { name: 'productA', type: 'string', description: '商品 A 名称', required: true },
      { name: 'productB', type: 'string', description: '商品 B 名称', required: true },
    ],
    handler: async ({ productA, productB }) => ({
      __payload: {
        type: 'comparison' as const,
        title: '商品对比',
        data: {
          columns: [
            { key: 'dim', label: '维度' },
            { key: 'a', label: String(productA) },
            { key: 'b', label: String(productB) },
          ],
          rows: [
            { dim: '到手价', a: '¥2,899', b: '¥2,199' },
            { dim: '降噪深度', a: '-48dB（旗舰）', b: '-42dB' },
            { dim: '续航', a: '40 小时', b: '32 小时' },
            { dim: '重量', a: '255g', b: '168g（更轻）' },
            { dim: '适合人群', a: '长途差旅 / 极致降噪', b: '日常通勤 / 佩戴舒适' },
          ],
        },
      },
      ok: true,
    }),
  },
  {
    name: 'create_order',
    description: '为用户生成订单确认卡片',
    parameters: [
      { name: 'product', type: 'string', description: '商品名称', required: true },
      { name: 'price', type: 'string', description: '成交价', required: false },
    ],
    handler: async ({ product, price }) => ({
      __payload: {
        type: 'card' as const,
        title: '订单确认',
        data: {
          订单号: `OD-2026${String(Math.floor(Math.random() * 900000) + 100000)}`,
          商品: String(product),
          金额: price ? String(price) : '¥2,899',
          优惠: '会员 95 折 + 平台券 ¥100',
          配送: '顺丰次日达（预计明天送达）',
          状态: '待支付',
        },
      },
      ok: true,
    }),
  },
]

// ============ 金融投研助手（Finance） ============

export const financeConfig = baseConfig({
  agentType: 'data',
  botName: '投研助手',
  systemPrompt:
    '你是券商投研助手。用户问板块/公司基本面时调用 show_fundamentals 展示指标卡；'
    + '用户要看走势时调用 show_trend 画折线图；用户要研报结论时调用 draft_report 生成纪要文档。'
    + '所有结论附带「不构成投资建议」提示。回复使用简体中文。',
  welcomeScreen: {
    icon: '📈',
    title: '金融投研助手',
    subtitle: '基本面速览 · 走势可视化 · 研报纪要',
    hints: ['看一下新能源板块的基本面', '画出近半年营收走势', '帮我起草一份调研纪要'],
  },
})

export const financeActions: CopilotActionDef[] = [
  {
    name: 'show_fundamentals',
    description: '展示板块或公司的核心基本面指标卡',
    parameters: [{ name: 'target', type: 'string', description: '板块或公司名称', required: true }],
    handler: async ({ target }) => ({
      __payload: {
        type: 'metrics' as const,
        title: `${target} · 核心基本面（2026 Q2）`,
        data: {
          columns: 4,
          items: [
            { label: '营收增速', value: '23.6', unit: '%', delta: 4.2 },
            { label: '毛利率', value: '31.8', unit: '%', delta: 1.1 },
            { label: '市盈率 TTM', value: 28.4, unit: '倍', delta: -6.5, invertDelta: true, hint: '低于三年均值' },
            { label: '机构持仓', value: '42.7', unit: '%', delta: 2.8, hint: '连续两季度加仓' },
          ],
        },
      },
      disclaimer: '数据为演示样例，不构成投资建议',
    }),
  },
  {
    name: 'show_trend',
    description: '绘制指标走势折线图',
    parameters: [{ name: 'metric', type: 'string', description: '指标名称，如营收/净利润', required: true }],
    handler: async ({ metric }) => ({
      __payload: {
        type: 'chart' as const,
        title: `近半年${metric}走势（亿元）`,
        data: {
          kind: 'line',
          labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
          unit: '亿元',
          series: [
            { name: String(metric), values: [86, 92, 105, 98, 118, 127] },
            { name: '行业均值', values: [80, 83, 88, 90, 94, 99] },
          ],
        },
      },
      ok: true,
    }),
  },
  {
    name: 'draft_report',
    description: '起草调研纪要/研报摘要文档',
    parameters: [{ name: 'topic', type: 'string', description: '纪要主题', required: true }],
    handler: async ({ topic }) => ({
      __payload: {
        type: 'document' as const,
        title: `调研纪要：${topic}`,
        data: {
          content:
            `## 调研纪要：${topic}\n\n**结论**：行业景气度延续上行，龙头集中度提升。\n\n`
            + '- 需求端：下游订单同比 +24%，排产饱满至 Q4\n'
            + '- 供给端：新增产能爬坡低于预期，价格具备支撑\n'
            + '- 风险点：原材料价格波动、海外政策不确定性\n\n'
            + '> 本纪要由 AI 生成，仅供内部参考，不构成投资建议。',
        },
      },
      ok: true,
    }),
  },
]
