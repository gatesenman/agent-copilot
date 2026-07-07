/**
 * 行业解决方案扩展包（医疗健康 / HR 招聘 / 法务合同 / 智能运维 / 供应链物流）。
 * 与 industry-demos.ts 同构：每个方案一组前端 Action，
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

// ============ 医疗健康助手（Healthcare） ============

export const healthcareConfig = baseConfig({
  agentType: 'chat',
  botName: '健康助手',
  systemPrompt:
    '你是医院的智能导诊助手。用户描述症状时调用 triage_symptoms 输出分诊建议；'
    + '需要挂号时调用 book_appointment 生成预约卡；用户上传或提及体检指标时调用 explain_report 解读。'
    + '始终提醒「线上建议不能替代面诊，急重症请立即就医」。回复使用简体中文。',
  welcomeScreen: {
    icon: '🏥',
    title: '医疗健康助手',
    subtitle: '症状分诊 · 科室预约 · 报告解读',
    hints: ['最近总是头晕乏力，该看哪个科？', '帮我约一个明天上午的心内科号', '解读一下我的血常规报告'],
  },
})

export const healthcareActions: CopilotActionDef[] = [
  {
    name: 'triage_symptoms',
    description: '根据症状描述输出分诊建议（推荐科室 + 就诊优先级 + 自护建议）',
    parameters: [{ name: 'symptoms', type: 'string', description: '症状描述', required: true }],
    handler: async ({ symptoms }) => ({
      __payload: {
        type: 'plan' as const,
        title: `「${symptoms}」分诊建议`,
        data: {
          steps: [
            { title: '推荐科室：心血管内科', description: '头晕乏力伴随心悸优先排查心源性因素', status: 'doing' },
            { title: '备选科室：神经内科', description: '若伴随视物旋转、肢体麻木则转神经内科', status: 'todo' },
            { title: '就诊前准备', description: '空腹前往（可能需查血脂血糖），带既往病历', status: 'todo' },
            { title: '自护提示', description: '避免剧烈运动与熬夜；若出现胸痛立即急诊', status: 'todo' },
          ],
        },
      },
      disclaimer: '线上分诊仅供参考，不能替代面诊',
    }),
  },
  {
    name: 'book_appointment',
    description: '为用户预约挂号，生成预约确认卡',
    parameters: [
      { name: 'department', type: 'string', description: '科室名称', required: true },
      { name: 'time', type: 'string', description: '期望时间段', required: false },
    ],
    handler: async ({ department, time }) => ({
      __payload: {
        type: 'card' as const,
        title: '预约挂号成功',
        data: {
          预约号: `HC-${String(Math.floor(Math.random() * 90000) + 10000)}`,
          科室: String(department),
          医生: '李建国 主任医师',
          时间: time ? String(time) : '明天上午 09:30-10:00',
          地点: '门诊楼 3 层 B 区 12 诊室',
          提示: '请提前 15 分钟到自助机报到',
        },
      },
      ok: true,
    }),
  },
  {
    name: 'explain_report',
    description: '解读体检/化验报告的关键指标',
    parameters: [{ name: 'reportType', type: 'string', description: '报告类型，如血常规', required: true }],
    handler: async ({ reportType }) => ({
      __payload: {
        type: 'metrics' as const,
        title: `${reportType}关键指标解读`,
        data: {
          columns: 4,
          items: [
            { label: '血红蛋白', value: 118, unit: 'g/L', delta: -8.5, invertDelta: true, hint: '略低于参考下限 120' },
            { label: '白细胞', value: '6.2', unit: '×10⁹/L', hint: '正常范围内' },
            { label: '血小板', value: 245, unit: '×10⁹/L', hint: '正常范围内' },
            { label: '中性粒细胞比', value: '58.3', unit: '%', hint: '正常范围内' },
          ],
        },
      },
      disclaimer: '指标解读仅供参考，请以医生诊断为准',
    }),
  },
]

// ============ HR 招聘助手（Human Resources） ============

export const hrConfig = baseConfig({
  agentType: 'chat',
  botName: '招聘助手',
  systemPrompt:
    '你是企业 HR 招聘助手。用户要筛选简历时调用 screen_resumes 输出候选人表格；'
    + '要对比候选人时调用 compare_candidates；确定面试时调用 schedule_interview 生成面试安排。'
    + '强调客观维度（技能匹配、项目经验），避免主观评价。回复使用简体中文。',
  welcomeScreen: {
    icon: '🧑‍💼',
    title: 'HR 招聘助手',
    subtitle: '简历初筛 · 候选人对比 · 面试安排',
    hints: ['筛选高级前端候选人，要求 Vue 经验 5 年以上', '对比前两位候选人', '给排名第一的安排下周二的技术面'],
  },
})

export const hrActions: CopilotActionDef[] = [
  {
    name: 'screen_resumes',
    description: '按岗位要求初筛简历，返回候选人排序表格',
    parameters: [{ name: 'requirement', type: 'string', description: '岗位要求关键词', required: true }],
    handler: async ({ requirement }) => ({
      __payload: {
        type: 'table' as const,
        title: `「${requirement}」初筛结果（按匹配度排序）`,
        data: {
          sortable: true,
          filterable: true,
          pageSize: 5,
          columns: [
            { key: 'name', label: '候选人' },
            { key: 'match', label: '匹配度', align: 'right' },
            { key: 'exp', label: '相关经验' },
            { key: 'highlight', label: '亮点' },
            { key: 'status', label: '状态' },
          ],
          rows: [
            { name: '张明（P7）', match: '94%', exp: '7 年 / Vue+微前端', highlight: '主导过 50+ 人月中台重构', status: '待约面' },
            { name: '刘洋（P6）', match: '89%', exp: '6 年 / Vue+Node', highlight: '开源组件库 3.2k star', status: '待约面' },
            { name: '陈晨（P6）', match: '82%', exp: '5 年 / React 转 Vue', highlight: '性能优化专项经验', status: '待约面' },
            { name: '王芳（P5）', match: '76%', exp: '4 年 / Vue2 为主', highlight: '低代码平台经验', status: '备选' },
          ],
        },
      },
      count: 4,
    }),
  },
  {
    name: 'compare_candidates',
    description: '对比两位候选人的关键维度',
    parameters: [
      { name: 'candidateA', type: 'string', description: '候选人 A', required: true },
      { name: 'candidateB', type: 'string', description: '候选人 B', required: true },
    ],
    handler: async ({ candidateA, candidateB }) => ({
      __payload: {
        type: 'comparison' as const,
        title: '候选人对比',
        data: {
          columns: [
            { key: 'dim', label: '维度' },
            { key: 'a', label: String(candidateA) },
            { key: 'b', label: String(candidateB) },
          ],
          rows: [
            { dim: '技能匹配', a: '94%（Vue3/Vite/微前端）', b: '89%（Vue3/Node 全栈）' },
            { dim: '项目规模', a: '50+ 人月中台重构', b: '10 人团队组件库' },
            { dim: '技术影响力', a: '内部技术委员会成员', b: '开源 3.2k star' },
            { dim: '期望薪资', a: '45-50k', b: '38-42k' },
            { dim: '到岗时间', a: '一个月内', b: '两周内' },
          ],
        },
      },
      ok: true,
    }),
  },
  {
    name: 'schedule_interview',
    description: '为候选人生成面试安排卡',
    parameters: [
      { name: 'candidate', type: 'string', description: '候选人姓名', required: true },
      { name: 'time', type: 'string', description: '面试时间', required: false },
    ],
    handler: async ({ candidate, time }) => ({
      __payload: {
        type: 'card' as const,
        title: '面试安排已确认',
        data: {
          候选人: String(candidate),
          轮次: '技术一面（60 分钟）',
          时间: time ? String(time) : '下周二 14:00-15:00',
          面试官: '赵工（前端架构师）',
          方式: '腾讯会议（链接已发候选人邮箱）',
          重点: '微前端架构设计 + 性能优化实战',
        },
      },
      ok: true,
    }),
  },
]

// ============ 法务合同审查（Legal） ============

export const legalConfig = baseConfig({
  agentType: 'chat',
  botName: '法务助手',
  systemPrompt:
    '你是企业法务合同审查助手。用户提交合同审查时调用 scan_risks 输出风险条款清单；'
    + '用户要修订建议时调用 suggest_revision 生成修订对照；要出具审查意见时调用 draft_opinion。'
    + '强调「AI 审查结论需经执业律师复核」。回复使用简体中文。',
  welcomeScreen: {
    icon: '⚖️',
    title: '法务合同审查',
    subtitle: '风险扫描 · 修订建议 · 审查意见书',
    hints: ['审查这份采购合同的风险条款', '违约金条款怎么改更稳妥？', '出一份正式的审查意见书'],
  },
})

export const legalActions: CopilotActionDef[] = [
  {
    name: 'scan_risks',
    description: '扫描合同风险条款，返回风险清单表格',
    parameters: [{ name: 'contractType', type: 'string', description: '合同类型', required: true }],
    handler: async ({ contractType }) => ({
      __payload: {
        type: 'table' as const,
        title: `${contractType}风险扫描结果`,
        data: {
          sortable: true,
          columns: [
            { key: 'clause', label: '条款位置' },
            { key: 'risk', label: '风险等级' },
            { key: 'issue', label: '问题描述' },
            { key: 'basis', label: '审查依据' },
          ],
          rows: [
            { clause: '第 8.2 条 违约金', risk: '高', issue: '违约金上限约定为合同总额 50%，显失公平', basis: '民法典 585 条：过分高于损失可请求调减' },
            { clause: '第 12 条 争议解决', risk: '高', issue: '约定对方所在地仲裁，维权成本高', basis: '建议改为原告所在地法院管辖' },
            { clause: '第 5.3 条 验收标准', risk: '中', issue: '验收标准表述模糊（"符合行业惯例"）', basis: '应引用具体国标/行标编号' },
            { clause: '第 9 条 知识产权', risk: '低', issue: '未明确交付物源码归属', basis: '建议补充「交付即转移」条款' },
          ],
        },
      },
      disclaimer: 'AI 审查结论需经执业律师复核',
    }),
  },
  {
    name: 'suggest_revision',
    description: '对指定条款给出修订建议对照',
    parameters: [{ name: 'clause', type: 'string', description: '条款名称', required: true }],
    handler: async ({ clause }) => ({
      __payload: {
        type: 'comparison' as const,
        title: `「${clause}」修订建议`,
        data: {
          columns: [
            { key: 'dim', label: '' },
            { key: 'a', label: '原条款' },
            { key: 'b', label: '建议修订' },
          ],
          rows: [
            { dim: '表述', a: '乙方违约的，应支付合同总额 50% 的违约金', b: '乙方违约的，应支付实际损失 130% 的违约金，上限不超过合同总额 20%' },
            { dim: '风险', a: '可能被法院调减，且激化合作关系', b: '与损失挂钩，兼顾威慑与可执行性' },
            { dim: '依据', a: '—', b: '民法典 585 条及最高法关于违约金的司法解释' },
          ],
        },
      },
      ok: true,
    }),
  },
  {
    name: 'draft_opinion',
    description: '出具正式的合同审查意见书',
    parameters: [{ name: 'contractName', type: 'string', description: '合同名称', required: true }],
    handler: async ({ contractName }) => ({
      __payload: {
        type: 'document' as const,
        title: `合同审查意见书：${contractName}`,
        data: {
          content:
            `## 合同审查意见书\n\n**审查对象**：${contractName}\n**审查结论**：有条件通过（2 项高风险条款须修订后签署）\n\n`
            + '### 主要风险\n'
            + '1. **违约金条款（8.2 条）**：约定过高，存在被调减风险，建议改为与实际损失挂钩\n'
            + '2. **争议解决条款（12 条）**：管辖地不利，建议变更为我方所在地法院管辖\n\n'
            + '### 一般建议\n'
            + '- 验收标准应引用具体国标编号（5.3 条）\n'
            + '- 补充交付物知识产权归属约定（9 条）\n\n'
            + '> 本意见书由 AI 辅助生成，最终以执业律师复核意见为准。',
        },
      },
      ok: true,
    }),
  },
]

// ============ 智能运维 AIOps ============

export const aiopsConfig = baseConfig({
  agentType: 'data',
  botName: '运维助手',
  systemPrompt:
    '你是 SRE 智能运维助手。用户问服务状态时调用 show_service_health 展示健康指标；'
    + '有告警要排查时调用 diagnose_alert 输出根因分析步骤；确认处置时调用 execute_runbook 执行预案。'
    + '结论给出置信度，重大操作提示需要人工确认。回复使用简体中文。',
  welcomeScreen: {
    icon: '🛠️',
    title: '智能运维 AIOps',
    subtitle: '健康巡检 · 根因分析 · 预案执行',
    hints: ['看一下订单服务的健康状态', '排查刚才的 P99 延迟告警', '执行数据库连接池扩容预案'],
  },
})

export const aiopsActions: CopilotActionDef[] = [
  {
    name: 'show_service_health',
    description: '展示服务的核心健康指标',
    parameters: [{ name: 'service', type: 'string', description: '服务名称', required: true }],
    handler: async ({ service }) => ({
      __payload: {
        type: 'metrics' as const,
        title: `${service} · 实时健康度`,
        data: {
          columns: 4,
          items: [
            { label: '可用性 SLA', value: '99.92', unit: '%', delta: -0.06, invertDelta: true, hint: '低于 99.95 目标' },
            { label: 'P99 延迟', value: 486, unit: 'ms', delta: 62.0, invertDelta: true, hint: '超 200ms 阈值' },
            { label: 'QPS', value: '12.4k', delta: 18.2, hint: '大促流量爬升' },
            { label: '错误率', value: '0.83', unit: '%', delta: 0.4, invertDelta: true },
          ],
        },
      },
      ok: true,
    }),
  },
  {
    name: 'diagnose_alert',
    description: '对告警做根因分析，输出排查链路步骤',
    parameters: [{ name: 'alert', type: 'string', description: '告警描述', required: true }],
    handler: async ({ alert }) => ({
      __payload: {
        type: 'plan' as const,
        title: `「${alert}」根因分析`,
        data: {
          steps: [
            { title: '指标关联分析', description: 'P99 飙升与数据库连接等待时间强相关（r=0.94）', status: 'done' },
            { title: '慢查询定位', description: 'order_detail 联表查询未走索引，扫描 340 万行', status: 'done' },
            { title: '根因确认', description: '昨晚发布引入新查询条件，索引未同步创建（置信度 92%）', status: 'done' },
            { title: '处置建议', description: '临时扩容连接池 + 紧急创建复合索引 idx_order_status_time', status: 'doing' },
          ],
        },
      },
      confidence: 0.92,
    }),
  },
  {
    name: 'execute_runbook',
    description: '执行标准处置预案，返回执行回执卡',
    parameters: [{ name: 'runbook', type: 'string', description: '预案名称', required: true }],
    handler: async ({ runbook }) => ({
      __payload: {
        type: 'card' as const,
        title: '预案执行回执',
        data: {
          预案: String(runbook),
          工单: `OPS-${String(Math.floor(Math.random() * 90000) + 10000)}`,
          执行动作: '连接池 200 → 400，灰度 20% 流量验证',
          执行结果: 'P99 延迟 486ms → 178ms（恢复阈值内）',
          审批: '已按 SOP 免审（低危预案）',
          后续: '索引创建工单已流转 DBA，预计 30 分钟完成',
        },
      },
      ok: true,
    }),
  },
]

// ============ 供应链物流（Supply Chain） ============

export const logisticsConfig = baseConfig({
  agentType: 'data',
  botName: '供应链助手',
  systemPrompt:
    '你是供应链运营助手。用户问库存时调用 show_inventory 展示库存健康度；'
    + '查物流时调用 track_shipment 输出在途跟踪步骤；库存告急时调用 suggest_replenishment 给出补货建议表。'
    + '结论标注数据截止时间。回复使用简体中文。',
  welcomeScreen: {
    icon: '📦',
    title: '供应链物流',
    subtitle: '库存监控 · 在途跟踪 · 智能补货',
    hints: ['华东仓的库存健康度怎么样？', '跟踪一下 PO-8821 的物流', '给缺货 SKU 生成补货建议'],
  },
})

export const logisticsActions: CopilotActionDef[] = [
  {
    name: 'show_inventory',
    description: '展示仓库库存健康度指标',
    parameters: [{ name: 'warehouse', type: 'string', description: '仓库名称', required: true }],
    handler: async ({ warehouse }) => ({
      __payload: {
        type: 'metrics' as const,
        title: `${warehouse} · 库存健康度（截至今日 10:00）`,
        data: {
          columns: 4,
          items: [
            { label: '库存周转天数', value: '18.5', unit: '天', delta: -2.3, hint: '周转效率提升' },
            { label: '缺货 SKU', value: 12, unit: '个', delta: 5.0, invertDelta: true, hint: '3 个为爆款' },
            { label: '滞销库存占比', value: '6.8', unit: '%', delta: -1.2 },
            { label: '在途库存', value: '2.4', unit: '万件', hint: '预计 3 日内入库' },
          ],
        },
      },
      ok: true,
    }),
  },
  {
    name: 'track_shipment',
    description: '跟踪采购单/运单的物流进度',
    parameters: [{ name: 'orderId', type: 'string', description: '单号', required: true }],
    handler: async ({ orderId }) => ({
      __payload: {
        type: 'plan' as const,
        title: `${orderId} 在途跟踪`,
        data: {
          steps: [
            { title: '供应商发货', description: '深圳仓 6/30 18:20 发出，共 1,200 件', status: 'done' },
            { title: '干线运输', description: '当前位于杭州中转场，较计划晚 4 小时', status: 'doing' },
            { title: '到仓预约', description: '已预约华东仓 7/4 08:00-12:00 卸货窗口', status: 'todo' },
            { title: '质检上架', description: '预计 7/4 18:00 前完成上架可售', status: 'todo' },
          ],
        },
      },
      ok: true,
    }),
  },
  {
    name: 'suggest_replenishment',
    description: '为缺货 SKU 生成补货建议表',
    parameters: [{ name: 'scope', type: 'string', description: '范围，如爆款/全部', required: false }],
    handler: async ({ scope }) => ({
      __payload: {
        type: 'table' as const,
        title: `补货建议（${scope || '缺货 SKU'} · 按紧急度排序）`,
        data: {
          sortable: true,
          columns: [
            { key: 'sku', label: 'SKU' },
            { key: 'days', label: '可售天数', align: 'right' },
            { key: 'daily', label: '日均销量', align: 'right' },
            { key: 'suggest', label: '建议补货量', align: 'right' },
            { key: 'route', label: '建议路径' },
          ],
          rows: [
            { sku: 'SKU-1024 无线耳机黑', days: 1.2, daily: 420, suggest: '8,400', route: '深圳仓调拨（2 日达）' },
            { sku: 'SKU-2201 保温杯 500ml', days: 2.5, daily: 310, suggest: '6,200', route: '供应商直发（3 日达）' },
            { sku: 'SKU-0873 充电宝 2 万毫安', days: 3.1, daily: 260, suggest: '5,200', route: '华北仓调拨（2 日达）' },
          ],
        },
      },
      count: 3,
    }),
  },
]
