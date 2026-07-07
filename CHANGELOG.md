# Changelog

本组件库遵循语义化版本。日期为构建日期。

## [0.16.0] - 2026-07-06

### 五项体验升级

1. **乱码修复**：全库清理 24 处 UTF-8 损坏字符（`\uFFFD`），覆盖组件注释、
   演示数据、API 文档、运行时提示文案
2. **ModelSelector 两级级联**：重构为"左侧分组导航（模型协议 24 / Agent 框架 8 /
   互操作协议 3）+ 右侧条目面板"，菜单高度收窄至 300px，不再一列到底
3. **Code 展示区真实化**：四张卡改为连贯工程叙事——带指数退避/超时/HttpError 的
   请求客户端（高亮行）→ 业务侧迁移三段 hunk Diff → 涉及文件树（3 新增/2 修改/1 删除）
   → 质量门禁终端（typecheck + 12 用例 + 构建）
4. **CopilotTextarea 重写**：幽灵补全支持 Tab 全部接受 / Ctrl+→ 逐词接受 / Esc 忽略；
   选中文本唤起 AI 工具条（润色/精简/扩写/译英/自定义指令，Ctrl+K）；AI 写入一键撤销；
   字数上限 + 计数器；快捷键提示栏；演示站接入 mock provider 免 Key 体验
5. **MarkdownText 扩展**：代码块接入零依赖语法高亮（tok-* 明暗双主题）+ 行号联动；
   `==文本==` 高亮标记；标题自动锚点 + hover # 链接；外链自动 target/rel + 图标；
   图片懒加载 + title 图注；所有行内变换均避开代码区防污染

## [0.15.1] - 2026-07-06

### PlanReviewCard 视觉对齐参考稿

- 卡片改为柔和灰底一体式（surface 底 + 弱化边框 + 更大圆角），
  头部去掉重底色分条，"计划"标签弱化为 muted 小字
- 渐隐遮罩、编辑 textarea 底色随卡片灰底融合；操作区去分隔线、按钮透明底

## [0.15.0] - 2026-07-06

### TerminalPanel 升级为真实终端能力（非破坏性）

此前终端面板只有样式外壳（静态条目 + 简单输入行），本版补齐交互能力：

- ANSI SGR 解析：out/err 文本中的 `\x1b[..m` 颜色 / 粗体 / 暗淡序列解析为着色
  span（16 色 GitHub Dark 调色板），复制时自动剥离转义序列
- 命令历史：↑/↓ 翻阅本会话命令（相邻去重），Esc 退出翻阅恢复输入草稿
- 快捷键：Ctrl+C（busy 时发 `interrupt` 事件请求中断；空闲时清行）、Ctrl+L 清屏
- 智能滚动：贴底自动跟随输出；用户上翻自动锁定，显示"回到底部"浮标
- 退出码：`TerminalEntry.exitCode` 非零时命令行尾显示"✕ code"失败标记
- busy 态：输入行 spinner + 提交禁用；`cwd` 头部展示当前目录；内置 `clear` 命令
- 复制全部输出按钮；演示站接入交互式模拟 shell（ls / git / pnpm build / echo /
  help，未知命令退出码 127，Ctrl+C 中断为 130）

## [0.14.0] - 2026-07-06

### 新增 PlanReviewCard — Markdown 长文计划审查卡

对照类 Claude Code / Cursor 的 Plan Review 形态，补齐整篇 Markdown 计划的审查闭环
（此前 PlanPanel 仅覆盖结构化步骤列表，缺长文形态）：

- 折叠预览：超过 `collapsedHeight`（默认 300px）时截断，底部渐隐遮罩 +
  居中"展开计划"药丸按钮；头部提供展开 / 收起切换
- 手动编辑：draft 态可切换 textarea 编辑原始 Markdown，保存 emit
  `update:content`（支持 v-model:content），修改后显示"已修改"徽章
- 审查闭环：确认计划 / 驳回操作区，`approve` 事件携带（可能已被手动修改的）最终文本；
  approved / rejected 态显示结果徽章
- 演示站同步：Agentic 展示区新增演示、API 速查与协议清单登记

## [0.13.0] - 2026-07-06

### 对照类 VS Code Agentic 编码应用补齐（非破坏性）

对照类 Zread / VS Code Agent 应用截图的能力面差距分析，补齐 3 项标准 Agentic 元素：

- 新增 `WorkSummary` 工作耗时摘要行：运行中实时走秒（"正在工作 X 分 X 秒"），
  结束后定格总耗时，对应 Cursor / VS Code Agent 的 "Worked for Xs" 分隔行
- `ChatInput` 新增 `toolbar-start` / `toolbar-end` 具名插槽，
  宿主可将 ModelSelector、推理力度等控件内嵌 composer（`CopilotChat` 已透传）
- `ChangeReviewPanel` 新增 `collapsible` / `defaultExpanded` props：
  折叠为"N 个文件已更改 +x -y [撤销]"汇总条，点击展开文件列表（默认关闭，无破坏性）
- 演示站同步：组合演示面 ModelSelector 改为经 toolbar-end 插槽内嵌输入框；
  Agentic 展示区新增 WorkSummary 与折叠审查条演示；API 速查、协议清单更新

## [0.12.0] - 2026-07-06

### 对照 VS Code Copilot Agent 收敛与标准化（Breaking）

对照 VS Code Copilot Agent 模式的标准 UI 能力面（工具确认、任务/计划跟踪、编辑审查、终端、检查点），
删除其不具备的本体语义域组件，并统一工具调用渲染：

- 删除本体/图谱域全部组件：`OntologyGraph`、`EntityCard`、`EntityInspector`、
  `OntologySchemaView`、`LineageGraph`、`EntityHighlight` 及 `colorForType`
- 删除对应载荷卡：`OntologyGraphCard`、`EntityPayloadCard`、`EntityListCard`、`LineageCard`，
  `StructuredPayloadType` 移除 `ontology_graph` / `entity` / `entity_list` / `lineage`（20 → 16 种）
- 删除向后兼容别名 `ToolCallCard`，工具调用渲染统一为 `ToolActionCard`
- 移除 `cytoscape` / `cytoscape-dagre` 依赖
- 类型清理：移除 `OntologyEntity` / `OntologyRelation` / `OntologyTypeDef` / `LineagePayload` 等，
  以及上一轮遗留的 `PalettePayload` / `DesignSpecPayload` / `GeoPointsPayload` 孤儿类型
- 演示站与文档同步：删除一体化页面（AllInOneView）、本体图谱展示区、
  「本体与图谱」文档章节；行业方案实体列表改用标准 `table` 载荷；
  首页统计、API 速查、AI 文档（llms.txt）、协议清单全部更新

## [0.11.0] - 2026-07-06

### 对照竞品收敛组件面（Breaking）

对照 AI Elements / CopilotKit / assistant-ui 等竞品的标准组件集，删除竞品均无的非常规组件：

- 删除设计域载荷卡：`PaletteCard`（色板）、`DesignSpecCard`（设计规范），
  `StructuredPayloadType` 移除 `palette` / `design_spec`（22 → 20 种）
- 删除多 Agent 管线系组件：`AgentInspector`（运行检查器）、`PipelineTimeline`（流水线时间轴）、
  `AgentAvatarGroup`（协作头像组）
- `CopilotConfig` 移除 `showPipeline` / `showReActTrace` / `showGovernance` / `inspector`（InspectorConfig 类型一并删除）；
  `CopilotChat` / `CopilotSidebar` / `CopilotPopup` 移除 `pipeline` prop
- 协议事件层不变：`STAGE_*` / `REACT_STEP` / `GOVERNANCE_EVENT` 等事件仍在运行时协议中，
  仅移除了消费它们的内置 UI，宿主可自行订阅渲染
- 演示站同步收敛：全能助手改为知识/代码/数据三域；演练场移除对应配置项；
  API 速查、AI 文档（llms.txt）、协议清单同步更新

## [0.10.1] - 2026-07-06

### 解决方案页重构为通用 Agent 形态

- 「解决方案」不再按行业业务举例，改为对齐业界主流 Agent 产品形态分类：
  - 对话形态：对话助手（ChatGPT 式多轮对话）/ RAG 检索问答（先检索后生成 + 引用溯源）
  - 执行形态：Deep Research（计划 → 多轮检索 → 汇总报告）/ 工具编排（ReAct 循环多工具串联）
  - 工作台形态：Coding Agent / 数据分析 / HITL 人机协同 / 自主执行 Shell（复用既有视图）
- 新增 `agent-form-demos.ts`：四种形态的真实模型驱动演示（配置 + 工具 + 工作台装配数据），
  左栏改为「形态解剖」——形态要素卡 + 执行循环时间线，演示形态本身而非业务
- 行业演示数据（industry-demos 等）保留，仍供演练场使用
- 欢迎屏 `welcomeScreen.icon` 升级支持 SVG path data（以 `M` 开头自动识别），
  渲染为主题色圆角图标容器；文本/emoji 传值保持兼容。四种形态演示已全部换用 SVG 图标
- 修复工具编排演示 `render_chart` 载荷字��（`series[].data` → `series[].values`），
  两工具串联（查询 → 图表）端到端跑通；期间错误边界按预期兜底降级，反向验证了 0.9.0 降级机制

## [0.10.0] - 2026-07-06

### 一体化聚合大组件 AgentCopilot（推荐入口）

- 新增 `<AgentCopilot>` 一体化大组件：一个标签内置根 Provider + 顶栏 + 多会话边栏 +
  对话流 / 工作台 + 内置设置弹窗，零拼装开箱即用：
  `<AgentCopilot :config="{ runtime: 'browser', model: '...' }" />`
- 顶栏集成：标题/副标题、ModelSelector（28 种协议预设切换，emit `provider-change`）、
  UsageMeter（token 用量 + 配额进度）、ThemeToggle（三态主题）、设置按钮、边栏折叠
- 多会话管理内置：新建 / 切换 / 重命名 / 删除 / 置顶 / 搜索，切换基于消息快照，
  标题与摘要自动跟随首条用户消息与最新回复，emit `session-change` 供宿主持久化
- 内置设置弹窗：主题（亮/暗/系统）、温度、系统提示，改动即时生效并 emit `settings-change`
- `panels` prop 一键升级为完整工作台形态（变更/计划/任务/文件/终端/浏览器）
- 所有区块可用 `show*` 开关裁剪；细粒度拼装场景仍可使用 CopilotProvider + 独立组件（渐进式 API）
- 演示站新增「一体化」页签展示单标签接入形态

## [0.9.0] - 2026-07-06

### 企业级质量加固（无障碍 / 性能虚拟化 / 错误降级）

- 新增 `useFocusTrap` 焦点管理组合式（可导出复用）：Tab 焦点圈定、Escape 关闭、
  打开自动聚焦（支持 `[data-autofocus]` 标记）、关闭后焦点还原到触发元素；
  已统一接入 CopilotPopup / FeedbackDialog / SettingsDialog 三个弹层
- 新增 `ErrorBoundary` 渲染错误边界组件（可导出复用）：捕获子树渲染异常并降级，
  提供重试按钮、可展开技术细节、`@error` 事件对接监控上报；
  PayloadCard 分发器已内置 —— 任一结构化载荷渲染崩溃时降级为原始 JSON，不再拖垮消息流
- CopilotChat 长会话性能虚拟化：新增 `virtualizeThreshold` prop（默认 60），
  仅完整渲染最近 N 条���息，更早消息折叠为「显示更早的 X 条���按钮按批展开（展开保持视口不跳动）；
  视口外消息应用 `content-visibility: auto` 跳过布局与绘制
- 消息流无障碍加固：消息容器升级为 `role="log"` + `aria-busy`（生成中）+ 条数标签；
  MessageBubble 升级为 `<article>` 语义元素并附角色标签，读屏用户可逐条导航

## [0.8.0] - 2026-07-03

### AG-UI 组件元信息标准化（机器可读清单）

- 新增 `agui-manifest.ts`：把人读速查（component-api.ts）规范化为逐组件独立记录 ——
  拆分合并组件名（'CopilotSidebar / CopilotPopup' → 2 条）与合并 props 名
  （'title / subtitle' → 2 条），每条含精确源码路径、分类（11 域）、角色
  （container/display/input/control/interaction）、消费的 AG-UI 协议事件、
  STRUCTURED_PAYLOAD 载荷类型��射、组合建议与弃用标记
- 自校验 `validateAguiManifest()`：检出缺失增广 / 未拆分合并名 / 未知组合引用，
  上线即抓出 2 个真实缺口（EntityPayloadCard、SourcePanel 漏登记 API 速查，已补）
- AI 文档页新增「AG-UI 组件元信息清单」区块：74 组件 / 26 协议事件 / 22 载荷类型，
  一键复制 JSON 或下载 agui-manifest.json，附实时自校验状态

## [0.7.0] - 2026-07-03

### 解决方案升级为组合式工作台

- 新增 `SolutionWorkbench` 组合容器：9 个行业方案从「裸聊天框」升级为三栏工作台，
  充分展示库组件组合能力 —— 左栏 SafetyBanner（合规横幅）+ PayloadCard 业务上下文栈
  （指标 / 表格 / 实体列表 / 时间线 / 图表），中栏 CopilotChat 真实模型对话，
  右栏 PanelContainer 页签装配 TaskTracker（场景任务）/ SourcePanel（知识来源）/
  SessionList（历史会话）/ UsageMeter（用量计）
- 各方案按行业差异化装配（solution-workbench-data.ts）：法务 / 医疗 / 金融带合规横幅，
  RAG / 法务 / 医疗带引用来源，客服 / 电商 / 供应链带实时业务看板
- 布局响应式：窄屏依次收起右栏、切换纵向堆叠

## [0.6.1] - 2026-07-03

### 启动脚本跨平台加固

- 重写 `start.bat`：纯 ASCII 输出（避免 GBK 代码页解析 UTF-8 中文导致闪退）、
  Node 版本解析加空值守卫、`goto` 扁平结构替代括号块内 `%ERRORLEVEL%`（解析期展开陷阱）、
  失败统一落到 pause 不闪退
- 新增 macOS/Linux 启动脚本：`start.sh`（Node 18+ / pnpm / 依赖 / 端口四步检查，彩色输出）
  与可双击的 `start.command` 入口
- 修复 pnpm 10/11 安装失败（`ERR_PNPM_IGNORED_BUILDS`）：esbuild 构建脚本经
  `pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 显式放行（pnpm ≥10.9 读取此位置，
  `package.json` 内旧字段保留兼容 ≤10.8）
- README 快速开始同步一键启动说明；导航描述更新为六区（含 AI 文档页）

## [0.6.0] - 2026-07-03

### 新增「AI 文档」页（llms.txt）

- 顶部导航新增 AI 文档页：将接入方式、组合式 API、事件流协议与 48 个组件 API
  汇编成��份 llms.txt 风格 Markdown（约 650 行 / 6.3k tokens），一键复制或下载，
  供 AI 编码助手（Cursor / Copilot / v0 等）正确理解并使用本库
- 数据源与「全组件 API 速查」同一（component-api.ts），随组件演进自动更新

### 行业对标审计：移除不专业组件（Breaking）

- 移除 `VoiceWaveform`：纯装饰假波形（随机数动画，未接麦克风），行业标准做法是
  composer 内置语音按钮 + 真实 Web Speech API —— `ChatInput` 的 `showVoiceButton`
  + `onVoiceInput` 已覆盖该能力，保留
- 移除 `GeoPointsCard` 与 `geo_points` 载荷类型：手绘 SVG 假地图投影不准确，
  违背「地理可视化必须用专业地图库」的行业共识；需要地图时应由宿主接 Leaflet/Mapbox
  并经 `registerPayloadRenderer` 注册自定义载荷渲染器
- 计数同步：组件 50 → 48，载荷类型 23 → 22（API 速查 / 首页 / AI 文档均已更新）

## [0.5.1] - 2026-07-03

### 组件能力边界审计与合并

- 合并重复组件：`ToolCallCard` 与 `ToolActionCard` 均渲染单次工具调用（状态/参数/结果/错误），
  后者是前者的严格超集（语义化种类图标 + 主参数摘要 + 耗时）。`ToolCallCard` 降级为向后兼容别名
  （内部直接渲染 ToolActionCard），`MessageBubble` 消息流改用 `ToolActionCard`，API 速查同步标注
- 审计结论（无空壳）：generative-ui 中的小体积卡（EntityPayloadCard/LineageCard/OntologyGraphCard/FormCard）
  是载荷分发适配器（payload → 领域组件），职责单一属合理分层，不算空壳；
  Timeline 三件套边界清晰：TimelineCard（业务事件时间线载荷）/ PipelineTimeline（流水线阶段状态）/
  AgentStepList（Agent 执行步骤日志），互不重叠

### 后端真实性审计（逐工具单测验证）

- 11 个服务端工具逐个真实执行验证：write_file 真实写盘、read_file 真实读回、list_files 真实列目录、
  run_command 真实 spawn 子进程（stdout 实时转 TERMINAL_APPEND 事件）、delete_file 真实删除
- 安全边界验证通过：命令白名单拦截（curl 被拒）、路径逃逸拦截（../../../etc/passwd 被拒）
- HITL /resume 端点验证：过期 interruptId 正确返回 RUN_ERROR；表单经 formReview 回路回传 LLM 审查
- 唯一非真实路径：LLM 调用需 `AI_GATEWAY_API_KEY`（缺失时显式报错，不降级为假回复）

## [0.5.0] - 2026-07-03

### 真实 Node Agent 后端（端到端，无模拟逻辑）

- 新增 `server/agent-backend.mjs`：以 Vite 中间件形式内置的真实后端（`/api/agent/*`），与 `HttpAgentRuntime` / agentscope 协议完全对齐
  - 真实 LLM：通过 Vercel AI Gateway（`AI_GATEWAY_API_KEY`）流式补全 + 工具调用 + reasoning（深度思考转 `THINKING_*` 事件流）
  - 真实文件工具：`.agent-workspace/` 沙箱内真实读写文件（`FILE_CHANGE` 事件驱动变更审查面板）
  - 真实终端工具：真实执行 shell 命令（白名单 + 沙箱 cwd，`TERMINAL_APPEND` 事件流）
  - 任务/计划/表单/审批：`TASK_UPDATE` / `PLAN_UPDATE` / `FORM_REQUEST` / `INTERRUPT` 全事件闭环，HITL 审批按 `metadata.agentMode` 策略拦截
  - 会话与用量：内存会话存储、`USAGE` 事件、`/health` 健康检查
- 演��场「接入协议」默认切到真实后端（`/api/agent`）；agentscope 适配器补传 `metadata`（agentMode / thinking）
- 修复 `RUN_ERROR` 在无流式消息时不���见：错误始终以气泡呈现（含重试与配置指引）

### 新组件：AgentStepList 与 CheckpointCard（对照 v0 执行日志 UI 补齐）

- `AgentStepList` 执行步骤时间流：思考 / 检索 / 终端 / 文件 / 工具动作按时间线排成可折叠日志，
  支持 running 旋转指示、error 态、note 注释、detail 插槽自定义详情
- `CheckpointCard` 版本快照卡：版本标签 + 聚合 +/- 差异统计徽标 + 逐文件路径与增删行数 + 一键回滚
  （`revert` / `select-file` 事件），与 ChangeReviewPanel 审查面板互补
- 两者均已导出、注册 API 速查（48 → 50 组件）并加入 Agentic 组件页演示

### 组件页新增「全组件 API 速查」

- 新增 `component-api.ts`（48 个组件的 Props / 事件 / 插槽 / 选型指导，从库源码 defineProps/defineEmits 提取）
  与 `ApiReference.vue` 速查面板：关键字搜索（组件名/属性/说明全命中）、按 8 个域分组折叠、搜索时自动展开
- 组件页锚点导航新增「全组件 API 速查」分区

### 演练场全功能覆盖（工作台形态 + 全量配置一览）

- 预览形态可切换：`workbench`（默认，复用全能助手三栏超级复合面）/ `chat`（标准对话面板）
- 新配置组「预览形态与工作台」：顶栏（头像组/模型/主题/用量）、安全横幅、左轨三面板、语音、模���选择器、右轨七面板、组件名标注、组装代码入口，共 21 个开关逐一可控
- `OmniComposedSurface` 新增 `features` 属性（默认全开，向后兼容），全部组件域可细粒度显隐；轨道 grid 布局改用「用户开关 && 功能开关 && 有可见页签」的有效可见性，修复隐藏轨道后残留空列
- 演示场景从 4 个扩展为 7 个：新增行业 · 智能客服与工单 / 电商智能导购 / 金融��研助手（复用解决方案页配置）
- 左侧全部配置组默认展开，所有配置项一览无余

### 解决方案页按行业标准重构（5 大类 8 场景）

- `SolutionsView` 重构为「左分类导航 + 右场景内容」布局，按业界 Agent 落地版图分类：
  - **客户经营**：智能客服与工单（新增）/ 电商智能导购（新增）
  - **知识与办公**：企业知识库问答 RAG（复用 chatAgent 配置）/ 办公审批协作（既有）
  - **研发与数据**：Coding Agent 工作台（既有）/ 数据分析与 BI（既有）
  - **金融行业**：金融投研助手（新增）
  - **平台底座**：Agentic 工作台示意（既有）
- 新增 `src/demo/solutions/industry-demos.ts`：三个行业场景的真实模型驱动演示配置——
  客服（search_faq 引用卡 / create_ticket 工单卡 / show_ticket_progress 进度步骤卡）、
  电商（recommend_products 商品表 / compare_products 对比卡 / create_order 订单卡）、
  金融（show_fundamentals 指标卡 / show_trend 折线图 / draft_report 纪要文档，附免责声明）

### 全能助手升级为「超级复合」演示（全组件域覆盖）

- `OmniComposedSurface` 重写为三栏工作台，一个演示面覆盖库中全部组件域（30+ 组件），全部经 `useCopilot()` 共享同一会话状态：
  - 顶栏：AgentAvatarGroup / ModelSelector / ThemeToggle / UsageMeter / SettingsDialog / FeedbackDialog + 左右栏开关
  - 安全：SafetyBanner（可关闭）
  - 左轨：PanelContainer（SessionList 会话 / PromptLibrary 提示词 / KnowledgeSelector + FileDropzone 知识库）
  - 中栏：MessageBubble（含 ThinkingBlock）/ PipelineTimeline / ApprovalCard / ChatSuggestions / VoiceWaveform / ModeSelector / ChatInput（斜杠命令、@提及、附件、语音、思考开关、ContextChips）
  - 右轨：PanelContainer 七页签 —— AgentInspector / TaskTracker + PlanPanel / ChangeReviewPanel / TerminalPanel / ArtifactPanel / SourcePanel / 协议组件（ProtocolBadge + TaskStatusBadge + AgentCardView）
  - 右轨数据 store 实时优先、空时演示样本兜底；「查看组装代码」示例同步重写为超级复合版本

### 新组件：ArtifactPanel 会话产物归集

- `ArtifactPanel`（components/workspace/）：自动从 `ChatMessage[]` 收集代码 / 表格 / 图表 / 图片等产出型载荷，按时间排序展示，支持点击内联预览（复用 `PayloadCard`）、单个产物下载、整段会话导出
- 新工具模块 `utils/session-export`：`exportSession()` / `sessionToMarkdown()` / `sessionToJson()` / `downloadText()`，会话一键导出为 Markdown（含代码块 / 表格 / 图表数据序列化）或结构化 JSON
- 演示站「组件 → Agentic 工作台组件」新增 ArtifactPanel 演示段

### Java 参考后端协议对齐（0.3/0.4 前端能力落地）

- `RunRequest` 新增 `metadata` 字段，前端 `HttpAgentRuntime` 同步透传 `RunInput.metadata`（此前仅 BrowserAgentRuntime 生效）
- 深度思考：`metadata.thinking: true` 时 LLM 请求携带 `enable_thinking`，`reasoning_content` 增量转为 `THINKING_START/DELTA/END` 事件流（DeepSeek-R1 / Qwen3 混合推理模型）
- Agent 权限模式：`GovernanceHook.requiresApproval` 支持 `metadata.agentMode` —— `plan` 一律拦截审批、`auto_edit`/`full_access` 跳过写操作审批、`confirm_edits`（默认）保持原策略
- `java-backend/README.md` 事件协议表重写：修正过时的小写事件名，补全 THINKING_* / FILE_CHANGE / TASK_UPDATE / PLAN_UPDATE / TERMINAL_APPEND / FORM_REQUEST 与 metadata 契约文档

### 修复

- 演示站「组件用法文档」示例代码中裸 `<script>` 标签导致 Vite 依赖扫描误报 agent-copilot 包引用

## [0.4.0] - 2026-07-02

### AgentFormCard 全控件集 + AI 检查闭环

- `FormFieldSpec.type` 从 7 种扩展到 16 种：新增 `email`/`tel`/`url`/`time`/`slider`/`rating`/`switch`/`tags`/`multiselect`
- 字段级校验规则：`min`/`max`/`step`/`minLength`/`maxLength`/`pattern`/`patternMessage`/`maxRating`/`unit`，email/url/tel 内置格式校验，错误内联展示
- AI 检查闭环：`FormPayload.aiReview`（issues/passed 横幅）+ 字段级 `aiIssue` 警示；`config.agentic.formReview`（默认开）——表单提交后自动把值回传给 Agent 审查
- store 新增 `injectPayload()`（结构化载荷注入为助手消息，演示/调试通道��，`CopilotProvider` 监听 `agent-copilot:inject-payload` window 事件

### 配置演练场全量化

- 配置项从 17 个扩展到 40+，按 10 个折叠分组：外观 / 欢迎屏 / 模型与行为 / 输入���验 / 消息与操作 / 工具与审批 / Agentic / 可观测性 / 持久化与限流 / 演示场景
- 新覆盖：`temperature`、`maxTokens`、`maxIterations`、`maxRetries`、`welcomeScreen`、`attachments`、`draftPersistence`、`inputMaxLength`、`messageActions.edit`、`typewriterSpeed`、`autoScroll`、`toolDisplay`、`approvalMode`、`agentic.*`、`showReActTrace`、`showGovernance`、`persistence`、`rateLimit`
- 「生成的配置代码」同步输出全部配置项；新增「AI 表单演示」一键注入 13 字段采购申请单（用户填写 → 提交 → AI 逐字段检查）

### 修复

- 演练场预览区聊天组件未撑满（`.ac-root` 中间层缺弹性布局）
- 暗色主题级联：移除 `theme: 'light'` 硬编码默认，未显式配置时跟随全局 `data-ac-theme` / 系统偏好
- 演示站硬编码颜���全部替换为 `--ac-*` 设计令牌（暗色模式整站生效）

## [0.3.0] - 2026-07-02

### Agentic Coding 交互体系（对标 Palantir AIP / Cursor / Claude Code）

- 新增 8 个 `AgentEventType`：`THINKING_START/DELTA/END`、`FILE_CHANGE`、`TASK_UPDATE`、`PLAN_UPDATE`、`TERMINAL_APPEND`、`FORM_REQUEST`
- 新增 Agentic 域类型：`AgentMode`（四种权限模式）、`FileChange`、`AgentTask`、`PlanSpec`、`WorkspaceFile`、`TerminalEntry`、`FormPayload`、`ToolActionKind`
- store 扩展：`agentMode`、`thinkingEnabled`、`fileChanges`、`tasks`、`plan`、`terminal` 及 `setAgentMode`、`reviewFileChange`、`decidePlan`、`submitForm`
- 新组件（components/agentic/）：`ModeSelector`、`ThinkingBlock`、`TaskTracker`、`PlanPanel`（可编辑审批）、`ChangeReviewPanel`（diff 审查）、`ToolActionCard`（7 种特化）、`AgentFormCard`、`ClarifyCard`
- 右侧面板体系（components/workspace/）：`FilePanel`、`TerminalPanel`、`BrowserPanel`、`PanelContainer`、`AgentWorkspace` 组合 Shell
- `RunInput.metadata` 透传 `agentMode` 与 `thinking` 给后端
- 载荷类型新增 `form`（Agent↔人双向表单，22 → 23 种）

### Chat 增强

- `ChatInput` 新增附件上传、语音输入、深度思考开关（均属性控制）
- `MessageBubble` 集成 `ThinkingBlock`
- 新组件：`SettingsDialog`（schema 驱动设置弹框）、`KnowledgeSelector`（知识库多选）、`EntityHighlight`（实体高亮悬浮卡）
- 新组合式：`useTheme`（亮/暗/跟随系统 + 品牌色 + 圆角 + 密度，localStorage 持久化）
- `CopilotConfig` 新增 `agentic`、`onFileChangeReview`、`onPlanDecision`、`onFormSubmit`、`onVoiceInput`、`runtimeInstance`

### 属性抽象

- 全组件硬编码文案提取为 `labels` 属性（CompareView、FeedbackDialog、FileDropzone、SourcePanel、KnowledgeSelector、PromptLibrary、TerminalPanel、OntologyGraph、LineageGraph、OntologySchemaView、McpServerPanel）
- `colorForType` 共享类型颜色索引，跨组件一致
- 主题变量 `--ac-warning` 别名修复

### 演示站

- 五区重组：首页（产品介绍）/ 组件 / 解决方案（采购工作台 + Coding Agent 工作台）/ 演练场 / 帮助中心
- 新增 Coding Agent 工作台演示：脚本化运行时全流程演示（思考 → 计划 → 任务 → 读改文件 → 终端 → 变更审查）
- 文档示例化：`DocDemo` 容器（实时预览 + 属性编辑器 + 代码生成），12 个内嵌演示块，`[demo:name]` 标记插入 markdown

## [0.2.0] - 2026-07-01

- 协议 28 → 32：A2A、ACP、OpenAI Assistants、McpClient
- 输入增强：/ 命令、@ 提及、# 引用、消息队列、编辑重发分支
- 本体/图谱组件（cytoscape 按需加载）+ 6 种新载荷
- Markdown 企业级渲染：KaTeX、Mermaid、警告块、任务列表、diff 着色
- 10 个企业组件 + 配置演练场页签

## [0.1.0] - 2026-06-30

- 初始版本：CopilotProvider/Chat/Sidebar/Popup、AG-UI 事件协议、HITL 中断、流水线可视化���生成式 UI 16 种载荷、Java 后端参考实现
