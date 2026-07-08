/**
 * 全组件 API 速查数据 —— 从库源码 defineProps / defineEmits 提取整理。
 * 供 ApiReferencePane 渲染可搜索、按域分组的 Props / 事件 / 插槽表。
 */

export interface ApiProp {
  name: string
  type: string
  default?: string
  desc: string
}

export interface ApiEvent {
  name: string
  payload: string
  desc: string
}

export interface ApiSlot {
  name: string
  desc: string
}

export interface ComponentApi {
  name: string
  brief: string
  when: string
  props: ApiProp[]
  events?: ApiEvent[]
  slots?: ApiSlot[]
}

export interface ApiGroup {
  id: string
  label: string
  components: ComponentApi[]
}

export const COMPONENT_API_GROUPS: ApiGroup[] = [
  {
    id: 'chat',
    label: '对话 Chat',
    components: [
      {
        name: 'CopilotProvider',
        brief: '根供给组件：创建会话 store 并向后代注入',
        when: '任何使用库内组件的子树最外层。config 变化时自动重建运行时。',
        props: [{ name: 'config', type: 'CopilotConfig', desc: '完整会话配置（provider/endpoint/theme/approval 等）' }],
        slots: [{ name: 'default', desc: '获得注入 store 的组件子树' }],
      },
      {
        name: 'CopilotChat',
        brief: '完整对话面板（顶栏 + 消息流 + 建议 + 输入区）',
        when: '需要开箱即用的完整聊天界面时。细粒度定制请改用原子组件拼装。',
        props: [
          { name: 'title', type: 'string', default: 'config.botName', desc: '顶部标题' },
          { name: 'subtitle', type: 'string', desc: '副标题' },
          { name: 'initialMessage', type: 'string', desc: '无消息时的欢迎语' },
          { name: 'placeholder', type: 'string', desc: '输入框占位文案' },
          { name: 'showHeader', type: 'boolean', default: 'true', desc: '是否显示顶栏' },
          { name: 'showReset', type: 'boolean', default: 'true', desc: '是否显示清空按钮' },
          { name: 'messageActions', type: 'MessageActionsConfig | false', desc: '消息操作栏配置；false 全隐藏' },
          { name: 'timestamps / avatars', type: 'boolean', desc: '时间戳 / 头像开关（覆盖全局）' },
        ],
        slots: [
          { name: 'header-actions', desc: '顶栏右侧自定义按钮区' },
          { name: 'empty', desc: '空态自定义内容' },
        ],
      },
      {
        name: 'CopilotSidebar / CopilotPopup',
        brief: '侧栏抽屉 / 右下角气泡弹窗形态',
        when: '不占页面主区域的辅助助手。与同一 Provider 下其他组件共享会话。',
        props: [
          { name: 'title / subtitle / initialMessage / placeholder', type: 'string', desc: '同 CopilotChat' },
          { name: 'defaultOpen', type: 'boolean', default: 'false', desc: '初始展开' },
          { name: 'width', type: 'string', default: "'400px'", desc: '（仅 Sidebar）抽屉宽度' },
        ],
      },
      {
        name: 'MessageBubble',
        brief: '单条消息气泡（Markdown/思考块/工具卡/载荷卡/操作栏/分支切换）',
        when: '自组装消息流时逐条渲染。错误消息自动带重试按钮。',
        props: [
          { name: 'message', type: 'ChatMessage', desc: '消息对象（含 content/toolCalls/payloads/thinking/error）' },
          { name: 'actions', type: 'MessageActionsConfig | false', desc: '复制/重新生成/点赞点踩配置' },
          { name: 'toolDisplay', type: 'ToolDisplayConfig', desc: '工具调用展示（卡片/紧凑/隐藏）' },
          { name: 'showTimestamp / showAvatar / showThinking', type: 'boolean', desc: '展示开关' },
          { name: 'botAvatar / userAvatar / botName', type: 'string', desc: '头像与名称' },
          { name: 'feedback', type: "'up' | 'down'", desc: '当前反馈状态' },
          { name: 'branch', type: '{ anchorId; total; active }', desc: '重新生成的分支导航（total>1 显示切换器）' },
          { name: 'onRetry / onRegenerate', type: '() => void', desc: '重试 / 重新生成回调' },
        ],
        events: [
          { name: 'feedback', payload: "'up' | 'down'", desc: '点赞 / 点踩' },
          { name: 'switchBranch', payload: 'target: number', desc: '切换回答分支' },
        ],
      },
      {
        name: 'ChatInput',
        brief: '多功能输入区（斜杠命令 / @提及 / #引用 / 附件 / 语音 / 思考开关 / 队列）',
        when: '自组装界面的输入区。CJK 输入法安全（isComposing 保护）。',
        props: [
          { name: 'disabled / generating', type: 'boolean', desc: '禁用 / 生成中（显示停止按钮）' },
          { name: 'placeholder', type: 'string', desc: '占位文案' },
          { name: 'sendOnEnter', type: 'boolean', default: 'true', desc: 'Enter 发送（Shift+Enter 换行）' },
          { name: 'maxLength', type: 'number', desc: '长度上限（0 = 不限）' },
          { name: 'commands', type: 'SlashCommand[]', desc: '斜杠命令列表（输入 / 唤起面板）' },
          { name: 'mentionProvider / referenceProvider', type: 'MentionProvider', desc: '@提及、#引用 数据源' },
          { name: 'contextItems', type: 'ContextItem[]', desc: '已附着的上下文芯片' },
          { name: 'queueEnabled', type: 'boolean', desc: '生成中允许继续发送（排队）' },
          { name: 'showAttachButton / showVoiceButton / showThinkingToggle', type: 'boolean', desc: '附件 / 语音 / 思考开关' },
          { name: 'thinkingOn', type: 'boolean', desc: '思考开关状态（v-model:thinkingOn）' },
        ],
        events: [
          { name: 'send', payload: 'text: string', desc: '发送消息' },
          { name: 'stop', payload: '—', desc: '停止生成' },
          { name: 'attach', payload: 'files: File[]', desc: '附件选择' },
          { name: 'voice', payload: '—', desc: '语音按钮点击' },
          { name: 'add-context / remove-context', payload: 'ContextItem / id', desc: '上下文芯片增删' },
        ],
        slots: [
          { name: 'toolbar-start', desc: '左侧动作区插槽（附件按钮旁），放访问模式等控件' },
          { name: 'toolbar-end', desc: '发送按钮左侧插槽，放 ModelSelector / 推理力度等控件（CopilotChat 透传）' },
        ],
      },
      {
        name: 'ChatSuggestions',
        brief: 'AI 生成的后续问题建议芯片',
        props: [
          { name: 'suggestions', type: 'ChatSuggestion[]', desc: '建议列表' },
          { name: 'loading', type: 'boolean', desc: '生成中骨架态' },
        ],
        when: '回答完成后引导追问。配合 store.suggestions 使用。',
        events: [{ name: 'select', payload: 'ChatSuggestion', desc: '点击建议' }],
      },
      {
        name: 'MarkdownText',
        brief: 'Markdown 渲染（GFM / 代码高亮 / mermaid / KaTeX 数学）',
        when: '渲染任何模型输出文本。流式时传 streaming 防 mermaid 闪烁。',
        props: [
          { name: 'content', type: 'string', desc: 'Markdown 源文本' },
          { name: 'streaming', type: 'boolean', desc: '流式中：跳过 mermaid、只渲染完整数学定界对' },
        ],
      },
      {
        name: 'CopilotTextarea',
        brief: 'AI 智能文本域（幽灵补全 Tab 接受 / Cmd+K 改写）',
        when: '邮件、文案等需要 AI 辅助撰写的表单场景。',
        props: [
          { name: 'modelValue', type: 'string', desc: '文本（v-model）' },
          { name: 'purpose', type: 'string', desc: '写作目的（驱动补全质量）' },
          { name: 'debounceMs', type: 'number', default: '1000', desc: '停顿多久触发补全' },
          { name: 'rows / placeholder / disabled / hint', type: '—', desc: '常规文本域属性' },
        ],
      },
    ],
  },
  {
    id: 'agentic',
    label: 'Agentic 工作台',
    components: [
      {
        name: 'ModeSelector',
        brief: '权限模式选择（确认编辑 / 自动编辑 / 计划 / 完全访问）',
        when: '工作台顶栏或输入区旁，控制 Agent 权限边界。',
        props: [
          { name: 'mode', type: 'AgentMode', default: "'confirm_edits'", desc: '当前模式（v-model:mode）' },
          { name: 'availableModes', type: 'AgentMode[]', desc: '可用模式（缺省全开）' },
          { name: 'options', type: 'AgentModeOption[]', desc: '自定义文案 / 图标 / 说明' },
          { name: 'size', type: "'sm' | 'md'", default: "'md'", desc: '尺寸' },
          { name: 'disabled', type: 'boolean', desc: '运行中锁定' },
          { name: 'placement', type: "'auto' | 'up' | 'down'", default: "'auto'", desc: '菜单弹出方向（auto 视口自动翻转）' },
          { name: 'showDescription', type: 'boolean', default: 'true', desc: '菜单中显示描述与权限提示；关闭为紧凑单行' },
        ],
        events: [{ name: 'update:mode', payload: 'AgentMode', desc: '模式切换' }],
      },
      {
        name: 'ThinkingBlock',
        brief: '思考过程折叠块（流式展开、结束折叠并显示耗时）',
        when: '展示 reasoning 模型的思维链。MessageBubble 已内置。',
        props: [
          { name: 'content', type: 'string', desc: '思考文本（流式累积）' },
          { name: 'streaming', type: 'boolean', desc: '思考进行中' },
          { name: 'duration', type: 'number', desc: '耗时毫秒（结束后显示）' },
          { name: 'defaultExpanded', type: 'boolean', desc: '初始展开态' },
        ],
      },
      {
        name: 'WorkSummary',
        brief: '工作耗时摘要行（运行中实时走秒，结束后定格"已工作 X 分 X 秒"）',
        when: 'Agent 回合的耗时分隔条（Cursor / VS Code Agent 的 "Worked for Xs" 行）。',
        props: [
          { name: 'startedAt', type: 'number', desc: '开始时间戳毫秒（running 时据此实时计时）' },
          { name: 'durationMs', type: 'number', desc: '定格总耗时���秒（非运行态优先使用）' },
          { name: 'running', type: 'boolean', default: 'false', desc: '运行中（走秒 + 呼吸点）' },
          { name: 'labels', type: '{ working?, worked? }', desc: '文案定制' },
        ],
      },
      {
        name: 'AgentStepList',
        brief: '执行步骤时间流（思考 / 工具 / 终端 / 文件动作的可折叠日志）',
        when: '消息流中按时间线展示 Agent 的执行过程（Claude / v0 式步骤日志）。',
        props: [
          { name: 'steps', type: 'AgentStep[]', desc: '步骤数组（kind: thinking/tool/terminal/file/search/info）' },
          { name: 'compact', type: 'boolean', default: 'false', desc: '紧凑密度' },
        ],
        events: [{ name: 'toggle', payload: '(step, expanded)', desc: '展开 / 收起某步详情' }],
        slots: [{ name: 'detail', desc: '自定义某步详情内容（作用域为 step）' }],
      },
      {
        name: 'CheckpointCard',
        brief: '版本快照卡（版本标签 + 聚合 +/- 差异 + 逐文件统计 + 一键回滚）',
        when: '消息流中展示一次变更的快照摘要与撤销入口，与 ChangeReviewPanel（审查面板）互补。',
        props: [
          { name: 'title', type: 'string', desc: '快照标题' },
          { name: 'version', type: 'string', desc: '版本标签，如 v14' },
          { name: 'files', type: 'FileChange[]', desc: '涉及的文件（读 path / additions / deletions / kind）' },
          { name: 'revertable', type: 'boolean', default: 'true', desc: '显示撤销按钮' },
          { name: 'defaultExpanded', type: 'boolean', default: 'true', desc: '初始展开文件列表' },
        ],
        events: [
          { name: 'revert', payload: '—', desc: '点击撤销回滚' },
          { name: 'select-file', payload: 'FileChange', desc: '点击某个文件行' },
        ],
      },
      {
        name: 'TaskTracker',
        brief: '任务清单（六态 + 子任务层级 + 耗时 + 重试/跳过 + 产物跳转）',
        when: '多步长任务的进度跟踪。由 TASKS_UPDATE 事件驱动。',
        props: [
          { name: 'tasks', type: 'AgentTask[]', desc: '任务数组（支持 subtasks 树形嵌套、activeForm 进行时文案、durationMs、errorReason、artifacts）' },
          { name: 'title', type: 'string', desc: '标题' },
          { name: 'collapsible / defaultCollapsed', type: 'boolean', desc: '折叠行为' },
          { name: 'showProgress', type: 'boolean', default: 'true', desc: '进度统计条（role=progressbar）' },
          { name: 'density', type: "'comfortable' | 'compact'", default: "'comfortable'", desc: '密度；compact 为紧凑单行（适合消息流内嵌）' },
          { name: 'collapseDoneAfter', type: 'number', default: '0', desc: '连续已完成任务超过 N 项时收起为"已完成 N 项"摘要' },
          { name: 'streaming', type: 'boolean', default: 'false', desc: '规划中：尾部显示"计划中…"占位骨架' },
          { name: 'autoScroll', type: 'boolean', default: 'true', desc: 'active 任务变化时自动滚动定位' },
        ],
        events: [
          { name: 'taskClick', payload: 'AgentTask', desc: '点击任务行' },
          { name: 'retry', payload: 'AgentTask', desc: '点击重试（error 且 retryable）' },
          { name: 'skip', payload: 'AgentTask', desc: '点击跳过（skippable）' },
          { name: 'artifactClick', payload: '(AgentTaskArtifact, AgentTask)', desc: '点击任务产物' },
        ],
      },
      {
        name: 'PlanPanel',
        brief: '统一计划审查：传 plan 为结构化步骤形态（可编辑步骤 → 批准 → 执行进度）；传 content 为 Markdown 长文形态（折叠预览渐隐 + 全文编辑 + 确认 / 驳回）',
        when: 'Plan 模式下让用户审阅 Agent 的执行方案。行业内（Claude Code / Cursor Plan Review）计划审查为一个组件，两形态在此合一。原 PlanReviewCard 为本组件兼容别名。',
        props: [
          { name: 'plan', type: 'PlanSpec', desc: '结构化计划（status: draft/approved/executing/done/rejected）；与 content 二选一' },
          { name: 'content', type: 'string', desc: 'Markdown 计划全文（长文形态，支持 v-model:content）' },
          { name: 'status', type: "'draft' | 'approved' | 'rejected'", default: "'draft'", desc: '长文形态审查状态' },
          { name: 'editable', type: 'boolean', default: 'true', desc: 'draft 态允许编辑（步骤增删改 / 全文 textarea）' },
          { name: 'collapsedHeight', type: 'number', default: '300', desc: '长文形态折叠预览高度（px）' },
          { name: 'defaultExpanded', type: 'boolean', default: 'false', desc: '长文形态初始是否展开' },
        ],
        events: [
          { name: 'approve', payload: 'PlanStep[] | string', desc: '批准：结构化形态携带编辑后步骤；长文形态携带最终文本' },
          { name: 'reject', payload: '—', desc: '驳回' },
          { name: 'update:plan', payload: 'PlanSpec', desc: '步骤编辑' },
          { name: 'update:content', payload: 'string', desc: '全文编辑保存' },
        ],
      },
      {
        name: 'ChangeReviewPanel',
        brief: '文件变更审查（逐个 / 批量接受、拒绝，diff 预览；支持折叠汇总条形态）',
        when: '确认编辑模式下审阅 Agent 的文件改动。由 FILE_CHANGE 事件驱动。',
        props: [
          { name: 'changes', type: 'FileChange[]', desc: '变更列表（create/update/delete + diff）' },
          { name: 'readonly', type: 'boolean', desc: '审查完成后的只读展示' },
          { name: 'collapsible', type: 'boolean', default: 'false', desc: '折叠汇总条形态（"N 个文件已更改 +x -y [撤销]"，点击展开列表）' },
          { name: 'defaultExpanded', type: 'boolean', default: 'false', desc: 'collapsible 时初始是否展开' },
        ],
        events: [
          { name: 'review', payload: "changeId | 'all', 'accepted' | 'rejected'", desc: '审查决定' },
          { name: 'open', payload: 'FileChange', desc: '打开文件详情' },
        ],
      },
      {
        name: 'AgentFormCard',
        brief: 'AI 下发的动态表单（12 种字段类型 + 校验 + AI 检查回显）',
        when: 'Agent 需要采集结构化输入时（FORM_REQUEST / request_form 工具）。',
        props: [
          { name: 'form', type: 'FormPayload', desc: '表单规格（title/fields/submitLabel）' },
          { name: 'submitted / submittedValues', type: 'boolean / Record', desc: '已提交只读回显' },
          { name: 'reviewing', type: 'boolean', desc: '提交后 AI 审查中的加载态' },
          { name: 'disabled', type: 'boolean', desc: '禁用' },
        ],
        events: [
          { name: 'submit', payload: 'values: Record<string, unknown>', desc: '提交（已通过本地校验）' },
          { name: 'cancel', payload: '—', desc: '取消' },
        ],
      },
      {
        name: 'ClarifyCard',
        brief: '歧义澄清多选卡（支持"其他"自由输入）',
        when: 'Agent 需求不明确时先澄清再执行。',
        props: [
          { name: 'questions', type: 'ClarifyQuestion[]', desc: '问题与选项' },
          { name: 'submitted / submittedAnswers', type: 'boolean / Record', desc: '已提交只读态' },
        ],
        events: [{ name: 'submit', payload: 'answers: Record<string, string[]>', desc: '提交答案' }],
      },
      {
        name: 'ToolActionCard',
        brief: '工具调用卡：种类图标 + 参数摘要 + 耗时 + 特化结果渲染（终端输出/diff 着色/可点链接）+ 自定义渲染器注册表',
        when: '消息内展示 TOOL_CALL_* 事件，MessageBubble 已内置。行业对标 AG-UI toolRenderers / CopilotKit useRenderTool：renderers 按工具名注册组件可完全接管渲染。',
        props: [
          { name: 'toolCall', type: 'ToolCallState', desc: '调用状态（args/result/status）' },
          { name: 'kind', type: 'ToolActionKind', desc: '显式种类（file/terminal/search/browser…）' },
          { name: 'defaultExpanded', type: 'boolean', desc: '初始展开详情' },
          { name: 'renderers', type: 'Record<string, Component>', desc: "工具名 → 组件注册表，'default' 为兜底；也可经 config.toolDisplay.renderers 全局注入" },
        ],
      },
    ],
  },
  {
    id: 'workspace',
    label: '工作区面板',
    components: [
      {
        name: 'AgentWorkspace',
        brief: '整装三栏工作台（会话 + 变更/计划/任务/文件/终端/浏览器面板）',
        when: '一行代码得到完整 Agentic IDE 布局。细粒度定制用下面的原子面板。',
        props: [
          { name: 'files', type: 'WorkspaceFile[]', desc: '文件树数据' },
          { name: 'visiblePanels', type: "('changes'|'plan'|'tasks'|'files'|'terminal'|'browser')[]", desc: '右栏面板白名单' },
          { name: 'browserSrc / browserScreenshot / browserTitle', type: 'string', desc: '浏览器面板内容' },
          { name: 'panelWidth / sidebarWidth / height', type: 'string', desc: '布局尺寸' },
          { name: 'showModeSelector', type: 'boolean', desc: '顶栏权限模式选择器' },
          { name: 'terminalInteractive', type: 'boolean', desc: '终端允许手动输入命令' },
        ],
        events: [
          { name: 'terminalCommand', payload: 'cmd: string', desc: '终端手动命令' },
          { name: 'browserNavigate', payload: 'url: string', desc: '浏览器地址跳转' },
        ],
      },
      {
        name: 'PanelContainer',
        brief: '多页签面板容器（每个 tab 一个具名插槽）',
        when: '右轨多面板切换的通用外壳。',
        props: [
          { name: 'panels', type: 'PanelTab[]', desc: '{ id, label, badge? } 页签定义' },
          { name: 'activeId', type: 'string', desc: '当前页签（v-model:activeId）' },
          { name: 'height', type: 'string', desc: '固定高度' },
        ],
        slots: [{ name: '[panel.id]', desc: '每个页签 id 对应一个具名插槽' }],
      },
      {
        name: 'TerminalPanel',
        brief: '交互式终端面板（ANSI 颜色解析 / 命令历史 / Ctrl+C 中断 / 退出码 / 智能滚动锁定）',
        when: '展示 TERMINAL_APPEND 事件流；interactive 时可下发命令，busy 时输入行显示 spinner。',
        props: [
          { name: 'entries', type: 'TerminalEntry[]', desc: '输出条目（out/err 支持 ANSI SGR 转义着色；cmd 可带 exitCode 非零显示失败标记）' },
          { name: 'interactive', type: 'boolean', desc: '显示命令输入行（↑/↓ 历史、Esc 退出翻阅、Ctrl+C 中断/清行、Ctrl+L 清屏）' },
          { name: 'busy', type: 'boolean', default: 'false', desc: '命令执行中：spinner + 禁止提交，Ctrl+C 触发 interrupt' },
          { name: 'autoScroll', type: 'boolean', default: 'true', desc: '贴底自动跟随；上翻自动锁定并显示"回到底部"浮标' },
          { name: 'cwd', type: 'string', desc: '当前工作目录（头部展示）' },
          { name: 'prompt / title / height / emptyText', type: 'string', desc: '外观定制' },
        ],
        events: [
          { name: 'command', payload: 'cmd: string', desc: '用户输入命令（内置 clear 命令转发为 clear 事件）' },
          { name: 'interrupt', payload: '—', desc: 'busy 时 Ctrl+C 请求中断当前命令' },
          { name: 'clear', payload: '—', desc: '清空（Ctrl+L / 清空按钮 / clear 命令）' },
        ],
      },
      {
        name: 'FilePanel',
        brief: '文件树 + 代码查看双栏',
        props: [
          { name: 'files', type: 'WorkspaceFile[]', desc: '文件列表（path + content + language）' },
          { name: 'selectedPath', type: 'string', desc: '选中文件（v-model:selectedPath）' },
          { name: 'treeWidth / height / title / emptyText', type: 'string', desc: '外观' },
        ],
        when: '展示 Agent 工作区的文件产出。',
        events: [{ name: 'select', payload: 'WorkspaceFile', desc: '选中文件' }],
      },
      {
        name: 'BrowserPanel',
        brief: '内嵌浏览器面板（iframe 或截图模式 + 地址栏）',
        props: [
          { name: 'src', type: 'string', desc: 'iframe 模式 URL' },
          { name: 'screenshot', type: 'string', desc: '截图模式图片' },
          { name: 'editable', type: 'boolean', desc: '地址栏可编辑' },
          { name: 'displayUrl / pageTitle / height / emptyText', type: 'string', desc: '外观' },
        ],
        when: 'Agent 浏览网页 / 预览产物时的可视化。',
        events: [
          { name: 'navigate', payload: 'url: string', desc: '地址跳转' },
          { name: 'refresh', payload: '—', desc: '刷新' },
        ],
      },
      {
        name: 'ArtifactPanel',
        brief: '产物收集面板（从消息流自动提取结构化载荷，可导出 Md/JSON）',
        props: [
          { name: 'messages', type: 'ChatMessage[]', desc: '从消息流自动收集' },
          { name: 'artifacts', type: 'ArtifactItem[]', desc: '或显式传入产物' },
          { name: 'collectTypes', type: 'StructuredPayloadType[]', desc: '限定收集的载荷类型' },
          { name: 'exportable', type: 'boolean', desc: '显示导出按钮' },
        ],
        when: '沉淀一次会话的代码 / 图表 / 表格产出。',
        events: [{ name: 'open', payload: 'ArtifactItem', desc: '打开产物' }],
      },
    ],
  },
  {
    id: 'generative',
    label: '生成式 UI 载荷卡',
    components: [
      {
        name: 'PayloadCard',
        brief: '22 种结构化载荷的统一分发入口',
        when: '渲染 STRUCTURED_PAYLOAD 事件。按 payload.type 自动选卡；未知类型走 registerPayloadRenderer 注册的自定义渲染。',
        props: [{ name: 'payload', type: 'StructuredPayload', desc: '{ type, data } 结构化载荷' }],
      },
      {
        name: 'CodeBlockCard / DiffCard / FileTreeCard / TerminalCard',
        brief: 'Code 域：代码高亮 / 差异对比 / 文件树 / 终端回放',
        when: '均接收 payload: StructuredPayload，type 分别为 code_block / diff / file_tree / terminal。',
        props: [{ name: 'payload', type: 'StructuredPayload', desc: '对应 type 的数据结构' }],
      },
      {
        name: 'MetricsCard / ChartCard / SqlResultCard / DataTableCard',
        brief: 'Data 域：指标 / ECharts 图表 / SQL 结果 / 数据表格',
        when: 'type 分别为 metrics / chart / sql_result / data_table。ChartCard 支持柱/线/饼等。',
        props: [{ name: 'payload', type: 'StructuredPayload', desc: '对应 type 的数据结构' }],
      },
      {
        name: 'CitationsCard / PlanCard / FormCard',
        brief: 'Chat 域：RAG 引用 / 步骤计划 / 动态表单',
        when: 'type 分别为 citations / plan / form。FormCard 内部复用 AgentFormCard。',
        props: [{ name: 'payload', type: 'StructuredPayload', desc: '对应 type 的数据结构' }],
      },
      {
        name: 'ImageCard',
        brief: '媒体域：图像展示（含提示词与说明）',
        when: 'type 为 image。',
        props: [{ name: 'payload', type: 'StructuredPayload', desc: '对应 type 的数据结构' }],
      },
      {
        name: 'AudioCard',
        brief: '媒体域：语音消息 / TTS 回复播放卡（波形进度点击跳转、倍速、转写文本折叠、下载）',
        when: "type 为 audio。data: { src, duration?, transcript?, caption?, mimeType? }（AudioPayload）。",
        props: [{ name: 'payload', type: 'StructuredPayload', desc: '对应 type 的数据结构' }],
      },
      {
        name: 'VideoCard',
        brief: '媒体域：视频回复卡（原生控件、海报帧、说明、下载）',
        when: "type 为 video。data: { src, poster?, caption?, mimeType? }（VideoPayload）。",
        props: [{ name: 'payload', type: 'StructuredPayload', desc: '对应 type 的数据结构' }],
      },
      {
        name: 'TimelineCard',
        brief: '通用域：事件时间线',
        when: 'type 为 timeline_events。',
        props: [{ name: 'payload', type: 'StructuredPayload', desc: '对应 type 的数据结构' }],
      },
      {
        name: 'ApprovalCard',
        brief: 'HITL 审批卡（批准 / 拒绝 / 附加说明）',
        props: [{ name: 'interrupt', type: 'InterruptRequest', desc: '中断请求（kind: approval/input/select）' }],
        when: '渲染 INTERRUPT 事件，响应经 store.respondInterrupt 回传。',
        events: [{ name: 'respond', payload: "Omit<InterruptResponse, 'interruptId'>", desc: '用户决定' }],
      },
    ],
  },
  {
    id: 'general',
    label: '通用 / 企业',
    components: [
      {
        name: 'SessionList',
        brief: '会话列表（搜索 / 新建 / 重命名 / 删除 / 置顶）',
        props: [
          { name: 'sessions', type: 'SessionItem[]', desc: '会话数组' },
          { name: 'activeId', type: 'string', desc: '当前会话' },
          { name: 'searchable / creatable', type: 'boolean', desc: '搜索框 / 新建按钮' },
        ],
        when: '多会话管理侧栏。',
        events: [
          { name: 'select / create / delete', payload: 'id', desc: '会话操作' },
          { name: 'rename', payload: 'id, title', desc: '重命名' },
          { name: 'pin', payload: 'id, pinned', desc: '置顶切换' },
        ],
      },
      {
        name: 'ModelSelector',
        brief: '模型选择器（32 种 provider 预设分组）',
        props: [
          { name: 'modelValue', type: 'string', desc: '模型 ID（v-model）' },
          { name: 'providers', type: 'string[]', desc: '限定可选厂商' },
          { name: 'disabled', type: 'boolean', desc: '禁用' },
        ],
        when: '让用户切换推理模型；建议放在 ChatInput 输入区附近（行业惯例），而非页头。',
        events: [{ name: 'change', payload: 'ProviderPreset', desc: '厂商预设变化' }],
      },
      {
        name: 'UsageMeter',
        brief: 'Token 用量与成本仪表',
        props: [
          { name: 'promptTokens / completionTokens', type: 'number', desc: '输入 / 输出 token' },
          { name: 'quota', type: 'number', desc: '配额（显示进度条）' },
          { name: 'promptPricePerK / completionPricePerK', type: 'number', desc: '千 token 单价（显示成本）' },
          { name: 'compact', type: 'boolean', desc: '紧凑模式' },
        ],
        when: '实时消费 USAGE 事件。',
      },
      {
        name: 'SourcePanel',
        brief: 'RAG 引用来源面板（片段列表 / 相关度 / 查看原文）',
        props: [
          { name: 'sources', type: 'SourceChunk[]', desc: '引用片段 { id, title, snippet, url?, score? }' },
          { name: 'title', type: 'string', default: "'引用来源'", desc: '面板标题' },
          { name: 'openLabel', type: 'string', default: "'查看原文'", desc: '打开原文按钮文案' },
        ],
        when: 'RAG 回答旁展示知识来源；常置于 PanelContainer 页签。',
        events: [{ name: 'open', payload: 'SourceChunk', desc: '点击查看原文' }],
      },
      {
        name: 'KnowledgeSelector / PromptLibrary',
        brief: '知识库多选器 / 提示词模板库',
        props: [
          { name: 'bases / templates', type: 'KnowledgeBase[] / PromptTemplate[]', desc: '数据源' },
          { name: 'selected', type: 'string[]', desc: '（Selector）选中项 v-model:selected' },
          { name: 'maxCount', type: 'number', desc: '（Selector）最多可选' },
        ],
        when: 'RAG 范围控制 / 快捷提示词插入。',
        events: [{ name: 'update:selected / select', payload: 'ids / template', desc: '选择变化' }],
      },
      {
        name: 'FileDropzone',
        brief: '文件拖放上传区（约束校验 / 上传进度）',
        props: [
          { name: 'files', type: 'UploadingFile[]', desc: '上传中文件（外部管理进度）' },
          { name: 'accept / maxSizeMb / maxFiles', type: '—', desc: '上传约束' },
        ],
        when: '附件上传输入。',
        events: [
          { name: 'add / remove / reject', payload: 'File[] / id / reason', desc: '文件事件' },
        ],
      },
      {
        name: 'VoiceRecorderBar',
        brief: '录音中状态条（波形跳动 / 计时 / 取消 / 停止发送），多模态语音输入的展示层',
        props: [
          { name: 'levels', type: 'number[]', desc: '实时电平 0-1（如 AnalyserNode 输出）；不传用内置动画' },
          { name: 'elapsed', type: 'number', desc: '已录秒数；不传则内部自计时' },
          { name: 'paused', type: 'boolean', desc: '暂停态（停止计时与波形）' },
        ],
        when: '点击 ChatInput 语音按钮后替换输入区展示；宿主负责 MediaRecorder 实际采集。',
        events: [
          { name: 'cancel / stop', payload: '—', desc: '取消录音 / 停止并发送' },
        ],
      },
      {
        name: 'SafetyBanner / FeedbackDialog / SettingsDialog',
        brief: '安全横幅 / 反馈弹窗 / 设置弹窗',
        props: [
          { name: 'level / policy / appealable', type: '—', desc: '（Safety）info|warning|blocked 级别与策略名' },
          { name: 'open / reasons / showComment', type: '—', desc: '（Feedback）开关与原因选项' },
          { name: 'sections / values', type: 'SettingSection[] / Record', desc: '（Settings）设置项分组与值' },
        ],
        when: '企业合规与用户反馈的标准件。',
        events: [
          { name: 'appeal / dismiss', payload: '—', desc: '（Safety）申诉 / 关闭' },
          { name: 'submit / close', payload: '{ reasons, comment }', desc: '（Feedback）提交' },
          { name: 'update:values / change / reset', payload: '—', desc: '（Settings）值变化' },
        ],
      },
      {
        name: 'ThemeToggle / CompareView',
        brief: '主题切换 / 双答案对比投票',
        props: [
          { name: 'mode', type: "'light' | 'dark' | 'system'", desc: '（ThemeToggle）v-model:mode' },
          { name: 'question / left / right / votable', type: '—', desc: '（Compare）对比数据' },
        ],
        when: '明暗切换 / A-B 答案评测。',
        events: [
          { name: 'vote', payload: "'left' | 'right' | 'tie'", desc: '（Compare）投票' },
        ],
      },
    ],
  },
  {
    id: 'protocol',
    label: '协议组件',
    components: [
      {
        name: 'ProtocolBadge',
        brief: '协议能力徽标（流式 / 工具 / HITL / 共享状态 / 流水线）',
        props: [
          { name: 'protocol', type: 'string', desc: '协议 ID（如 a2a / ag-ui / langgraph）' },
          { name: 'capabilities', type: '{ streaming?, tools?, hitl?, ... }', desc: '能力��盖（缺省查预设���' },
        ],
        when: '标注当前接入协议及其能力矩阵。',
      },
      {
        name: 'TaskStatusBadge',
        brief: 'A2A 任务状态徽标（submitted / working / completed…）',
        props: [
          { name: 'state', type: 'string', desc: '任务状态' },
          { name: 'taskId / protocol', type: 'string', desc: '任务 ID 与协议名' },
        ],
        when: 'A2A / ACP 长任务的状态展示。',
      },
      {
        name: 'AgentCardView',
        brief: 'A2A AgentCard 名片（能力 / 技能 / 端点���',
        props: [
          { name: 'card', type: 'A2AAgentCard', desc: '.well-known/agent.json 内容' },
          { name: 'status', type: "'online' | 'offline' | 'unknown'", desc: '在线状态' },
        ],
        when: '展示远端 Agent 的自描述名片。',
      },
      {
        name: 'McpServerPanel',
        brief: 'MCP 服务器面板（工具 / 资源 / 提示词三区 + 桥接按钮）',
        props: [
          { name: 'client', type: 'McpClient', desc: '已连接的 MCP 客户端（自动拉取能力）' },
          { name: 'tools / resources / prompts', type: 'McpTool[] / …', desc: '或显式传入' },
          { name: 'serverName', type: 'string', desc: '服务器名' },
        ],
        when: '把 MCP 服务器能力桥接为前端 Action。',
        events: [{ name: 'bridge', payload: '—', desc: '一键桥接全部工具' }],
      },
      {
        name: 'CommandPalette / ContextChips',
        brief: '斜杠命令面板 / 上下文芯片条（ChatInput 内部件，也可独立用）',
        props: [
          { name: 'visible / items / activeIndex', type: '—', desc: '（Palette）显示与选中' },
          { name: 'items', type: 'ContextItem[]', desc: '（Chips）附着的上下文' },
        ],
        when: '构建自定义输入区时复用。',
        events: [
          { name: 'select / hover', payload: 'PaletteItem / index', desc: '（Palette）交互' },
          { name: 'remove', payload: 'id', desc: '（Chips）移除' },
        ],
      },
    ],
  },
]

/** 统计 */
export const API_TOTAL_COMPONENTS = COMPONENT_API_GROUPS.reduce((n, g) => n + g.components.length, 0)
