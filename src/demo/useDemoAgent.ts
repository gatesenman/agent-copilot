/**
 * useDemoAgent — 示例应用的 Agent 装配层（通用协作域，不绑定行业业务）
 * 注册：本体图谱 readable、数据概览 readable、通用工具（Actions）
 * 高影响动作（创建审批/更新状态/指派）标记 requiresApproval，触发 HITL 审批。
 */
import { useCopilotAction, useCopilotReadable, useCopilotAdditionalInstructions } from '../lib/agent-copilot'
import { audit, db, ontology, type ApprovalFlow } from './mock/demo-data'

export function useDemoAgent(currentUser = '演示用户') {
  // ============ Readables：注入实时上下文 ============

  useCopilotReadable({
    description: '通用协作域本体知识图谱（对象类型、同义词、关系、治理规则）',
    value: () => ontology,
  })

  useCopilotReadable({
    description: '数据概览（各对象数量与状态分布）',
    value: () => ({
      工作项数: db.workItems.length,
      审批流数: db.approvalFlows.length,
      成员数: db.members.length,
      当前用户: currentUser,
      当前日期: new Date().toLocaleDateString('zh-CN'),
    }),
  })

  useCopilotAdditionalInstructions({
    instructions: '所有查询必须通过工具获取真实数据，禁止凭空捏造编号或数据。',
  })

  // ============ 查询类工具（低影响，自动执行） ============

  useCopilotAction({
    name: 'searchWorkItems',
    label: '查询工作项',
    description: '按状态、部门、类别或关键字查询工作项列表。不传条件则返回全部。',
    parameters: [
      { name: 'status', type: 'string', description: '状态过滤：草稿/已提交/审批中/已批准/执行中/已完成/已驳回/已关闭' },
      { name: 'department', type: 'string', description: '部门名称过滤' },
      { name: 'category', type: 'string', description: '类别：设备申请/权限申请/预算申请/任务/变更请求' },
      { name: 'keyword', type: 'string', description: '标题或描述关键字' },
    ],
    handler: (args) => {
      let list = [...db.workItems]
      if (args.status) list = list.filter((w) => w.status === args.status)
      if (args.department) list = list.filter((w) => w.department.includes(String(args.department)))
      if (args.category) list = list.filter((w) => w.category === args.category)
      if (args.keyword) {
        const kw = String(args.keyword)
        list = list.filter((w) => w.title.includes(kw) || w.description.includes(kw) || w.id.includes(kw))
      }
      audit(currentUser, '查询工作项', 'WorkItem', JSON.stringify(args))
      return { total: list.length, items: list }
    },
  })

  useCopilotAction({
    name: 'getWorkItemDetail',
    label: '查看工作项详情',
    description: '按编号查询单个工作项的完整信息，以及其关联的审批流。',
    parameters: [{ name: 'itemId', type: 'string', description: '工作项编号，如 WI-2024-001', required: true }],
    handler: (args) => {
      const item = db.workItems.find((w) => w.id === args.itemId)
      if (!item) return { error: `未找到工作项 ${args.itemId}` }
      const flows = db.approvalFlows.filter((f) => f.workItemId === item.id)
      const assignee = item.assignee ? db.members.find((m) => m.id === item.assignee) : undefined
      return { item, relatedFlows: flows, assignee }
    },
  })

  useCopilotAction({
    name: 'searchMembers',
    label: '查询团队成员',
    description: '按部门、可用状态或关键字查询成员，含角色、负载、评分、技能。',
    parameters: [
      { name: 'department', type: 'string', description: '部门名称' },
      { name: 'availableOnly', type: 'boolean', description: '是否只返回当前可用成员' },
      { name: 'keyword', type: 'string', description: '姓名或技能关键字' },
    ],
    handler: (args) => {
      let list = [...db.members]
      if (args.department) list = list.filter((m) => m.department.includes(String(args.department)))
      if (args.availableOnly) list = list.filter((m) => m.available)
      if (args.keyword) {
        const kw = String(args.keyword)
        list = list.filter((m) => m.name.includes(kw) || m.skills.some((s) => s.includes(kw)))
      }
      audit(currentUser, '查询成员', 'Member', JSON.stringify(args))
      return { total: list.length, items: list }
    },
  })

  useCopilotAction({
    name: 'compareAssignees',
    label: '候选人对比',
    description: '对比多个候选成员的负载、评分、技能匹配度，用于指派决策分析。',
    parameters: [{ name: 'memberIds', type: 'array', description: '成员 ID 列表，如 ["MB-001","MB-002"]', required: true }],
    handler: (args) => {
      const ids = (args.memberIds as string[]) ?? []
      const rows = ids.map((id) => {
        const m = db.members.find((x) => x.id === id)
        return m
          ? { 编号: m.id, 姓名: m.name, 角色: m.role, 部门: m.department, 当前负载: `${m.workload}%`, 评分: m.rating, 可用: m.available, 技能: m.skills.join('、') }
          : { 编号: id, error: '不存在' }
      })
      audit(currentUser, '候选人对比', ids.join(','), `共 ${rows.length} 人`)
      return { candidates: rows }
    },
  })

  useCopilotAction({
    name: 'getAuditLog',
    label: '查询审计日志',
    description: '查询系统操作审计日志（最近 20 条），用于追溯谁在何时做了什么。',
    handler: () => ({ items: db.auditLog.slice(0, 20) }),
  })

  useCopilotAction({
    name: 'explainRules',
    label: '解释治理规则',
    description: '返回系统当前生效的全部治理规则，用于向用户解释为什么某操作被拦截。',
    handler: () => ({ rules: ontology.rules }),
  })

  // ============ 高影响工具（requiresApproval → HITL 审批） ============

  useCopilotAction({
    name: 'createApprovalFlow',
    label: '创建审批流',
    description:
      '为工作项创建审批流并指定审批人。治理规则：工作项状态必须为「已提交」或「审批中」(RULE-001)；金额超 ¥300,000 建议至少 3 级审批 (RULE-003)。高影响动作，需要用户确认。',
    requiresApproval: true,
    parameters: [
      { name: 'itemId', type: 'string', description: '工作项编号', required: true },
      { name: 'approverIds', type: 'array', description: '审批人 ID 列表，如 ["MB-004","MB-005"]', required: true },
      { name: 'deadline', type: 'string', description: '审批截止日期 YYYY-MM-DD', required: true },
    ],
    handler: (args) => {
      const item = db.workItems.find((w) => w.id === args.itemId)
      if (!item) return { error: `未找到工作项 ${args.itemId}` }
      if (item.status !== '已提交' && item.status !== '审批中') {
        return { error: `RULE-001 拦截：工作项 ${item.id} 状态为「${item.status}」，必须为「已提交」或「审批中」才能创建审批流` }
      }
      const approverIds = (args.approverIds as string[]) ?? []
      const invalid = approverIds.filter((id) => !db.members.some((m) => m.id === id))
      if (invalid.length) return { error: `成员不存在: ${invalid.join(', ')}` }

      const flow: ApprovalFlow = {
        id: `AF-2024-${String(db.approvalFlows.length + 12).padStart(3, '0')}`,
        workItemId: item.id,
        title: `${item.title}审批`,
        approvers: approverIds,
        status: '进行中',
        currentStep: 1,
        deadline: String(args.deadline),
        createdAt: new Date().toISOString().slice(0, 10),
      }
      db.approvalFlows.unshift(flow)
      item.status = '审批中'
      audit(currentUser, '创建审批流', flow.id, `工作项: ${item.id}，${approverIds.length} 级审批`)
      const warning = item.amount > 300_000 && approverIds.length < 3
        ? 'RULE-003 提示：涉及金额超 ¥300,000，建议至少 3 级审批'
        : undefined
      return { success: true, flow, warning }
    },
  })

  useCopilotAction({
    name: 'assignWorkItem',
    label: '指派负责人',
    description:
      '把已批准的工作项指派给团队成员执行。治理规则：负责人必须可用且负载低于 90% (RULE-002)。高影响动作，需要用户确认。',
    requiresApproval: true,
    parameters: [
      { name: 'itemId', type: 'string', description: '工作项编号', required: true },
      { name: 'memberId', type: 'string', description: '负责人成员 ID', required: true },
    ],
    handler: (args) => {
      const item = db.workItems.find((w) => w.id === args.itemId)
      if (!item) return { error: `未找到工作项 ${args.itemId}` }
      const member = db.members.find((m) => m.id === args.memberId)
      if (!member) return { error: `未找到成员 ${args.memberId}` }
      if (!member.available) return { error: `RULE-002 拦截：${member.name} 当前不可用` }
      if (member.workload >= 90) {
        return { error: `RULE-002 拦截：${member.name} 当前负载 ${member.workload}%，超过 90% 上限` }
      }
      item.assignee = member.id
      if (item.status === '已批准') item.status = '执行中'
      member.workload = Math.min(100, member.workload + 10)
      audit(currentUser, '指派负责人', item.id, `负责人: ${member.name}`)
      return { success: true, itemId: item.id, assignee: member.name, newStatus: item.status }
    },
  })

  useCopilotAction({
    name: 'updateItemStatus',
    label: '更新工作项状态',
    description:
      '更新工作项的状态（提交/批准/驳回/完成/关闭）。治理规则：已完成的工作项不允许退回草稿 (RULE-004)。高影响动作，需要用户确认。',
    requiresApproval: true,
    parameters: [
      { name: 'itemId', type: 'string', description: '工作项编号', required: true },
      {
        name: 'newStatus', type: 'string', required: true,
        description: '目标状态', enum: ['已提交', '审批中', '已批准', '执行中', '已完成', '已驳回', '已关闭', '草稿'],
      },
    ],
    handler: (args) => {
      const item = db.workItems.find((w) => w.id === args.itemId)
      if (!item) return { error: `未找到工作项 ${args.itemId}` }
      if (item.status === '已完成' && args.newStatus === '草稿') {
        return { error: `RULE-004 拦截：${item.id} 已完成，不允许退回草稿` }
      }
      const oldStatus = item.status
      item.status = args.newStatus as typeof item.status
      audit(currentUser, '更新状态', item.id, `${oldStatus} → ${item.status}`)
      return { success: true, itemId: item.id, from: oldStatus, to: item.status }
    },
  })
}

/** @deprecated 兼容旧引用，请使用 useDemoAgent */
export const useProcurementAgent = useDemoAgent
