/**
 * 通用企业演示数据（内存数据库）
 * 不绑定行业业务：工作项（申请/任务）→ 审批流 → 指派执行 的通用协作场景。
 */
import { reactive } from 'vue'

// ============ 类型 ============

export interface WorkItem {
  id: string
  title: string
  category: '设备申请' | '权限申请' | '预算申请' | '任务' | '变更请求'
  description: string
  department: string
  requester: string
  priority: '低' | '中' | '高' | '紧急'
  amount: number // 涉及金额（0 表示无金额）
  status: '草稿' | '已提交' | '审批中' | '已批准' | '执行中' | '已完成' | '已驳回' | '已关闭'
  assignee?: string
  createdAt: string
  dueDate: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  available: boolean
  workload: number // 当前负载 %
  rating: number // 绩效评分 1-5
  skills: string[]
}

export interface ApprovalFlow {
  id: string
  workItemId: string
  title: string
  approvers: string[] // member ids
  status: '草稿' | '进行中' | '已通过' | '已拒绝' | '已撤回'
  currentStep: number
  deadline: string
  createdAt: string
}

export interface AuditRecord {
  id: string
  timestamp: string
  actor: string
  action: string
  target: string
  detail: string
}

// ============ 数据 ============

export const db = reactive({
  workItems: [
    {
      id: 'WI-2024-001',
      title: '开发环境服务器扩容',
      category: '设备申请',
      description: '现有 CI 构建集群资源不足，申请扩容 4 台计算节点',
      department: '研发中心',
      requester: '王一鸣',
      priority: '高',
      amount: 320_000,
      status: '已批准',
      assignee: 'MB-003',
      createdAt: '2024-05-10',
      dueDate: '2024-09-30',
    },
    {
      id: 'WI-2024-002',
      title: '数据仓库读权限开通',
      category: '权限申请',
      description: '数据分析组 5 人申请 dwd 层只读权限',
      department: '数据平台部',
      requester: '李梅',
      priority: '中',
      amount: 0,
      status: '审批中',
      createdAt: '2024-05-18',
      dueDate: '2024-07-15',
    },
    {
      id: 'WI-2024-003',
      title: 'Q3 团队建设预算',
      category: '预算申请',
      description: '三季度团队活动与培训预算',
      department: '人力资源部',
      requester: '赵强',
      priority: '低',
      amount: 120_000,
      status: '已提交',
      createdAt: '2024-05-22',
      dueDate: '2024-08-01',
    },
    {
      id: 'WI-2024-004',
      title: '核心接口性能优化专项',
      category: '任务',
      description: '核心查询接口 P99 延迟超标，需要专项优化到 200ms 以内',
      department: '研发中心',
      requester: '陈晓',
      priority: '紧急',
      amount: 0,
      status: '执行中',
      assignee: 'MB-001',
      createdAt: '2024-05-25',
      dueDate: '2024-07-05',
    },
    {
      id: 'WI-2024-005',
      title: '办公终端批量更新',
      category: '设备申请',
      description: '30 台办公终端到达使用年限，申请统一更换',
      department: '信息技术部',
      requester: '刘芳',
      priority: '中',
      amount: 450_000,
      status: '草稿',
      createdAt: '2024-06-01',
      dueDate: '2024-08-30',
    },
  ] as WorkItem[],

  members: [
    {
      id: 'MB-001',
      name: '张海峰',
      role: '资深工程师',
      department: '研发中心',
      available: true,
      workload: 85,
      rating: 4.8,
      skills: ['性能优化', '分布式系统', 'Go'],
    },
    {
      id: 'MB-002',
      name: '孙婷',
      role: '平台工程师',
      department: '数据平台部',
      available: true,
      workload: 60,
      rating: 4.5,
      skills: ['数据仓库', '权限治理', 'SQL'],
    },
    {
      id: 'MB-003',
      name: '周凯',
      role: '基础设施工程师',
      department: '信息技术部',
      available: true,
      workload: 45,
      rating: 4.2,
      skills: ['服务器运维', '容量规划', '网络'],
    },
    {
      id: 'MB-004',
      name: '吴珊',
      role: '项目经理',
      department: '研发中心',
      available: false,
      workload: 95,
      rating: 4.6,
      skills: ['项目管理', '跨部门协调'],
    },
    {
      id: 'MB-005',
      name: '郑立',
      role: '安全工程师',
      department: '信息安全部',
      available: true,
      workload: 30,
      rating: 3.9,
      skills: ['权限审计', '合规', '风险评估'],
    },
  ] as TeamMember[],

  approvalFlows: [
    {
      id: 'AF-2024-011',
      workItemId: 'WI-2024-001',
      title: '服务器扩容审批',
      approvers: ['MB-004', 'MB-003', 'MB-005'],
      status: '已通过',
      currentStep: 3,
      deadline: '2024-06-20',
      createdAt: '2024-06-05',
    },
  ] as ApprovalFlow[],

  auditLog: [] as AuditRecord[],
})

// ============ 本体知识图谱（通用协作域） ============

export const ontology = {
  version: 'v1.0.0',
  objectTypes: [
    {
      name: '工作项',
      synonyms: ['申请单', '任务', '需求', 'WorkItem', '工单'],
      primaryKey: 'id',
      attributes: ['id', 'title', 'category(类别)', 'department', 'requester(发起人)', 'priority(优先级)', 'amount(金额)', 'status(状态)', 'assignee(负责人)', 'dueDate(截止日)'],
      statuses: ['草稿', '已提交', '审批中', '已批准', '执行中', '已完成', '已驳回', '已关闭'],
      actions: ['查询', '创建', '修改', '提交审批', '指派', '关闭'],
    },
    {
      name: '审批流',
      synonyms: ['审批', 'Approval', '流程'],
      primaryKey: 'id',
      attributes: ['id', 'workItemId(关联工作项)', 'title', 'approvers(审批人)', 'status', 'currentStep(当前节点)', 'deadline(截止日)'],
      statuses: ['草稿', '进行中', '已通过', '已拒绝', '已撤回'],
      actions: ['查询', '创建', '推进', '撤回'],
    },
    {
      name: '成员',
      synonyms: ['员工', '同事', 'Member', '负责人'],
      primaryKey: 'id',
      attributes: ['id', 'name', 'role(角色)', 'department', 'available(可用)', 'workload(负载)', 'rating(评分)', 'skills(技能)'],
      actions: ['查询', '指派', '负载评估'],
    },
    {
      name: '审计日志',
      synonyms: ['操作记录', 'Audit', '日志'],
      primaryKey: 'id',
      attributes: ['id', 'timestamp', 'actor(操作人)', 'action', 'target', 'detail'],
      actions: ['查询', '追溯'],
    },
  ],
  relationships: [
    { from: '工作项', to: '审批流', name: '发起审批', cardinality: '1:N' },
    { from: '审批流', to: '成员', name: '由...审批', cardinality: 'N:N' },
    { from: '工作项', to: '成员', name: '指派给', cardinality: 'N:1' },
    { from: '工作项', to: '审计日志', name: '产生记录', cardinality: '1:N' },
  ],
  rules: [
    { id: 'RULE-001', target: '创建审批流', condition: '工作项状态必须为「已提交」或「审批中」', severity: 'block' },
    { id: 'RULE-002', target: '指派负责人', condition: '负责人必须可用且当前负载低于 90%', severity: 'block' },
    { id: 'RULE-003', target: '创建审批流', condition: '涉及金额超过 ¥300,000 需要至少 3 级审批', severity: 'warn' },
    { id: 'RULE-004', target: '更新状态', condition: '已完成的工作项不允许退回草稿', severity: 'block' },
    { id: 'RULE-005', target: '高影响动作', condition: '创建/修改/指派/审批类动作必须经用户确认', severity: 'block' },
  ],
}

// ============ 审计 ============

export function audit(actor: string, action: string, target: string, detail: string) {
  db.auditLog.unshift({
    id: `AUD-${Date.now().toString(36)}`,
    timestamp: new Date().toLocaleString('zh-CN'),
    actor,
    action,
    target,
    detail,
  })
}
