/**
 * 各行业方案的工作台装配数据 —— 供 SolutionWorkbench 组合渲染：
 * sidebar（PayloadCard 业务上下文栈）/ tasks（TaskTracker）/ sources（SourcePanel）
 * / sessions（SessionList）/ banner（SafetyBanner）/ usage（UsageMeter）。
 */
import type { AgentTask, StructuredPayload } from '../../lib/agent-copilot'
import type { SourceChunk } from '../../lib/agent-copilot/components/general/SourcePanel.vue'
import type { SessionItem } from '../../lib/agent-copilot/components/general/SessionList.vue'
import type { SolutionBanner, SolutionUsage } from './SolutionWorkbench.vue'

export interface SolutionWorkbenchData {
  sidebarTitle: string
  sidebar: StructuredPayload[]
  tasks?: AgentTask[]
  sources?: SourceChunk[]
  sessions?: SessionItem[]
  banner?: SolutionBanner
  usage?: SolutionUsage
}

const now = Date.now()
const H = 3600_000
const D = 86400_000

// ---------------- 智能客服与工单 ----------------
export const customerServiceWb: SolutionWorkbenchData = {
  sidebarTitle: '服务台实时看板',
  sidebar: [
    {
      type: 'metrics',
      title: '今日服务概览',
      data: {
        columns: 2,
        items: [
          { label: '在线会话', value: 36, delta: 12 },
          { label: '排队人数', value: 4, delta: -35, invertDelta: true },
          { label: '首响时长', value: '18s', delta: -22, invertDelta: true },
          { label: '解决率', value: '92%', delta: 3 },
        ],
      },
    },
    {
      type: 'table',
      title: '待处理工单',
      data: {
        columns: [
          { key: 'id', label: '工单' },
          { key: 'issue', label: '问题' },
          { key: 'status', label: '状态' },
        ],
        rows: [
          { id: 'T-4581', issue: '宽带断网', status: '处理中' },
          { id: 'T-4577', issue: 'IPTV 无信号', status: '待派单' },
          { id: 'T-4570', issue: '账单争议', status: '待回访' },
        ],
      },
    },
  ],
  tasks: [
    { id: 't1', title: '接入用户咨询并识别意图', status: 'done' },
    { id: 't2', title: 'FAQ 检索兜底回答', status: 'done' },
    { id: 't3', title: '创建报障工单', status: 'active', detail: '等待用户确认地址' },
    { id: 't4', title: '回访与满意度评价', status: 'pending' },
  ],
  sessions: [
    { id: 's1', title: '宽带断网报修', preview: '已创建工单 T-4581，预计今日上门', updatedAt: now - 10 * 60_000, pinned: true },
    { id: 's2', title: '账单异常咨询', preview: '5 月账单多计流量费已核实', updatedAt: now - 5 * H },
    { id: 's3', title: '套餐变更咨询', preview: '融合套餐资费对比已发送', updatedAt: now - 2 * D },
  ],
  usage: { promptTokens: 18_400, completionTokens: 6_200, quota: 200_000 },
}

// ---------------- 电商智能导购 ----------------
export const commerceWb: SolutionWorkbenchData = {
  sidebarTitle: '货架与转化上下文',
  sidebar: [
    {
      type: 'metrics',
      title: '今日转化漏斗',
      data: {
        columns: 2,
        items: [
          { label: '导购会话', value: 1284, delta: 18 },
          { label: '加购率', value: '32%', delta: 6 },
          { label: '客单价', value: '¥486', delta: 4 },
          { label: '转化率', value: '11.8%', delta: 2.5 },
        ],
      },
    },
    {
      type: 'table',
      title: '热销降噪耳机 TOP3',
      data: {
        columns: [
          { key: 'name', label: '商品' },
          { key: 'price', label: '价格', align: 'right' },
          { key: 'rating', label: '好评', align: 'right' },
        ],
        rows: [
          { name: 'SoundCore Space Q45', price: '¥2,899', rating: '96%' },
          { name: 'WH-1000XM5', price: '¥2,699', rating: '98%' },
          { name: 'QC45 二代', price: '¥2,399', rating: '95%' },
        ],
      },
    },
  ],
  tasks: [
    { id: 't1', title: '理解预算与需求偏好', status: 'done' },
    { id: 't2', title: '生成商品推荐清单', status: 'active' },
    { id: 't3', title: '关键维度对比', status: 'pending' },
    { id: 't4', title: '下单确认', status: 'pending' },
  ],
  sessions: [
    { id: 's1', title: '降噪耳机选购', preview: '预算 3000，通勤降噪优先', updatedAt: now - 6 * 60_000, pinned: true },
    { id: 's2', title: '机械键盘对比', preview: '红轴 vs 茶轴对比已生成', updatedAt: now - 26 * H },
  ],
  usage: { promptTokens: 9_800, completionTokens: 4_100, quota: 100_000 },
}

// ---------------- 企业知识库问答（RAG） ----------------
export const knowledgeWb: SolutionWorkbenchData = {
  sidebarTitle: '知识库状态',
  sidebar: [
    {
      type: 'metrics',
      title: '索引概览',
      data: {
        columns: 2,
        items: [
          { label: '文档数', value: 1862 },
          { label: '切片数', value: '24.5K' },
          { label: '命中率', value: '87%', delta: 5 },
          { label: '平均置信', value: '0.86' },
        ],
      },
    },
    {
      type: 'timeline_events',
      title: '最近入库',
      data: {
        events: [
          { time: '今天 10:20', title: '《差旅费管理办法 V3.2》', tone: 'success' },
          { time: '昨天 16:05', title: '《信息安全红线手册》', tone: 'info' },
          { time: '周一 09:30', title: '《新员工入职指引》', tone: 'info' },
        ],
      },
    },
  ],
  tasks: [
    { id: 't1', title: '问题改写与检索', status: 'done' },
    { id: 't2', title: '引用来源置信度校验', status: 'active' },
    { id: 't3', title: '生成分步办理指引', status: 'pending' },
  ],
  sources: [
    { id: 'c1', title: '差旅费管理办法', snippet: '员工出差住宿标准：一线城市每晚不超过 550 元，其他城市 400 元……', score: 0.93, location: '知识库/差旅费管理办法.pdf · 第 3 页' },
    { id: 'c2', title: '报销流程指引', snippet: '差旅报销需在返程后 15 个工作日内提交，附发票与行程单……', score: 0.88, location: '知识库/报销流程指引.docx · 第 2 节' },
    { id: 'c3', title: '财务共享中心 FAQ', snippet: '电子发票需验真后上传，重复报销将被系统自动拦截……', score: 0.81, location: '知识库/财务FAQ.md' },
  ],
  sessions: [
    { id: 's1', title: '差旅报销咨询', preview: '流程是什么？需要哪些票据…', updatedAt: now - 15 * 60_000, pinned: true },
    { id: 's2', title: '入职办理指引', preview: '五险一金基数与公积金比例', updatedAt: now - 3 * D },
  ],
  usage: { promptTokens: 32_600, completionTokens: 11_400, quota: 500_000 },
}

// ---------------- HR 招聘助手 ----------------
export const hrWb: SolutionWorkbenchData = {
  sidebarTitle: '招聘漏斗上下文',
  sidebar: [
    {
      type: 'metrics',
      title: '高级前端岗位漏斗',
      data: {
        columns: 2,
        items: [
          { label: '投递简历', value: 128, delta: 24 },
          { label: '初筛通过', value: 22, delta: 10 },
          { label: '面试中', value: 6 },
          { label: '待发 Offer', value: 2 },
        ],
      },
    },
    {
      type: 'table',
      title: '重点候选人',
      data: {
        columns: [
          { key: 'name', label: '候选人' },
          { key: 'exp', label: '经验' },
          { key: 'match', label: '匹配度' },
          { key: 'status', label: '状态' },
        ],
        rows: [
          { name: '陈某', exp: '7 年', match: '92%', status: '待安排二面' },
          { name: '李某', exp: '6 年', match: '88%', status: '一面通过' },
          { name: '王某', exp: '5 年', match: '84%', status: '简历初筛' },
        ],
      },
    },
  ],
  tasks: [
    { id: 't1', title: '按 JD 初筛简历并排序', status: 'done' },
    { id: 't2', title: '候选人维度对比', status: 'active' },
    { id: 't3', title: '安排技术面试', status: 'pending' },
    { id: 't4', title: '面试反馈汇总', status: 'pending' },
  ],
  sessions: [
    { id: 's1', title: '高级前端筛选', preview: 'Vue 5 年以上，已排序 22 人', updatedAt: now - 20 * 60_000, pinned: true },
    { id: 's2', title: '数据工程师 JD 优化', preview: 'JD 关键词与职级已调整', updatedAt: now - 2 * D },
  ],
  usage: { promptTokens: 14_200, completionTokens: 5_800, quota: 200_000 },
}

// ---------------- 法务合同审查 ----------------
export const legalWb: SolutionWorkbenchData = {
  sidebarTitle: '在审合同上下文',
  banner: {
    level: 'warning',
    title: 'AI 审查结论仅供参考',
    detail: '风险判定与修订建议须经执业律师复核后方可对外出具。',
    policy: '法务合规审查规范',
  },
  sidebar: [
    {
      type: 'metrics',
      title: '本合同风险概览',
      data: {
        columns: 2,
        items: [
          { label: '高风险条款', value: 2, invertDelta: true },
          { label: '中风险条款', value: 3 },
          { label: '缺失条款', value: 1 },
          { label: '审查进度', value: '80%' },
        ],
      },
    },
    {
      type: 'timeline_events',
      title: '审查流转记录',
      data: {
        events: [
          { time: '今天 09:12', title: '业务部门提交《设备采购合同》', tone: 'info' },
          { time: '今天 10:40', title: 'AI 完成风险扫描（5 处标注）', tone: 'warning' },
          { time: '待办', title: '主办律师复核并出具意见书', tone: 'danger' },
        ],
      },
    },
  ],
  tasks: [
    { id: 't1', title: '风险条款扫描', status: 'done', detail: '命中 5 处，含 2 处高风险' },
    { id: 't2', title: '修订建议对照', status: 'active' },
    { id: 't3', title: '出具审查意见书', status: 'pending' },
    { id: 't4', title: '律师复核签发', status: 'pending' },
  ],
  sources: [
    { id: 'c1', title: '民法典 · 合同编', snippet: '第五百八十五条：约定的违约金过分高于造成的损失的，人民法院可以适当减少……', score: 0.95, location: '法律法规库 · 民法典' },
    { id: 'c2', title: '公司合同审查指引', snippet: '违约金上限一般不超过合同总额的 20%，超出须业务负责人书面确认……', score: 0.89, location: '制度库/合同审查指引 V2' },
  ],
  sessions: [
    { id: 's1', title: '设备采购合同审查', preview: '违约金条款风险已标注', updatedAt: now - 30 * 60_000, pinned: true },
    { id: 's2', title: '保密协议模板更新', preview: '竞业限制期限调整为 12 个月', updatedAt: now - 4 * D },
  ],
}

// ---------------- 智能运维 AIOps ----------------
export const aiopsWb: SolutionWorkbenchData = {
  sidebarTitle: '生产环境实时状态',
  sidebar: [
    {
      type: 'metrics',
      title: '订单服务健康度',
      data: {
        columns: 2,
        items: [
          { label: 'SLA', value: '99.92%', delta: -0.05, invertDelta: false },
          { label: 'P99 延迟', value: '480ms', delta: 140, invertDelta: true },
          { label: 'QPS', value: '12.4K', delta: 8 },
          { label: '错误率', value: '0.6%', delta: 0.4, invertDelta: true },
        ],
      },
    },
    {
      type: 'timeline_events',
      title: '告警时间线',
      data: {
        events: [
          { time: '14:02', title: 'P99 延迟超阈值（>300ms）', tone: 'danger' },
          { time: '14:03', title: '数据库连接池使用率 97%', tone: 'warning' },
          { time: '14:05', title: '自动扩容预案待执行', tone: 'info' },
        ],
      },
    },
  ],
  tasks: [
    { id: 't1', title: '服务健康巡检', status: 'done' },
    { id: 't2', title: '根因分析（连接池耗尽）', status: 'done', detail: '置信度 0.87' },
    { id: 't3', title: '执行连接池扩容预案', status: 'active' },
    { id: 't4', title: '验证恢复并归档复盘', status: 'pending' },
  ],
  sessions: [
    { id: 's1', title: 'P99 延迟告警排查', preview: '根因：连接池耗尽，预案待执行', updatedAt: now - 8 * 60_000, pinned: true },
    { id: 's2', title: '昨日发布回滚复盘', preview: '灰度 5% 时错误率异常已定位', updatedAt: now - 22 * H },
  ],
  usage: { promptTokens: 21_500, completionTokens: 7_900, quota: 300_000 },
}

// ---------------- 金融投研助手 ----------------
export const financeWb: SolutionWorkbenchData = {
  sidebarTitle: '投研上下文',
  banner: {
    level: 'info',
    title: '本工具输出不构成投资建议',
    detail: '数据可能存在延迟，投资决策请以正式研报与合规披露为准。',
    policy: '投顾合规披露',
  },
  sidebar: [
    {
      type: 'metrics',
      title: '新能源板块基本面',
      data: {
        columns: 2,
        items: [
          { label: '营收增速', value: '18.6%', delta: 2.3 },
          { label: '毛利率', value: '24.1%', delta: -1.2 },
          { label: '市盈率', value: '28.4x' },
          { label: '机构持仓', value: '41%', delta: 3 },
        ],
      },
    },
    {
      type: 'chart',
      title: '近半年营收走势（亿元）',
      data: {
        kind: 'line',
        labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
        series: [
          { name: '板块营收', values: [86, 92, 105, 98, 112, 121] },
          { name: '行业均值', values: [80, 84, 90, 92, 96, 101] },
        ],
      },
    },
  ],
  tasks: [
    { id: 't1', title: '基本面速览', status: 'done' },
    { id: 't2', title: '走势可视化', status: 'done' },
    { id: 't3', title: '起草调研纪要', status: 'active' },
  ],
  sessions: [
    { id: 's1', title: '新能源板块调研', preview: '纪要草稿已生成待审', updatedAt: now - 40 * 60_000, pinned: true },
    { id: 's2', title: '半导体库存周期', preview: '去库存拐点判断依据', updatedAt: now - 3 * D },
  ],
}

// ---------------- 医疗健康助手 ----------------
export const healthcareWb: SolutionWorkbenchData = {
  sidebarTitle: '导诊台上下文',
  banner: {
    level: 'warning',
    title: 'AI 分诊不能替代执业医师诊断',
    detail: '如出现胸痛、意识障碍等急症表现，请立即拨打 120。',
    policy: '医疗合规提示',
  },
  sidebar: [
    {
      type: 'metrics',
      title: '今日门诊号源',
      data: {
        columns: 2,
        items: [
          { label: '心内科余号', value: 12 },
          { label: '神经内科余号', value: 5 },
          { label: '平均候诊', value: '25min' },
          { label: '线上问诊', value: 340, delta: 15 },
        ],
      },
    },
    {
      type: 'timeline_events',
      title: '本次就诊旅程',
      data: {
        events: [
          { time: '已完成', title: '症状描述与 AI 分诊', tone: 'success' },
          { time: '进行中', title: '预约挂号（心内科）', tone: 'info' },
          { time: '待办', title: '就诊与报告解读', tone: 'info' },
        ],
      },
    },
  ],
  tasks: [
    { id: 't1', title: '症状分诊（科室 + 优先级）', status: 'done' },
    { id: 't2', title: '预约挂号', status: 'active' },
    { id: 't3', title: '化验报告解读', status: 'pending' },
  ],
  sources: [
    { id: 'c1', title: '症状分诊指南', snippet: '头晕伴乏力持续两周以上，建议优先排查心血管与内分泌因素……', score: 0.9, location: '临床指南库/分诊指南 2025 版' },
    { id: 'c2', title: '血常规参考区间', snippet: '成人血红蛋白参考区间：男 130-175 g/L，女 115-150 g/L……', score: 0.86, location: '检验手册/血常规' },
  ],
  sessions: [
    { id: 's1', title: '头晕乏力分诊', preview: '建议心内科，已锁定明日号源', updatedAt: now - 12 * 60_000, pinned: true },
    { id: 's2', title: '体检报告解读', preview: '血脂偏高，建议复查', updatedAt: now - 5 * D },
  ],
}

// ---------------- 供应链物流 ----------------
export const logisticsWb: SolutionWorkbenchData = {
  sidebarTitle: '供应链实时看板',
  sidebar: [
    {
      type: 'metrics',
      title: '华东仓健康度',
      data: {
        columns: 2,
        items: [
          { label: '库存周转', value: '9.2天', delta: -0.8, invertDelta: true },
          { label: '缺货 SKU', value: 14, delta: 5, invertDelta: true },
          { label: '在途采购单', value: 23 },
          { label: '履约及时率', value: '96.4%', delta: 1.1 },
        ],
      },
    },
    {
      type: 'table',
      title: '缺货预警 SKU',
      data: {
        columns: [
          { key: 'sku', label: 'SKU' },
          { key: 'stock', label: '库存', align: 'right' },
          { key: 'days', label: '可售天数', align: 'right' },
        ],
        rows: [
          { sku: 'SKU-3301 保温杯', stock: 42, days: 1.5 },
          { sku: 'SKU-1207 电动牙刷', stock: 96, days: 2.2 },
          { sku: 'SKU-5518 筋膜枪', stock: 18, days: 0.8 },
        ],
      },
    },
  ],
  tasks: [
    { id: 't1', title: '库存健康度监控', status: 'done' },
    { id: 't2', title: '在途采购单跟踪', status: 'active', detail: 'PO-8821 清关中' },
    { id: 't3', title: '缺货 SKU 补货建议', status: 'pending' },
  ],
  sessions: [
    { id: 's1', title: '华东仓缺货处置', preview: '14 个 SKU 待补货，3 个紧急', updatedAt: now - 25 * 60_000, pinned: true },
    { id: 's2', title: 'PO-8821 物流跟踪', preview: '已到港，预计明日入仓', updatedAt: now - 6 * H },
  ],
  usage: { promptTokens: 11_300, completionTokens: 4_600, quota: 150_000 },
}
