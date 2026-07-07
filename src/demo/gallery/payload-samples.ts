/**
 * AG-UI 载荷的示例数据（按 Agent 域分组）—— 供组件演示页静态展示使用
 */
import type { StructuredPayload } from '../../lib/agent-copilot'

// ---- Chat Agent ----

export const samplePlan: StructuredPayload = {
  type: 'plan',
  title: '差旅报销办理计划',
  data: {
    steps: [
      { title: '收集发票与行程单', description: '机票、酒店发票及行程确认单', status: 'done' },
      { title: '填写报销单', description: '按费用类别填写金额与事由', status: 'done' },
      { title: '部门经理审批', description: '金额超 5000 元需二级审批', status: 'doing' },
      { title: '财务打款', description: '审批通过后 3 个工作日内到账', status: 'todo' },
    ],
  },
}

export const sampleCitations: StructuredPayload = {
  type: 'citations',
  title: '参考来源',
  data: {
    items: [
      { title: '差旅费管理办法（2025 修订版）', snippet: '国内出差住宿标准：一线城市每晚不超过 600 元…', source: '公司制度库', score: 0.95 },
      { title: '报销流程操作手册', snippet: '报销单须在费用发生后 30 天内提交…', source: 'OA 帮助中心', score: 0.87 },
      { title: '增值税发票合规指引', snippet: '抬头须为公司全称，税号需完整…', source: '财务部公告', url: 'https://example.com/fapiao', score: 0.74 },
    ],
  },
}

export const sampleCard: StructuredPayload = {
  type: 'card',
  title: '审批单摘要',
  data: {
    单号: 'BX-2026-0703',
    申请人: '张三',
    金额: '¥4,280.00',
    状态: '待审批',
    提交时间: '2026-07-01 14:30',
  },
}

// ---- Code Agent ----

// ---- Code Agent ----
// 一套连贯的工程改造叙事：新增带指数退避重试的 API 客户端 → 业务侧接入 Diff → 涉及文件 → 质量门禁验证

export const sampleCode: StructuredPayload = {
  type: 'code',
  title: '新增：带指数退避与超时的请求客户端',
  data: {
    language: 'typescript',
    filename: 'src/lib/http/client.ts',
    showLineNumbers: true,
    highlightLines: [18, 19, 20, 21, 27],
    code: `export interface RequestOptions extends RequestInit {
  /** 最大重试次数（仅对幂等请求与 5xx/429 生效） */
  retries?: number
  /** 单次请求超时（ms） */
  timeout?: number
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

export class HttpError extends Error {
  constructor(public status: number, public url: string, message?: string) {
    super(message ?? \`HTTP \${status}: \${url}\`)
    this.name = 'HttpError'
  }
}

export async function request<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const { retries = 2, timeout = 8_000, ...init } = opts
  const isIdempotent = !init.method || ['GET', 'HEAD', 'PUT', 'DELETE'].includes(init.method)

  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeout)
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      if (!res.ok) throw new HttpError(res.status, url)
      return (await res.json()) as T
    } catch (err) {
      const retryable =
        isIdempotent &&
        attempt < retries &&
        (err instanceof DOMException || (err instanceof HttpError && RETRYABLE_STATUS.has(err.status)))
      if (!retryable) throw err
      // 指数退避 + 抖动：500ms, 1s, 2s ...
      await new Promise((r) => setTimeout(r, 2 ** attempt * 500 + Math.random() * 100))
    } finally {
      clearTimeout(timer)
    }
  }
}`,
    caption: '高亮行：重试仅对幂等方法 + 可重试状态码生效；退避加入抖动避免惊群',
  },
}

export const sampleDiff: StructuredPayload = {
  type: 'diff',
  title: '业务侧接入：user API 迁移到统一客户端',
  data: {
    filename: 'src/api/user.ts',
    language: 'typescript',
    additions: 8,
    deletions: 5,
    lines: [
      { type: 'hunk', text: '@@ -1,6 +1,7 @@' },
      { type: 'del', text: "import { API_BASE } from '../config'", oldNo: 1 },
      { type: 'add', text: "import { API_BASE } from '../config'", newNo: 1 },
      { type: 'add', text: "import { request, HttpError } from '../lib/http/client'", newNo: 2 },
      { type: 'ctx', text: "import type { User } from '../types'", oldNo: 2, newNo: 3 },
      { type: 'hunk', text: '@@ -12,11 +13,14 @@ export async function getUser(id: string): Promise<User | null> {' },
      { type: 'del', text: '  const res = await fetch(`${API_BASE}/users/${id}`)', oldNo: 12 },
      { type: 'del', text: '  return res.json()', oldNo: 13 },
      { type: 'add', text: '  try {', newNo: 13 },
      { type: 'add', text: '    return await request<User>(`${API_BASE}/users/${id}`, { retries: 2 })', newNo: 14 },
      { type: 'add', text: '  } catch (err) {', newNo: 15 },
      { type: 'add', text: '    if (err instanceof HttpError && err.status === 404) return null', newNo: 16 },
      { type: 'add', text: '    throw err', newNo: 17 },
      { type: 'add', text: '  }', newNo: 18 },
      { type: 'ctx', text: '}', oldNo: 14, newNo: 19 },
      { type: 'hunk', text: '@@ -28,5 +32,4 @@ export async function updateUser(id: string, patch: Partial<User>) {' },
      { type: 'del', text: '  // TODO: 加入错误处理', oldNo: 28 },
      { type: 'del', text: '  await fetch(`${API_BASE}/users/${id}`, { method: "PUT", body: JSON.stringify(patch) })', oldNo: 29 },
      { type: 'add', text: '  await request(`${API_BASE}/users/${id}`, { method: "PUT", body: JSON.stringify(patch) })', newNo: 32 },
      { type: 'ctx', text: '}', oldNo: 30, newNo: 33 },
    ],
  },
}

export const sampleFileTree: StructuredPayload = {
  type: 'file_tree',
  title: '本次改动涉及文件（3 新增 · 2 修改 · 1 删除）',
  data: {
    defaultExpanded: true,
    root: [
      {
        name: 'src', type: 'dir', children: [
          {
            name: 'lib', type: 'dir', children: [
              {
                name: 'http', type: 'dir', children: [
                  { name: 'client.ts', type: 'file', badge: 'new', comment: '统一请求客户端：重试/超时/HttpError' },
                  { name: 'client.test.ts', type: 'file', badge: 'new', comment: '12 个用例覆盖重试与超时分支' },
                ],
              },
            ],
          },
          {
            name: 'api', type: 'dir', children: [
              { name: 'user.ts', type: 'file', badge: 'modified', comment: '迁移到 request()，404 语义化' },
              { name: 'order.ts', type: 'file', badge: 'modified', comment: '同步迁移' },
              { name: 'fetch-helper.ts', type: 'file', badge: 'deleted', comment: '旧封装废弃' },
            ],
          },
          {
            name: 'types', type: 'dir', children: [
              { name: 'http.d.ts', type: 'file', badge: 'new', comment: 'RequestOptions 类型导出' },
            ],
          },
        ],
      },
      { name: 'package.json', type: 'file' },
    ],
  },
}

export const sampleTerminal: StructuredPayload = {
  type: 'terminal',
  title: '质量门禁：类型检查 + 测试 + 构建',
  data: {
    cwd: '~/project',
    exitCode: 0,
    lines: [
      { kind: 'cmd', text: 'pnpm typecheck && pnpm test -- --filter http && pnpm build' },
      { kind: 'out', text: '> tsc --noEmit' },
      { kind: 'out', text: '' },
      { kind: 'out', text: 'RUN  src/lib/http/client.test.ts' },
      { kind: 'out', text: '  ✓ request 正常返回并解析 JSON (11ms)' },
      { kind: 'out', text: '  ✓ 5xx 触发重试，2 次后成功 (1024ms)' },
      { kind: 'out', text: '  ✓ 429 触发退避重试 (517ms)' },
      { kind: 'out', text: '  ✓ POST 非幂等请求不重试 (6ms)' },
      { kind: 'out', text: '  ✓ 超时中断并抛出 AbortError (8012ms)' },
      { kind: 'out', text: '  ✓ 404 抛出 HttpError 且 status 正确 (5ms)' },
      { kind: 'err', text: 'stderr | 预期内的重试告警: retrying GET /users/1 (attempt 2/3)' },
      { kind: 'out', text: 'Tests  12 passed (12)' },
      { kind: 'out', text: 'Duration  9.87s' },
      { kind: 'out', text: '' },
      { kind: 'out', text: 'vite v6.0.3 building for production...' },
      { kind: 'out', text: '✓ 231 modules transformed · built in 1.78s' },
    ],
  },
}

// ---- Data Agent ----
// 一套连贯的经营分析叙事：季度 KPI → 区域对比 → 全年趋势 → 渠道结构 → 明细下钻 → 台账全量

export const sampleMetrics: StructuredPayload = {
  type: 'metrics',
  title: '2026 Q2 经营关键指标',
  data: {
    columns: 4,
    items: [
      { label: '销售总额 (GMV)', value: '2,847', unit: '万元', delta: 12.4, hint: '同比 +9.1%，环比 +12.4%' },
      { label: '毛利率', value: '34.8', unit: '%', delta: 2.1, hint: '产品结构优化贡献 1.4pct' },
      { label: '库存周转天数', value: 38.5, unit: '天', delta: -11.3, invertDelta: true, hint: '环比缩短 4.9 天' },
      { label: '订单履约率', value: '96.2', unit: '%', delta: 1.8, hint: '目标 95%，已达标' },
      { label: '客单价', value: '1,286', unit: '元', delta: 4.6 },
      { label: '复购率', value: '41.3', unit: '%', delta: 3.2, hint: '会员运营拉动' },
      { label: '获客成本 (CAC)', value: '218', unit: '元', delta: -6.5, invertDelta: true, hint: '投放渠道调优' },
      { label: '退货率', value: '2.7', unit: '%', delta: 0.3, invertDelta: true, hint: '略升，需关注华南仓' },
    ],
  },
}

export const sampleChart: StructuredPayload = {
  type: 'chart',
  title: '各大区销售额与目标达成（万元）',
  data: {
    kind: 'bar',
    labels: ['华东', '华南', '华北', '西南', '华中', '东北'],
    unit: '万元',
    series: [
      { name: '2026 Q1 实际', values: [612, 488, 435, 296, 264, 158] },
      { name: '2026 Q2 实际', values: [721, 542, 468, 371, 302, 143] },
      { name: 'Q2 目标', values: [680, 560, 450, 340, 290, 170], color: '#94a3b8' },
    ],
  },
}

export const sampleLineChart: StructuredPayload = {
  type: 'chart',
  title: '近 12 个月营收 / 成本 / 毛利走势',
  data: {
    kind: 'line',
    labels: ['7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月'],
    unit: '万元',
    height: 280,
    series: [
      { name: '营收', values: [842, 796, 918, 1035, 1287, 1152, 863, 724, 946, 988, 1042, 1121] },
      { name: '成本', values: [571, 548, 622, 689, 831, 764, 592, 511, 638, 651, 672, 703] },
      { name: '毛利', values: [271, 248, 296, 346, 456, 388, 271, 213, 308, 337, 370, 418], color: '#059669' },
    ],
  },
}

export const samplePieChart: StructuredPayload = {
  type: 'chart',
  title: 'Q2 销售渠道结构',
  data: {
    kind: 'pie',
    labels: ['直营电商', '经销商', 'KA 大客户', '直播渠道', '线下门店', '其他'],
    series: [{ name: '销售占比', values: [31.5, 24.8, 18.2, 12.6, 9.4, 3.5] }],
    unit: '%',
  },
}

export const sampleSqlResult: StructuredPayload = {
  type: 'sql_result',
  title: '下钻：华南大区 Top 客户贡献与逾期账款',
  data: {
    sql: `WITH q2_sales AS (
  SELECT customer_id,
         SUM(amount)                                        AS gmv,
         SUM(amount) FILTER (WHERE due_date < CURRENT_DATE
                               AND paid_at IS NULL)         AS overdue_amount
  FROM sales_orders
  WHERE region = '华南'
    AND order_date >= DATE '2026-04-01'
  GROUP BY customer_id
)
SELECT c.name                                   AS customer,
       c.grade,
       s.gmv,
       ROUND(s.gmv * 100.0 / SUM(s.gmv) OVER (), 1) AS gmv_share,
       COALESCE(s.overdue_amount, 0)            AS overdue_amount,
       RANK() OVER (ORDER BY s.gmv DESC)        AS rk
FROM q2_sales s
JOIN customers c ON c.id = s.customer_id
ORDER BY rk
LIMIT 6`,
    elapsedMs: 132,
    rowCount: 6,
    columns: [
      { key: 'customer', label: '客户' },
      { key: 'grade', label: '等级' },
      { key: 'gmv', label: 'Q2 销售额' },
      { key: 'gmv_share', label: '占比 (%)' },
      { key: 'overdue_amount', label: '逾期账款' },
      { key: 'rk', label: '排名' },
    ],
    rows: [
      { customer: '骏达商贸集团', grade: 'KA', gmv: '¥1,286,400', gmv_share: 23.7, overdue_amount: '¥0', rk: 1 },
      { customer: '南粤连锁百货', grade: 'KA', gmv: '¥964,200', gmv_share: 17.8, overdue_amount: '¥186,000', rk: 2 },
      { customer: '鹏城优选电商', grade: 'A', gmv: '¥738,500', gmv_share: 13.6, overdue_amount: '¥0', rk: 3 },
      { customer: '珠江食品批发', grade: 'A', gmv: '¥612,800', gmv_share: 11.3, overdue_amount: '¥64,500', rk: 4 },
      { customer: '海西贸易行', grade: 'B', gmv: '¥487,300', gmv_share: 9.0, overdue_amount: '¥0', rk: 5 },
      { customer: '闽南商超联盟', grade: 'B', gmv: '¥413,600', gmv_share: 7.6, overdue_amount: '¥28,200', rk: 6 },
    ],
  },
}

export const sampleTable: StructuredPayload = {
  type: 'table',
  title: 'SKU 经营台账（排序 / 筛选 / 分页 / 导出）',
  data: {
    sortable: true,
    filterable: true,
    exportable: true,
    pageSize: 6,
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: '商品名称' },
      { key: 'category', label: '品类' },
      { key: 'gmv', label: 'Q2 销售额(元)', align: 'right' },
      { key: 'margin', label: '毛利率(%)', align: 'right' },
      { key: 'stock', label: '库存(件)', align: 'right' },
      { key: 'turnover', label: '周转(天)', align: 'right' },
      { key: 'status', label: '状态', align: 'center' },
    ],
    rows: [
      { sku: 'SKU-8021', name: '轻量保温杯 500ml', category: '生活用品', gmv: 1286400, margin: 42.5, stock: 3420, turnover: 21, status: '热销' },
      { sku: 'SKU-8017', name: '便携榨汁机 Pro', category: '小家电', gmv: 964200, margin: 38.2, stock: 1180, turnover: 18, status: '热销' },
      { sku: 'SKU-7963', name: '无线蓝牙耳机 X3', category: '数码配件', gmv: 738500, margin: 31.6, stock: 5260, turnover: 45, status: '正常' },
      { sku: 'SKU-8104', name: '折叠收纳箱 60L', category: '生活用品', gmv: 612800, margin: 45.1, stock: 890, turnover: 15, status: '补货中' },
      { sku: 'SKU-7788', name: '智能体脂秤 S2', category: '小家电', gmv: 487300, margin: 28.9, stock: 2140, turnover: 38, status: '正常' },
      { sku: 'SKU-8230', name: '桌面加湿器 mini', category: '小家电', gmv: 413600, margin: 36.4, stock: 4680, turnover: 62, status: '滞销预警' },
      { sku: 'SKU-8095', name: '户外露营灯', category: '户外用品', gmv: 396100, margin: 40.8, stock: 720, turnover: 12, status: '补货中' },
      { sku: 'SKU-7842', name: '陶瓷马克杯套装', category: '生活用品', gmv: 342700, margin: 48.3, stock: 1560, turnover: 26, status: '正常' },
      { sku: 'SKU-8156', name: '车载手机支架', category: '数码配件', gmv: 298400, margin: 52.1, stock: 8930, turnover: 71, status: '滞销预警' },
      { sku: 'SKU-8011', name: '电动牙刷替换头', category: '个护', gmv: 276800, margin: 61.5, stock: 12400, turnover: 33, status: '正常' },
      { sku: 'SKU-7901', name: '瑜伽垫加厚款', category: '户外用品', gmv: 231500, margin: 44.7, stock: 980, turnover: 19, status: '正常' },
      { sku: 'SKU-8177', name: '不锈钢真空饭盒', category: '生活用品', gmv: 187200, margin: 39.2, stock: 2310, turnover: 41, status: '正常' },
    ],
  },
}

// ---- 媒体 ----

export const sampleImage: StructuredPayload = {
  type: 'image',
  title: '生成的横幅示意',
  data: {
    src: '/images/demo-banner.png',
    alt: '蓝色调企业工作台横幅设计示意图',
    prompt: '现代企业工作台横幅，深蓝主色，简洁几何图形',
    caption: '方案 A：深蓝渐变 + 几何切面',
  },
}

// ---- 通用 ----

export const sampleComparison: StructuredPayload = {
  type: 'comparison',
  title: '方案对比',
  data: {
    columns: [
      { key: 'dim', label: '维度' },
      { key: 'a', label: '方案 A（自建）' },
      { key: 'b', label: '方案 B（备选）' },
    ],
    rows: [
      { dim: '初始成本', a: '高（约 80 万）', b: '中（约 35 万/年）' },
      { dim: '上线周期', a: '6-9 个月', b: '2-4 周' },
      { dim: '定制能力', a: '完全可控', b: '受限于外部平台' },
      { dim: '维护负担', a: '需专职团队', b: '平台方负责' },
    ],
  },
}

export const sampleDocument: StructuredPayload = {
  type: 'document',
  title: '会议纪要（草稿）',
  data: {
    content: '## 会议纪要\n\n**主题**：季度目标对齐会\n\n本次会议确认 *三项关键结论*，请相关负责人于 **2026-07-20** 前反馈执行计划。\n\n- 结论一：核心指标保持双位数增长\n- 结论二：新协作流程 7 月起全面推行\n- 结论三：跨部门资源池下月上线',
  },
}

/** 按 Agent 类型分组的示例集合 */
export const SAMPLES_BY_AGENT = {
  chat: [samplePlan, sampleCitations, sampleCard, sampleDocument],
  code: [sampleCode, sampleDiff, sampleFileTree, sampleTerminal],
  data: [sampleMetrics, sampleChart, sampleLineChart, samplePieChart, sampleSqlResult, sampleTable],
  general: [sampleImage, sampleComparison],
} as const
