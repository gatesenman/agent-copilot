<script setup lang="ts">
/**
 * 首页 — 产品介绍 + 能力矩阵 + 快速开始。
 * 设计参照 Next.js / v0 式落地页：网格装饰 Hero、命令行、双栏产品预览。
 * 全部颜色走 --ac-* 主题 token，亮暗模式自动适配。
 */
const emit = defineEmits<{ (e: 'navigate', tab: string): void }>()

const FEATURES = [
  {
    icon: 'M4 7h16M4 12h16M4 17h10',
    title: '32 种协议接入',
    desc: 'AG-UI · A2A · ACP · MCP · OpenAI · LangGraph · Dify 等主流协议开箱即用，统一事件总线归一，换协议只改一行。',
    action: { label: '协议矩阵', tab: 'gallery' },
  },
  {
    icon: 'M8 9l-4 3 4 3M16 9l4 3-4 3M13 5l-2 14',
    title: 'Agentic Coding 工作台',
    desc: '模式选择 · 计划批准 · 变更审查 · 任务追踪 · 文件 / 终端 / 浏览器面板，AgentWorkspace 组合 Shell 一行集成。',
    action: { label: '体验工作台', tab: 'solutions' },
  },
  {
    icon: 'M4 5h16v10H4zM8 20h8M12 15v5',
    title: '16 种生成式载荷',
    desc: '图表 · 表格 · 代码 Diff · 指标 · SQL 结果 · 时间线 · 引用溯源 · 表单 — 消息即应用界面。',
    action: { label: '浏览组件', tab: 'gallery' },
  },
  {
    icon: 'M9 12h6M9 8h6M9 16h3M5 4h14v16H5z',
    title: '企业级 Markdown',
    desc: 'KaTeX 公式 · Mermaid 图表 · GitHub 警告块 · 代码块文件头 · 流式渲染安全降级。',
    action: { label: '查看渲染', tab: 'gallery' },
  },
  {
    icon: 'M12 3l7 4v5c0 4-3 7.5-7 9-4-1.5-7-5-7-9V7z',
    title: 'HITL 人机协同',
    desc: '审批 / 输入 / 选择三种中断 · Agent 追问表单 · 澄清卡 · 双向交互闭环，关键操作永远有人把关。',
    action: { label: '了解交互', tab: 'docs' },
  },
]

const STATS = [
  { value: '70+', label: '开箱组件' },
  { value: '32', label: '协议适配' },
  { value: '16', label: '生成式载荷' },
  { value: '3', label: '嵌入形态' },
]

/** Hero 双栏预览：左对话 / 右代码 */
const PREVIEW_CODE = [
  { t: 'kw', s: 'import' },
  { t: 'p', s: ' { CopilotProvider, CopilotChat, AgUiRuntime } ' },
  { t: 'kw', s: 'from' },
  { t: 'str', s: " '@enterprise/agent-copilot'" },
]
</script>

<template>
  <div class="home">
    <!-- ============ Hero ============ -->
    <section class="hero">
      <div class="hero__grid" aria-hidden="true" />
      <span class="hero__tag">
        <span class="hero__tag-dot" />
        企业级 Vue 3 AI Copilot UI Kit
      </span>
      <h1 class="hero__title text-balance">为企业应用<br />装上 AI 交互层</h1>
      <p class="hero__sub text-pretty">
        从聊天窗口到 Agentic 编码工作台，从协议适配到生成式 UI —
        一套组件库覆盖企业 AI 应用的全部前端交互。
      </p>
      <div class="hero__cta">
        <button type="button" class="btn btn--primary" @click="emit('navigate', 'solutions')">
          体验解决方案
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        <button type="button" class="btn" @click="emit('navigate', 'docs')">阅读文档</button>
      </div>
      <code class="hero__install">
        <span class="hero__install-prompt">$</span> pnpm add @enterprise/agent-copilot
      </code>

      <!-- 双栏产品预览 -->
      <div class="hero__preview" aria-hidden="true">
        <div class="pv">
          <div class="pv__bar">
            <span class="pv__dot" /><span class="pv__dot" /><span class="pv__dot" />
            <span class="pv__bar-title">企业 AI 助手</span>
            <span class="pv__bar-badge">HITL 审批</span>
          </div>
          <div class="pv__body">
            <div class="pv__chat">
              <div class="pv__msg pv__msg--user">帮 WI-2024-003 创建三级审批流</div>
              <div class="pv__msg pv__msg--ai">
                <span class="pv__tool">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 7l-5 5 5 5" /></svg>
                  create_approval_flow
                </span>
                已生成「部门 → 财务 → 总监」审批流，待你确认。
              </div>
              <div class="pv__approve">
                <span>批准执行？</span>
                <span class="pv__approve-btn pv__approve-btn--ok">批准</span>
                <span class="pv__approve-btn">拒绝</span>
              </div>
            </div>
            <div class="pv__code">
              <div class="pv__code-head">app.vue</div>
              <pre class="pv__code-body"><code><span class="tk-kw">{{ PREVIEW_CODE[0].s }}</span><span>{{ PREVIEW_CODE[1].s }}</span><span class="tk-kw">{{ PREVIEW_CODE[2].s }}</span><span class="tk-str">{{ PREVIEW_CODE[3].s }}</span>

<span class="tk-kw">const</span> config = { runtime: <span class="tk-kw">new</span> <span class="tk-fn">AgUiRuntime</span>({ url: <span class="tk-str">'/api/agent'</span> }) }</code></pre>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据带 -->
      <dl class="stats">
        <div v-for="s in STATS" :key="s.label" class="stats__item">
          <dd class="stats__value">{{ s.value }}</dd>
          <dt class="stats__label">{{ s.label }}</dt>
        </div>
      </dl>
    </section>

    <!-- ============ 能力矩阵 ============ -->
    <section class="feats" aria-label="核心能力">
      <h2 class="feats__heading">覆盖企业 AI 应用的全部交互</h2>
      <div class="feats__grid">
        <article v-for="f in FEATURES" :key="f.title" class="feat">
          <span class="feat__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="f.icon" /></svg>
          </span>
          <h3 class="feat__title">{{ f.title }}</h3>
          <p class="feat__desc">{{ f.desc }}</p>
          <button type="button" class="feat__link" @click="emit('navigate', f.action.tab)">
            {{ f.action.label }}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </article>
      </div>
    </section>

    <!-- ============ 快速开始 ============ -->
    <section class="start">
      <div class="start__text">
        <h2 class="start__title">三行代码接入</h2>
        <p class="start__hint text-pretty">
          换协议只改 runtime 一行 — AG-UI、A2A、MCP、LangGraph、Dify 等 32 种适配器同接口。
        </p>
        <button type="button" class="btn btn--primary" @click="emit('navigate', 'docs')">快速开始</button>
      </div>
      <pre class="start__code"><code><span class="tk-kw">import</span> { CopilotProvider, CopilotChat, AgUiRuntime } <span class="tk-kw">from</span> <span class="tk-str">'@enterprise/agent-copilot'</span>

<span class="tk-kw">const</span> config = { runtime: <span class="tk-kw">new</span> <span class="tk-fn">AgUiRuntime</span>({ url: <span class="tk-str">'/api/agent'</span> }) }
<span class="tk-cm">// &lt;CopilotProvider :config="config"&gt;&lt;CopilotChat /&gt;&lt;/CopilotProvider&gt;</span></code></pre>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 72px;
  max-width: 1120px;
  margin: 0 auto;
  padding: 8px 24px 80px;
}

/* ============ Hero ============ */
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  padding: 64px 0 0;
  text-align: center;
}
.hero__grid {
  position: absolute;
  inset: 0 -24px auto;
  height: 560px;
  background-image:
    linear-gradient(var(--ac-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--ac-border) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.35;
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%);
  mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%);
  pointer-events: none;
}
.hero > *:not(.hero__grid) { position: relative; }
.hero__tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border: 1px solid color-mix(in srgb, var(--ac-primary) 30%, transparent);
  border-radius: 999px;
  background: var(--ac-primary-soft);
  color: var(--ac-primary);
  font-size: 13px;
  font-weight: 600;
}
.hero__tag-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--ac-primary);
  animation: pulse 2.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.hero__title {
  margin: 0;
  font-size: clamp(36px, 5.6vw, 60px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.025em;
  color: var(--ac-fg);
}
.hero__sub {
  margin: 0;
  max-width: 620px;
  font-size: 17px;
  line-height: 1.7;
  color: var(--ac-muted);
}
.hero__cta { display: flex; gap: 12px; margin-top: 6px; }
.hero__install {
  padding: 8px 18px;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-surface);
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 12.5px;
  color: var(--ac-muted);
}
.hero__install-prompt { color: var(--ac-primary); font-weight: 700; }

/* ---- 按钮 ---- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 24px;
  border: 1px solid var(--ac-border);
  border-radius: 10px;
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
}
.btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }
.btn--primary {
  border-color: transparent;
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
}
.btn--primary:hover { box-shadow: 0 6px 20px color-mix(in srgb, var(--ac-primary) 35%, transparent); }

/* ---- 双栏产品预览 ---- */
.hero__preview { width: 100%; max-width: 880px; margin-top: 28px; }
.pv {
  border: 1px solid var(--ac-border);
  border-radius: 16px;
  background: var(--ac-bg);
  box-shadow: 0 24px 60px -24px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  text-align: left;
}
.pv__bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--ac-border);
  background: var(--ac-surface);
}
.pv__dot { width: 10px; height: 10px; border-radius: 999px; background: var(--ac-border); }
.pv__bar-title { margin-left: 8px; font-size: 12.5px; font-weight: 600; color: var(--ac-fg); }
.pv__bar-badge {
  margin-left: auto;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--ac-primary-soft);
  color: var(--ac-primary);
  font-size: 11px;
  font-weight: 600;
}
.pv__body { display: grid; grid-template-columns: 1fr 1fr; }
@media (max-width: 720px) {
  .pv__body { grid-template-columns: 1fr; }
  .pv__code { border-top: 1px solid var(--ac-border); }
}
.pv__chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
}
.pv__msg {
  max-width: 88%;
  padding: 9px 14px;
  border-radius: 12px;
  font-size: 12.5px;
  line-height: 1.6;
}
.pv__msg--user {
  align-self: flex-end;
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
  border-bottom-right-radius: 4px;
}
.pv__msg--ai {
  align-self: flex-start;
  background: var(--ac-surface);
  color: var(--ac-fg);
  border: 1px solid var(--ac-border);
  border-bottom-left-radius: 4px;
}
.pv__tool {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 11px;
  color: var(--ac-primary);
  font-weight: 600;
}
.pv__approve {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 8px 12px;
  border: 1px dashed color-mix(in srgb, var(--ac-primary) 45%, transparent);
  border-radius: 10px;
  font-size: 12px;
  color: var(--ac-muted);
}
.pv__approve-btn {
  padding: 3px 12px;
  border-radius: 7px;
  border: 1px solid var(--ac-border);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ac-fg);
}
.pv__approve-btn--ok {
  border-color: transparent;
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
}
.pv__code {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--ac-border);
  background: var(--ac-surface);
}
.pv__code-head {
  padding: 9px 16px;
  border-bottom: 1px solid var(--ac-border);
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 11px;
  color: var(--ac-muted);
}
.pv__code-body {
  flex: 1;
  margin: 0;
  padding: 16px;
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--ac-fg);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 代码 token 高亮（走品牌色系） */
.tk-kw { color: var(--ac-primary); font-weight: 600; }
.tk-str { color: var(--ac-warn); }
.tk-fn { color: var(--ac-fg); font-weight: 700; }
.tk-cm { color: var(--ac-muted); }

/* ---- 数据带 ---- */
.stats {
  display: flex;
  gap: 0;
  margin: 40px 0 0;
  padding: 0;
  border: 1px solid var(--ac-border);
  border-radius: 14px;
  background: var(--ac-surface);
  overflow: hidden;
}
.stats__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 20px 12px;
  text-align: center;
}
.stats__item + .stats__item { border-left: 1px solid var(--ac-border); }
.stats__value {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ac-primary);
}
.stats__label { font-size: 12.5px; color: var(--ac-muted); }
@media (max-width: 640px) {
  .stats { flex-wrap: wrap; }
  .stats__item { flex-basis: 50%; }
  .stats__item:nth-child(3) { border-left: none; border-top: 1px solid var(--ac-border); }
  .stats__item:nth-child(4) { border-top: 1px solid var(--ac-border); }
}

/* ============ 能力矩阵 ============ */
.feats { display: flex; flex-direction: column; gap: 28px; }
.feats__heading {
  margin: 0;
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 800;
  letter-spacing: -0.02em;
  text-align: center;
  color: var(--ac-fg);
}
.feats__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}
.feat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 26px;
  border: 1px solid var(--ac-border);
  border-radius: 16px;
  background: var(--ac-bg);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.feat:hover {
  border-color: color-mix(in srgb, var(--ac-primary) 40%, transparent);
  box-shadow: 0 12px 32px -12px color-mix(in srgb, var(--ac-primary) 22%, transparent);
  transform: translateY(-2px);
}
.feat__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: var(--ac-primary-soft);
  color: var(--ac-primary);
}
.feat__title { margin: 0; font-size: 16.5px; font-weight: 700; color: var(--ac-fg); }
.feat__desc { margin: 0; flex: 1; font-size: 13.5px; line-height: 1.7; color: var(--ac-muted); }
.feat__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: var(--ac-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: gap 0.15s;
}
.feat__link:hover { gap: 10px; }

/* ============ 快速开始 ============ */
.start {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 32px;
  align-items: center;
  padding: 40px;
  border: 1px solid var(--ac-border);
  border-radius: 20px;
  background: var(--ac-surface);
}
@media (max-width: 820px) { .start { grid-template-columns: 1fr; } }
.start__text { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
.start__title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ac-fg);
}
.start__hint { margin: 0; font-size: 13.5px; line-height: 1.7; color: var(--ac-muted); }
.start__code {
  margin: 0;
  padding: 24px;
  border: 1px solid var(--ac-border);
  border-radius: 14px;
  background: var(--ac-bg);
  overflow-x: auto;
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ac-fg);
}
.start__code code { white-space: pre; }
</style>
