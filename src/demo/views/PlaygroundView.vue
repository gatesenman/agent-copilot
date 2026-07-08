<template>
  <div class="pg">
    <!-- 左侧：配置表单 -->
    <aside class="pg__form" aria-label="组件配置">
      <div>
        <h2 class="pg__form-title">配置演练场</h2>
        <p class="pg__form-sub">在线修改配置项，右侧实时预览效果</p>
      </div>

      <!-- 分组折叠面板：全量配置项 -->
      <details v-for="g in GROUPS" :key="g.id" class="pg__acc" :open="g.defaultOpen">
        <summary class="pg__acc-head">{{ g.label }}</summary>
        <div class="pg__acc-body">
          <!-- ===== 预览形态与工作台 ===== -->
          <template v-if="g.id === 'layout'">
            <label class="pg__field">
              <span>预览形态</span>
              <select v-model="cfg.layout" class="pg__select">
                <option value="workbench">workbench（全能工作台 · 三栏全组件域）</option>
                <option value="chat">chat（标准对话面板）</option>
              </select>
            </label>
            <template v-if="cfg.layout === 'workbench'">
              <p class="pg__hint">顶栏</p>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbModelSelector" type="checkbox" />
                <span>模型选择器（ModelSelector）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbThemeToggle" type="checkbox" />
                <span>主题切换（ThemeToggle）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbUsageMeter" type="checkbox" />
                <span>用量仪表（UsageMeter）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbBanner" type="checkbox" />
                <span>安全横幅（SafetyBanner）</span>
              </label>
              <p class="pg__hint">左轨面板</p>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbLeftRail" type="checkbox" />
                <span>启用左轨</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbSessions" type="checkbox" :disabled="!cfg.wbLeftRail" />
                <span>会话列表（SessionList）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbPrompts" type="checkbox" :disabled="!cfg.wbLeftRail" />
                <span>提示词库（PromptLibrary）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbKnowledge" type="checkbox" :disabled="!cfg.wbLeftRail" />
                <span>知识库 + 上传（KnowledgeSelector / FileDropzone）</span>
              </label>
              <p class="pg__hint">中栏</p>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbModeSelector" type="checkbox" />
                <span>运行模式选择器（ModeSelector）</span>
              </label>
              <p class="pg__hint">右轨面板</p>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbRightRail" type="checkbox" />
                <span>启用右轨</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbTasks" type="checkbox" :disabled="!cfg.wbRightRail" />
                <span>任务 + 计划（TaskTracker / PlanPanel）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbChanges" type="checkbox" :disabled="!cfg.wbRightRail" />
                <span>变更审查（ChangeReviewPanel）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbTerminal" type="checkbox" :disabled="!cfg.wbRightRail" />
                <span>终端（TerminalPanel）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbArtifacts" type="checkbox" :disabled="!cfg.wbRightRail" />
                <span>产物归集（ArtifactPanel）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbSources" type="checkbox" :disabled="!cfg.wbRightRail" />
                <span>引用来源（SourcePanel）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbProtocol" type="checkbox" :disabled="!cfg.wbRightRail" />
                <span>协议组件（A2A / MCP）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbAgentic" type="checkbox" :disabled="!cfg.wbRightRail" />
                <span>步骤页签（AgentStepList / ToolActionCard / Checkpoint…）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbCards" type="checkbox" :disabled="!cfg.wbRightRail" />
                <span>卡片页签（全部 21 种生成式 UI 卡片）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbWorkbenchPlus" type="checkbox" :disabled="!cfg.wbRightRail" />
                <span>工作台+页签（FilePanel / Browser / MCP / 聚合大组件）</span>
              </label>
              <p class="pg__hint">输入增强与悬浮</p>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbVoice" type="checkbox" />
                <span>语音输入（VoiceRecorderBar）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbWritingAide" type="checkbox" />
                <span>写作辅助（CopilotTextarea）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbPalette" type="checkbox" />
                <span>命令面板（CommandPalette）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbPopup" type="checkbox" />
                <span>悬浮球助手（CopilotPopup）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbSidebar" type="checkbox" />
                <span>侧边抽屉（CopilotSidebar）</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbDevtools" type="checkbox" />
                <span>调试面板（CopilotDevtools）</span>
              </label>
              <p class="pg__hint">辅助</p>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbCompLabels" type="checkbox" />
                <span>显示组件名标注</span>
              </label>
              <label class="pg__field pg__field--row">
                <input v-model="cfg.wbAssemblyCode" type="checkbox" />
                <span>显示组装代码入口</span>
              </label>
            </template>
          </template>

          <!-- ===== 接入协议 ===== -->
          <template v-else-if="g.id === 'connection'">
            <label class="pg__field">
              <span>接入方式</span>
              <select v-model="cfg.connectionMode" class="pg__select">
                <option value="protocol">真实后端（Node · /api/agent · 端到端）</option>
                <option value="browser">内置演示（浏览器直连硅基流动）</option>
              </select>
            </label>
            <template v-if="cfg.connectionMode === 'protocol'">
              <p class="pg__hint">
                默认连接本项目内置的<strong>真实 Node 后端</strong>（Vite 中间件 <code>/api/agent</code>）：
                真实 LLM（Vercel AI Gateway）、真实文件读写（.agent-workspace 沙箱）、真实终端命令执行、
                任务/计划/表单/审批全事件流。需配置 <code>AI_GATEWAY_API_KEY</code> 环境变量。
              </p>
              <label class="pg__field">
                <span>Provider（32 种预设）</span>
                <select v-model="cfg.provider" class="pg__select">
                  <option value="agentscope">agentscope（本项目 Node 后端 / Java 后端）</option>
                  <option value="langserve">langserve（LangChain）</option>
                  <option value="dify">dify</option>
                  <option value="coze">coze（扣子）</option>
                  <option value="fastgpt">fastgpt</option>
                  <option value="a2a">a2a（Agent-to-Agent）</option>
                  <option value="acp">acp（BeeAI）</option>
                  <option value="openai-assistants">openai-assistants</option>
                  <option value="ai-sdk">ai-sdk（Vercel）</option>
                  <option value="openai">openai（OpenAI 兼容）</option>
                  <option value="deepseek">deepseek</option>
                  <option value="qwen">qwen（通义千问）</option>
                  <option value="vllm">vllm（自托��）</option>
                </select>
              </label>
              <label class="pg__field">
                <span>Endpoint</span>
                <input v-model="cfg.endpoint" type="text" class="pg__input" placeholder="http://localhost:8080/api/agent" />
              </label>
              <label class="pg__field">
                <span>API Key（可选）</span>
                <input v-model="cfg.protocolApiKey" type="password" class="pg__input" placeholder="留空则不携带" autocomplete="off" />
              </label>
              <p class="pg__hint">
                也可指向你自己的服务端点，例如 Java 参考后端：
                <code>{{ '{' }} provider: 'agentscope', endpoint: 'http://localhost:8080/api/agent' {{ '}' }}</code>
              </p>
            </template>
          </template>

          <!-- ===== 外观 ===== -->
          <template v-else-if="g.id === 'appearance'">
            <label class="pg__field">
              <span>主题</span>
              <select v-model="cfg.theme" class="pg__select">
                <option value="light">light</option>
                <option value="dark">dark</option>
                <option value="auto">auto（跟随系统）</option>
              </select>
            </label>
            <label class="pg__field">
              <span>品牌色</span>
              <input v-model="cfg.brandColor" type="color" class="pg__color" aria-label="品牌色" />
            </label>
            <label class="pg__field">
              <span>圆角</span>
              <select v-model="cfg.radius" class="pg__select">
                <option value="none">none</option>
                <option value="sm">sm</option>
                <option value="md">md</option>
                <option value="lg">lg</option>
              </select>
            </label>
            <label class="pg__field">
              <span>密度</span>
              <select v-model="cfg.density" class="pg__select">
                <option value="comfortable">comfortable</option>
                <option value="compact">compact</option>
              </select>
            </label>
            <label class="pg__field">
              <span>界面语言（locale）</span>
              <select v-model="cfg.locale" class="pg__select">
                <option value="zh">zh（中文）</option>
                <option value="en">en（English）</option>
              </select>
            </label>
            <label class="pg__field">
              <span>助手名称</span>
              <input v-model="cfg.botName" type="text" class="pg__input" />
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.showAvatars" type="checkbox" />
              <span>显示头像</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.showTimestamps" type="checkbox" />
              <span>显示时间戳</span>
            </label>
          </template>

          <!-- ===== 欢迎屏 ===== -->
          <template v-else-if="g.id === 'welcome'">
            <label class="pg__field">
              <span>标题</span>
              <input v-model="cfg.welcomeTitle" type="text" class="pg__input" />
            </label>
            <label class="pg__field">
              <span>副标题</span>
              <input v-model="cfg.welcomeSubtitle" type="text" class="pg__input" />
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.welcomeHints" type="checkbox" />
              <span>空态引导提示（点击发送）</span>
            </label>
          </template>

          <!-- ===== 模型与行为 ===== -->
          <template v-else-if="g.id === 'model'">
            <label class="pg__field">
              <span>Agent 类型预设（agentType）</span>
              <select v-model="cfg.agentType" class="pg__select">
                <option value="chat">chat（通用对话）</option>
                <option value="code">code（代码）</option>
                <option value="design">design（设计）</option>
                <option value="data">data（数据）</option>
                <option value="custom">custom（自定义）</option>
              </select>
            </label>
            <label class="pg__field">
              <span>System Prompt（留空用场景内置）</span>
              <textarea
                v-model="cfg.systemPrompt" class="pg__input pg__textarea" rows="3"
                placeholder="你是一位专业的企业助手…"
              ></textarea>
            </label>
            <label class="pg__field">
              <span>Temperature（{{ cfg.temperature }}）</span>
              <input v-model.number="cfg.temperature" type="range" min="0" max="2" step="0.1" class="pg__range" />
            </label>
            <label class="pg__field">
              <span>Max Tokens</span>
              <input v-model.number="cfg.maxTokens" type="number" min="256" max="8192" step="256" class="pg__input" />
            </label>
            <label class="pg__field">
              <span>ReAct 最大迭代轮数</span>
              <input v-model.number="cfg.maxIterations" type="number" min="1" max="20" class="pg__input" />
            </label>
            <label class="pg__field">
              <span>失败重试次数</span>
              <input v-model.number="cfg.maxRetries" type="number" min="0" max="5" class="pg__input" />
            </label>
            <label class="pg__field">
              <span>请求超时（毫秒）</span>
              <input v-model.number="cfg.requestTimeout" type="number" min="5000" max="300000" step="5000" class="pg__input" />
            </label>
            <label class="pg__field">
              <span>重试间隔（毫秒）</span>
              <input v-model.number="cfg.retryDelay" type="number" min="0" max="10000" step="500" class="pg__input" />
            </label>
          </template>

          <!-- ===== 输入体验 ===== -->
          <template v-else-if="g.id === 'input'">
            <label class="pg__field pg__field--row">
              <input v-model="cfg.enableCommands" type="checkbox" />
              <span>斜杠命令（/）</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.enableMentions" type="checkbox" />
              <span>@ 提及 / # 引用</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.queueEnabled" type="checkbox" />
              <span>消息队列（运行中排队）</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.sendOnEnter" type="checkbox" />
              <span>Enter 发送</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.attachments" type="checkbox" />
              <span>附件上传</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.draftPersistence" type="checkbox" />
              <span>输入草稿持久化</span>
            </label>
            <label class="pg__field">
              <span>输入长度上限</span>
              <input v-model.number="cfg.inputMaxLength" type="number" min="100" max="20000" step="100" class="pg__input" />
            </label>
            <label class="pg__field">
              <span>输入框初始行数（inputRows）</span>
              <input v-model.number="cfg.inputRows" type="number" min="1" max="8" class="pg__input" />
            </label>
          </template>

          <!-- ===== 消息与操作 ===== -->
          <template v-else-if="g.id === 'message'">
            <label class="pg__field pg__field--row">
              <input v-model="cfg.actionCopy" type="checkbox" />
              <span>复制消息</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.actionRegenerate" type="checkbox" />
              <span>重新���成</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.actionEdit" type="checkbox" />
              <span>编辑重发（分支）</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.feedbackEnabled" type="checkbox" />
              <span>消息反馈（赞/踩）</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.streamingEnabled" type="checkbox" />
              <span>流式输出（streaming.enabled）</span>
            </label>
            <label class="pg__field">
              <span>打字机速度（字符/帧，0 不限速）</span>
              <input v-model.number="cfg.typewriterSpeed" type="number" min="0" max="20" class="pg__input" :disabled="!cfg.streamingEnabled" />
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.autoScroll" type="checkbox" />
              <span>自动滚动到底部</span>
            </label>
            <p class="pg__hint">Markdown 渲染</p>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.mdCodeHighlight" type="checkbox" />
              <span>代码块高亮</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.mdTables" type="checkbox" />
              <span>渲染表格</span>
            </label>
            <label class="pg__field">
              <span>链接打开方式</span>
              <select v-model="cfg.mdLinkTarget" class="pg__select">
                <option value="_blank">_blank（新标签页）</option>
                <option value="_self">_self（当前页）</option>
              </select>
            </label>
          </template>

          <!-- ===== 工具与审批 ===== -->
          <template v-else-if="g.id === 'tools'">
            <label class="pg__field">
              <span>工具调用展示</span>
              <select v-model="cfg.toolDisplayMode" class="pg__select">
                <option value="inline">inline（展开）</option>
                <option value="collapsed">collapsed（折叠）</option>
                <option value="hidden">hidden（隐藏）</option>
              </select>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.toolShowArgs" type="checkbox" />
              <span>显示工具参数</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.toolShowResult" type="checkbox" />
              <span>显示工具结果</span>
            </label>
            <label class="pg__field">
              <span>审批模式</span>
              <select v-model="cfg.approvalMode" class="pg__select">
                <option value="auto">auto（全自动）</option>
                <option value="gate">gate（高影响确认）</option>
                <option value="always">always（全部确认）</option>
              </select>
            </label>
          </template>

          <!-- ===== Agentic ===== -->
          <template v-else-if="g.id === 'agentic'">
            <label class="pg__field">
              <span>运行模式</span>
              <select v-model="cfg.agentMode" class="pg__select">
                <option value="confirm_edits">confirm_edits（变更前确认）</option>
                <option value="auto_edit">auto_edit（自动编辑）</option>
                <option value="plan">plan（计划模式）</option>
                <option value="full_access">full_access（完全访问）</option>
              </select>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.showThinking" type="checkbox" />
              <span>显示思考块</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.thinkingToggle" type="checkbox" />
              <span>深度思考开关</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.formReview" type="checkbox" />
              <span>表单提交后 AI 检查</span>
            </label>
            <p class="pg__hint">可用模式（availableModes，用于 ModeSelector）</p>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.modeConfirmEdits" type="checkbox" />
              <span>confirm_edits</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.modeAutoEdit" type="checkbox" />
              <span>auto_edit</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.modePlan" type="checkbox" />
              <span>plan</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.modeFullAccess" type="checkbox" />
              <span>full_access</span>
            </label>
          </template>

          <!-- ===== 可观测性 ===== -->
          <template v-else-if="g.id === 'observability'">
            <label class="pg__field pg__field--row">
              <input v-model="cfg.showTokenUsage" type="checkbox" />
              <span>Token 用量</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.enableSuggestions" type="checkbox" />
              <span>建议问题</span>
            </label>
            <label class="pg__field pg__field--row">
              <input v-model="cfg.debug" type="checkbox" />
              <span>调试模式（debug，控制台输出事件流）</span>
            </label>
          </template>

          <!-- ===== 持久化 ===== -->
          <template v-else-if="g.id === 'persistence'">
            <label class="pg__field">
              <span>会话持久化</span>
              <select v-model="cfg.persistenceMode" class="pg__select">
                <option value="none">none（不保存）</option>
                <option value="local">local（localStorage）</option>
                <option value="session">session（sessionStorage）</option>
              </select>
            </label>
            <label class="pg__field">
              <span>保留最近消息条数</span>
              <input v-model.number="cfg.historyLimit" type="number" min="10" max="500" step="10" class="pg__input" />
            </label>
            <label class="pg__field">
              <span>发送频率限制（毫秒，0 不限）</span>
              <input v-model.number="cfg.rateLimit" type="number" min="0" max="10000" step="500" class="pg__input" />
            </label>
          </template>

          <!-- ===== 演示场景 ===== -->
          <template v-else-if="g.id === 'scenario'">
            <label class="pg__field">
              <span>Agent 场景</span>
              <select v-model="cfg.scenario" class="pg__select">
                <option v-for="s in scenarios" :key="s.id" :value="s.id">{{ s.label }}</option>
              </select>
            </label>
            <button type="button" class="pg__demo-form" @click="triggerFormDemo">
              发送 AI 表单演示（用户填写 → AI 检查）
            </button>
          </template>
        </div>
      </details>

      <button type="button" class="pg__reset" @click="reset">重置为默认</button>
    </aside>

    <!-- 右侧：预览 / 代码 -->
    <div class="pg__main">
      <div class="pg__tabs" role="tablist" aria-label="预览模式">
        <button
          type="button" role="tab" class="pg__tab"
          :aria-selected="mode === 'preview'" :class="{ 'pg__tab--on': mode === 'preview' }"
          @click="mode = 'preview'"
        >实时预览</button>
        <button
          type="button" role="tab" class="pg__tab"
          :aria-selected="mode === 'code'" :class="{ 'pg__tab--on': mode === 'code' }"
          @click="mode = 'code'"
        >生成的配置代码</button>
      </div>

      <div v-show="mode === 'preview'" class="pg__preview">
        <CopilotProvider :key="providerKey" :config="mergedConfig">
          <ActionRegistrar :actions="activeScenario.actions" />
          <OmniComposedSurface v-if="cfg.layout === 'workbench'" :features="wbFeatures" class="pg__wb-frame" />
          <div v-else class="pg__chat-frame">
            <CopilotChat :show-reset="true" />
          </div>
        </CopilotProvider>
      </div>

      <div v-show="mode === 'code'" class="pg__code">
        <pre><code>{{ generatedCode }}</code></pre>
        <button type="button" class="pg__copy" @click="copyCode">{{ copied ? '已复制' : '复制代码' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { CopilotActionDef, CopilotConfig, MentionItem, SlashCommand } from '../../lib/agent-copilot'
import CopilotProvider from '../../lib/agent-copilot/components/CopilotProvider.vue'
import { copyText } from '../../lib/agent-copilot/utils/clipboard'
import CopilotChat from '../../lib/agent-copilot/components/chat/CopilotChat.vue'
import ActionRegistrar from '../gallery/ActionRegistrar.vue'
import OmniComposedSurface from '../gallery/OmniComposedSurface.vue'
import {
  chatAgentConfig, chatAgentActions,
  codeAgentConfig, codeAgentActions,
  dataAgentConfig, dataAgentActions,
} from '../gallery/agent-demos'
import {
  customerServiceConfig, customerServiceActions,
  commerceConfig, commerceActions,
  financeConfig, financeActions,
} from '../solutions/industry-demos'

// ---- 场景定义（覆盖全部演示：3 个基础 Agent + 3 个行业场景） ----
interface Scenario { id: string; label: string; config: CopilotConfig; actions: CopilotActionDef[] }
const scenarios: Scenario[] = [
  { id: 'chat', label: 'Chat Agent（知识问答）', config: chatAgentConfig, actions: chatAgentActions },
  { id: 'code', label: 'Code Agent（代码生成）', config: codeAgentConfig, actions: codeAgentActions },
  { id: 'data', label: 'Data Agent（数据分析）', config: dataAgentConfig, actions: dataAgentActions },
  { id: 'support', label: '行业 · 智能客服与工单', config: customerServiceConfig, actions: customerServiceActions },
  { id: 'commerce', label: '行业 · 电商智能导购', config: commerceConfig, actions: commerceActions },
  { id: 'finance', label: '行业 · 金融投研助手', config: financeConfig, actions: financeActions },
]

// ---- 配置分组（左侧全部展开，所有配置一览无余） ----
const GROUPS: { id: string; label: string; defaultOpen?: boolean }[] = [
  { id: 'scenario', label: '演示场景', defaultOpen: true },
  { id: 'layout', label: '预览形态与工作台', defaultOpen: true },
  { id: 'connection', label: '接入协议', defaultOpen: true },
  { id: 'appearance', label: '外观', defaultOpen: true },
  { id: 'welcome', label: '欢迎屏', defaultOpen: true },
  { id: 'model', label: '模型与行为', defaultOpen: true },
  { id: 'input', label: '输入体验', defaultOpen: true },
  { id: 'message', label: '消息与操作', defaultOpen: true },
  { id: 'tools', label: '工具与审批', defaultOpen: true },
  { id: 'agentic', label: 'Agentic', defaultOpen: true },
  { id: 'observability', label: '可观测性', defaultOpen: true },
  { id: 'persistence', label: '持久化与限流', defaultOpen: true },
]

// ---- 可调配置状态（全量） ----
interface PlaygroundState {
  // 预览形态与工作台
  layout: 'chat' | 'workbench'
  wbModelSelector: boolean
  wbThemeToggle: boolean
  wbUsageMeter: boolean
  wbBanner: boolean
  wbLeftRail: boolean
  wbSessions: boolean
  wbPrompts: boolean
  wbKnowledge: boolean
  wbModeSelector: boolean
  wbRightRail: boolean
  wbTasks: boolean
  wbChanges: boolean
  wbTerminal: boolean
  wbArtifacts: boolean
  wbSources: boolean
  wbProtocol: boolean
  wbAgentic: boolean
  wbCards: boolean
  wbWorkbenchPlus: boolean
  wbVoice: boolean
  wbWritingAide: boolean
  wbPalette: boolean
  wbPopup: boolean
  wbSidebar: boolean
  wbDevtools: boolean
  wbCompLabels: boolean
  wbAssemblyCode: boolean
  // 接入协议
  connectionMode: 'browser' | 'protocol'
  provider: string
  endpoint: string
  protocolApiKey: string
  // 外观
  theme: 'light' | 'dark' | 'auto'
  brandColor: string
  radius: 'none' | 'sm' | 'md' | 'lg'
  density: 'compact' | 'comfortable'
  locale: 'zh' | 'en'
  botName: string
  showAvatars: boolean
  showTimestamps: boolean
  // 欢迎屏
  welcomeTitle: string
  welcomeSubtitle: string
  welcomeHints: boolean
  // 模型与行为
  agentType: 'chat' | 'code' | 'design' | 'data' | 'custom'
  systemPrompt: string
  temperature: number
  maxTokens: number
  maxIterations: number
  maxRetries: number
  requestTimeout: number
  retryDelay: number
  // 输入体验
  sendOnEnter: boolean
  enableCommands: boolean
  enableMentions: boolean
  queueEnabled: boolean
  attachments: boolean
  draftPersistence: boolean
  inputMaxLength: number
  inputRows: number
  // 消息与操作
  actionCopy: boolean
  actionRegenerate: boolean
  actionEdit: boolean
  feedbackEnabled: boolean
  streamingEnabled: boolean
  typewriterSpeed: number
  autoScroll: boolean
  mdCodeHighlight: boolean
  mdTables: boolean
  mdLinkTarget: '_blank' | '_self'
  // 工具与审批
  toolDisplayMode: 'inline' | 'collapsed' | 'hidden'
  toolShowArgs: boolean
  toolShowResult: boolean
  approvalMode: 'auto' | 'gate' | 'always'
  // Agentic
  agentMode: 'confirm_edits' | 'auto_edit' | 'plan' | 'full_access'
  modeConfirmEdits: boolean
  modeAutoEdit: boolean
  modePlan: boolean
  modeFullAccess: boolean
  showThinking: boolean
  thinkingToggle: boolean
  formReview: boolean
  // 可观测性
  showTokenUsage: boolean
  debug: boolean
  enableSuggestions: boolean
  // 持久化与限流
  persistenceMode: 'none' | 'local' | 'session'
  historyLimit: number
  rateLimit: number
  // 场景
  scenario: string
}

const DEFAULTS: PlaygroundState = {
  layout: 'workbench',
  wbModelSelector: true,
  wbThemeToggle: true,
  wbUsageMeter: true,
  wbBanner: true,
  wbLeftRail: true,
  wbSessions: true,
  wbPrompts: true,
  wbKnowledge: true,
  wbModeSelector: true,
  wbRightRail: true,
  wbTasks: true,
  wbChanges: true,
  wbTerminal: true,
  wbArtifacts: true,
  wbSources: true,
  wbProtocol: true,
  wbAgentic: true,
  wbCards: true,
  wbWorkbenchPlus: true,
  wbVoice: true,
  wbWritingAide: true,
  wbPalette: true,
  wbPopup: true,
  wbSidebar: true,
  wbDevtools: true,
  wbCompLabels: false,
  wbAssemblyCode: false,
  connectionMode: 'protocol',
  provider: 'agentscope',
  endpoint: '/api/agent',
  protocolApiKey: '',
  theme: 'light',
  brandColor: '#1d4ed8',
  radius: 'md',
  density: 'comfortable',
  locale: 'zh',
  botName: 'AI 助手',
  showAvatars: true,
  showTimestamps: true,
  welcomeTitle: '',
  welcomeSubtitle: '',
  welcomeHints: false,
  agentType: 'chat',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 2048,
  maxIterations: 8,
  maxRetries: 1,
  requestTimeout: 60000,
  retryDelay: 1000,
  sendOnEnter: true,
  enableCommands: true,
  enableMentions: true,
  queueEnabled: true,
  attachments: false,
  draftPersistence: false,
  inputMaxLength: 4000,
  inputRows: 1,
  actionCopy: true,
  actionRegenerate: true,
  actionEdit: true,
  feedbackEnabled: true,
  streamingEnabled: true,
  typewriterSpeed: 0,
  autoScroll: true,
  mdCodeHighlight: true,
  mdTables: true,
  mdLinkTarget: '_blank',
  toolDisplayMode: 'inline',
  toolShowArgs: true,
  toolShowResult: true,
  approvalMode: 'auto',
  agentMode: 'confirm_edits',
  modeConfirmEdits: true,
  modeAutoEdit: true,
  modePlan: true,
  modeFullAccess: true,
  showThinking: true,
  thinkingToggle: false,
  formReview: true,
  showTokenUsage: true,
  debug: false,
  enableSuggestions: false,
  persistenceMode: 'none',
  historyLimit: 100,
  rateLimit: 0,
  scenario: 'chat',
}

const cfg = reactive<PlaygroundState>({ ...DEFAULTS })
const mode = ref<'preview' | 'code'>('preview')
const copied = ref(false)

const activeScenario = computed(() => scenarios.find((s) => s.id === cfg.scenario) ?? scenarios[0])

/** 可用运行模式（至少保留当前模式，避免空数组） */
const availableModes = computed(() => {
  const modes: ('confirm_edits' | 'auto_edit' | 'plan' | 'full_access')[] = []
  if (cfg.modeConfirmEdits) modes.push('confirm_edits')
  if (cfg.modeAutoEdit) modes.push('auto_edit')
  if (cfg.modePlan) modes.push('plan')
  if (cfg.modeFullAccess) modes.push('full_access')
  if (!modes.includes(cfg.agentMode)) modes.push(cfg.agentMode)
  return modes
})

/** 工作台形态的功能开关（映射到 OmniComposedSurface 的 features 属性） */
const wbFeatures = computed(() => ({
  modelSelector: cfg.wbModelSelector,
  themeToggle: cfg.wbThemeToggle,
  usageMeter: cfg.wbUsageMeter,
  banner: cfg.wbBanner,
  leftRail: cfg.wbLeftRail,
  sessions: cfg.wbSessions,
  prompts: cfg.wbPrompts,
  knowledge: cfg.wbKnowledge,
  suggestions: true,
  modeSelector: cfg.wbModeSelector,
  thinkingToggle: cfg.thinkingToggle,
  attachments: cfg.attachments,
  commands: cfg.enableCommands,
  mentions: cfg.enableMentions,
  rightRail: cfg.wbRightRail,
  tasks: cfg.wbTasks,
  changes: cfg.wbChanges,
  terminal: cfg.wbTerminal,
  artifacts: cfg.wbArtifacts,
  sources: cfg.wbSources,
  protocol: cfg.wbProtocol,
  agentic: cfg.wbAgentic,
  cards: cfg.wbCards,
  workbench: cfg.wbWorkbenchPlus,
  voice: cfg.wbVoice,
  writingAide: cfg.wbWritingAide,
  palette: cfg.wbPalette,
  popup: cfg.wbPopup,
  sidebar: cfg.wbSidebar,
  devtools: cfg.wbDevtools,
  compLabels: cfg.wbCompLabels,
  assemblyCode: cfg.wbAssemblyCode,
}))

// ---- 输入增强演示数据 ----
const demoCommands: SlashCommand[] = [
  { name: 'summarize', description: '总结当前对话', icon: 'S', mode: 'send', template: '请总结当前对话的要点' },
  { name: 'translate', description: '翻译为指定语言', icon: 'T', hint: '<语言>', mode: 'template', template: '请把以下内容翻译为' },
  { name: 'explain', description: '解释所选内容', icon: 'E', mode: 'template', template: '请解释：' },
]
const demoMentions: MentionItem[] = [
  { id: 'u1', label: '张三', type: 'person', description: '数据分析师' },
  { id: 'u2', label: '李四', type: 'person', description: '数据工程师' },
  { id: 'a1', label: '风险评估 Agent', type: 'agent', description: '识别项目风险' },
  { id: 'e1', label: '统一网关服务', type: 'entity', description: '核心系统' },
]
const demoRefs: MentionItem[] = [
  { id: 'd1', label: '2026 Q2 经营报告', type: 'doc', description: 'PDF · 34 页' },
  { id: 'd2', label: '差旅报销制度 v3', type: 'doc', description: '制度文档' },
  { id: 'ds1', label: 'work_items 数据集', type: 'dataset', description: '128 万行' },
]

function filterItems(items: MentionItem[], q: string) {
  if (!q) return items
  return items.filter((m) => m.label.toLowerCase().includes(q.toLowerCase()))
}

/** 合并：场景基础配置 + 演练场覆盖项（全量） */
const mergedConfig = computed<CopilotConfig>(() => ({
  ...activeScenario.value.config,
  // 接入协议：protocol 模式走 provider/endpoint（覆盖场景内置的 browser 运行时）
  ...(cfg.connectionMode === 'protocol'
    ? {
        runtime: undefined,
        provider: cfg.provider,
        endpoint: cfg.endpoint,
        apiKey: cfg.protocolApiKey || undefined,
        apiBase: undefined,
        model: undefined,
      }
    : {}),
  // 外观
  theme: cfg.theme,
  brandColor: cfg.brandColor,
  radius: cfg.radius,
  density: cfg.density,
  locale: cfg.locale,
  botName: cfg.botName,
  showAvatars: cfg.showAvatars,
  showTimestamps: cfg.showTimestamps,
  // 欢迎屏
  welcomeScreen: cfg.welcomeTitle || cfg.welcomeSubtitle || cfg.welcomeHints
    ? {
        title: cfg.welcomeTitle || undefined,
        subtitle: cfg.welcomeSubtitle || undefined,
        hints: cfg.welcomeHints ? ['差旅报销流程是什么？', '出差住宿标准是多少？'] : undefined,
      }
    : activeScenario.value.config.welcomeScreen,
  // 模型与行为
  agentType: cfg.agentType,
  systemPrompt: cfg.systemPrompt || activeScenario.value.config.systemPrompt,
  temperature: cfg.temperature,
  maxTokens: cfg.maxTokens,
  maxIterations: cfg.maxIterations,
  maxRetries: cfg.maxRetries,
  requestTimeout: cfg.requestTimeout,
  retryDelay: cfg.retryDelay,
  // 输入体验
  sendOnEnter: cfg.sendOnEnter,
  inputMaxLength: cfg.inputMaxLength,
  inputRows: cfg.inputRows,
  attachments: cfg.attachments ? { enabled: true, maxCount: 5 } : undefined,
  draftPersistence: cfg.draftPersistence,
  commands: cfg.enableCommands ? demoCommands : undefined,
  mentionProvider: cfg.enableMentions ? (q: string) => filterItems(demoMentions, q) : undefined,
  referenceProvider: cfg.enableMentions ? (q: string) => filterItems(demoRefs, q) : undefined,
  queue: { enabled: cfg.queueEnabled },
  // 消息与操作
  messageActions: {
    copy: cfg.actionCopy,
    regenerate: cfg.actionRegenerate,
    edit: cfg.actionEdit,
    feedback: cfg.feedbackEnabled,
  },
  streaming: { enabled: cfg.streamingEnabled, typewriterSpeed: cfg.typewriterSpeed },
  autoScroll: cfg.autoScroll,
  markdown: { codeHighlight: cfg.mdCodeHighlight, tables: cfg.mdTables, linkTarget: cfg.mdLinkTarget },
  // 工具与审批
  toolDisplay: { mode: cfg.toolDisplayMode, showArgs: cfg.toolShowArgs, showResult: cfg.toolShowResult },
  approvalMode: cfg.approvalMode,
  // Agentic
  agentic: {
    mode: cfg.agentMode,
    availableModes: availableModes.value,
    showThinking: cfg.showThinking,
    thinkingToggle: cfg.thinkingToggle,
    formReview: cfg.formReview,
  },
  // 可观测性
  showTokenUsage: cfg.showTokenUsage,
  debug: cfg.debug,
  suggestions: cfg.enableSuggestions
    ? {
        static: [
          { title: '报销流程', message: '差旅报销流程是什么？' },
          { title: '住宿标准', message: '出差住宿标准是多少？' },
        ],
      }
    : false,
  // 持久化与限流
  persistence: { mode: cfg.persistenceMode, historyLimit: cfg.historyLimit },
  rateLimit: cfg.rateLimit,
}))

/** 场景或结构性配置变化时重建 Provider */
const providerKey = computed(() =>
  [
    cfg.scenario, cfg.enableCommands, cfg.enableMentions, cfg.queueEnabled, cfg.theme,
    cfg.attachments, cfg.persistenceMode, cfg.agentMode, cfg.thinkingToggle,
    cfg.connectionMode, cfg.provider, cfg.endpoint, cfg.layout,
    cfg.locale, cfg.agentType, cfg.streamingEnabled, cfg.debug,
    availableModes.value.join(','),
  ].join('|'),
)

// ---- AI 表单演示（用户填写 → AI 检查） ----
/** 通过全局事件把表单载荷注入当前会话（CopilotChat 的调试通道） */
const formDemoTick = ref(0)
function triggerFormDemo() {
  formDemoTick.value++
  window.dispatchEvent(
    new CustomEvent('agent-copilot:inject-payload', {
      detail: {
        type: 'form',
        data: {
          formId: `demo_form_${formDemoTick.value}`,
          title: '通用申请单',
          description: '请填写申请信息，提交后 AI 会自动检查内容的完整性与合理性。',
          submitLabel: '提交并请 AI 检查',
          fields: [
            { name: 'item', label: '申请事项', type: 'text', required: true, placeholder: '如：开发环境服务器扩容', minLength: 2, maxLength: 50 },
            { name: 'category', label: '申请类别', type: 'select', required: true, options: [
              { label: '设备资源', value: 'device' }, { label: '权限开通', value: 'access' }, { label: '预算费用', value: 'budget' }, { label: '其他', value: 'other' },
            ] },
            { name: 'quantity', label: '数量', type: 'number', required: true, min: 1, max: 999, unit: '件' },
            { name: 'budget', label: '预算金额', type: 'slider', min: 1000, max: 500000, step: 1000, unit: '元', defaultValue: 50000 },
            { name: 'urgency', label: '紧急程度', type: 'radio', required: true, options: [
              { label: '常规（2 周内）', value: 'normal' }, { label: '加急（3 天内）', value: 'urgent' }, { label: '特急（24 小时）', value: 'critical' },
            ] },
            { name: 'deliveryDate', label: '期望交付日期', type: 'date', required: true },
            { name: 'contactEmail', label: '联系邮箱', type: 'email', required: true, placeholder: 'name@company.com' },
            { name: 'contactTel', label: '联系电话', type: 'tel', placeholder: '+86 138 0000 0000' },
            { name: 'departments', label: '使用部门（多选）', type: 'multiselect', required: true, options: [
              { label: '研发部', value: 'rd' }, { label: '市场部', value: 'marketing' }, { label: '财务部', value: 'finance' }, { label: '行政部', value: 'admin' },
            ] },
            { name: 'tags', label: '标签', type: 'tags', placeholder: '输入标签后按 Enter' },
            { name: 'needInstall', label: '需要协助部署', type: 'switch', description: '开启后平台团队将协助部署上线' },
            { name: 'priority', label: '优先级评分', type: 'rating', maxRating: 5 },
            { name: 'reason', label: '申请理由', type: 'textarea', required: true, minLength: 10, maxLength: 500, placeholder: '请说明申请必要性（至少 10 个字符）' },
          ],
        },
      },
    }),
  )
}

// ---- 代码生成（全量） ----
const generatedCode = computed(() => {
  const l: string[] = [`const config: CopilotConfig = {`]
  l.push(`  // 接入协议`)
  if (cfg.connectionMode === 'protocol') {
    l.push(`  provider: '${cfg.provider}',`)
    l.push(`  endpoint: '${cfg.endpoint}',`)
    if (cfg.protocolApiKey) l.push(`  apiKey: '<YOUR_API_KEY>',`)
  } else {
    l.push(`  // 演示用浏览器直连；生产接入你的后端只需两行：`)
    l.push(`  // provider: 'agentscope',`)
    l.push(`  // endpoint: 'http://localhost:8080/api/agent',`)
    l.push(`  runtime: 'browser',`)
  }
  l.push(`  // 外观`)
  l.push(`  theme: '${cfg.theme}',`)
  l.push(`  brandColor: '${cfg.brandColor}',`)
  l.push(`  radius: '${cfg.radius}',`)
  l.push(`  density: '${cfg.density}',`)
  l.push(`  locale: '${cfg.locale}',`)
  l.push(`  botName: '${cfg.botName}',`)
  l.push(`  showAvatars: ${cfg.showAvatars},`)
  l.push(`  showTimestamps: ${cfg.showTimestamps},`)
  if (cfg.welcomeTitle || cfg.welcomeSubtitle || cfg.welcomeHints) {
    l.push(`  welcomeScreen: {`)
    if (cfg.welcomeTitle) l.push(`    title: '${cfg.welcomeTitle}',`)
    if (cfg.welcomeSubtitle) l.push(`    subtitle: '${cfg.welcomeSubtitle}',`)
    if (cfg.welcomeHints) l.push(`    hints: ['差旅报销流程是什么？', '出差住宿标准是多少？'],`)
    l.push(`  },`)
  }
  l.push(`  // 模型与行为`)
  l.push(`  agentType: '${cfg.agentType}',`)
  if (cfg.systemPrompt) l.push(`  systemPrompt: ${JSON.stringify(cfg.systemPrompt)},`)
  l.push(`  temperature: ${cfg.temperature},`)
  l.push(`  maxTokens: ${cfg.maxTokens},`)
  l.push(`  maxIterations: ${cfg.maxIterations},`)
  l.push(`  maxRetries: ${cfg.maxRetries},`)
  l.push(`  requestTimeout: ${cfg.requestTimeout},`)
  l.push(`  retryDelay: ${cfg.retryDelay},`)
  l.push(`  // 输入体验`)
  l.push(`  sendOnEnter: ${cfg.sendOnEnter},`)
  l.push(`  inputMaxLength: ${cfg.inputMaxLength},`)
  l.push(`  inputRows: ${cfg.inputRows},`)
  if (cfg.attachments) l.push(`  attachments: { enabled: true, maxCount: 5 },`)
  if (cfg.draftPersistence) l.push(`  draftPersistence: true,`)
  if (cfg.enableCommands) {
    l.push(`  commands: [`)
    l.push(`    { name: 'summarize', description: '总结当前对话', mode: 'send', template: '请总结当前对话的要点' },`)
    l.push(`    { name: 'translate', description: '翻译为指定语言', hint: '<语言>', mode: 'template', template: '请把以下内容翻译为' },`)
    l.push(`  ],`)
  }
  if (cfg.enableMentions) {
    l.push(`  mentionProvider: async (q) => searchPeopleAndAgents(q),`)
    l.push(`  referenceProvider: async (q) => searchDocsAndDatasets(q),`)
  }
  l.push(`  queue: { enabled: ${cfg.queueEnabled} },`)
  l.push(`  // 消息与操作`)
  l.push(`  messageActions: { copy: ${cfg.actionCopy}, regenerate: ${cfg.actionRegenerate}, edit: ${cfg.actionEdit}, feedback: ${cfg.feedbackEnabled} },`)
  l.push(`  streaming: { enabled: ${cfg.streamingEnabled}, typewriterSpeed: ${cfg.typewriterSpeed} },`)
  l.push(`  autoScroll: ${cfg.autoScroll},`)
  l.push(`  markdown: { codeHighlight: ${cfg.mdCodeHighlight}, tables: ${cfg.mdTables}, linkTarget: '${cfg.mdLinkTarget}' },`)
  l.push(`  // 工具与审批`)
  l.push(`  toolDisplay: { mode: '${cfg.toolDisplayMode}', showArgs: ${cfg.toolShowArgs}, showResult: ${cfg.toolShowResult} },`)
  l.push(`  approvalMode: '${cfg.approvalMode}',`)
  l.push(`  // Agentic`)
  l.push(`  agentic: {`)
  l.push(`    mode: '${cfg.agentMode}',`)
  l.push(`    availableModes: [${availableModes.value.map((m) => `'${m}'`).join(', ')}],`)
  l.push(`    showThinking: ${cfg.showThinking},`)
  l.push(`    thinkingToggle: ${cfg.thinkingToggle},`)
  l.push(`    formReview: ${cfg.formReview}, // 表单提交后自动回传 AI 检查`)
  l.push(`  },`)
  l.push(`  // 可观测性与反馈`)
  l.push(`  showTokenUsage: ${cfg.showTokenUsage},`)
  if (cfg.debug) l.push(`  debug: true,`)
  l.push(`  suggestions: ${cfg.enableSuggestions ? `{ static: [{ title: '报销流程', message: '差旅报销流程是什么？' }] }` : 'false'},`)
  l.push(`  // 持久化与限流`)
  l.push(`  persistence: { mode: '${cfg.persistenceMode}', historyLimit: ${cfg.historyLimit} },`)
  l.push(`  rateLimit: ${cfg.rateLimit},`)
  l.push(`}`)
  return l.join('\n')
})

function reset() {
  Object.assign(cfg, DEFAULTS)
}

async function copyCode() {
  if (await copyText(generatedCode.value)) {
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  }
}
</script>

<style scoped>
.pg {
  display: flex;
  height: 100%;
  min-height: 0;
}

/* 左侧表单 */
.pg__form {
  width: 300px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--ac-border);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.pg__form-title { margin: 0; font-size: 1rem; font-weight: 700; }
.pg__textarea { resize: vertical; min-height: 56px; font-family: inherit; line-height: 1.5; }
.pg__form-sub { margin: 4px 0 0; font-size: 0.78rem; color: var(--ac-muted); }

/* 折叠分组（flex-shrink: 0 防止被滚动容器压缩） */
.pg__acc {
  flex-shrink: 0;
  border: 1px solid var(--ac-border);
  border-radius: 10px;
  overflow: hidden;
}
.pg__reset { flex-shrink: 0; }
.pg__acc-head {
  cursor: pointer;
  padding: 9px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ac-fg);
  background: var(--ac-surface);
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
}
.pg__acc-head::-webkit-details-marker { display: none; }
.pg__acc-head::after {
  content: '';
  margin-left: auto;
  width: 7px;
  height: 7px;
  border-right: 1.5px solid var(--ac-muted);
  border-bottom: 1.5px solid var(--ac-muted);
  transform: rotate(45deg);
  transition: transform 0.15s ease;
}
.pg__acc[open] .pg__acc-head::after { transform: rotate(-135deg); }
.pg__acc-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid var(--ac-border);
}
.pg__range { accent-color: var(--g-primary, #1d4ed8); }
.pg__hint {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--ac-muted);
}
.pg__hint code {
  font-size: 11px;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: 4px;
  padding: 1px 4px;
  word-break: break-all;
}
.pg__demo-form {
  border: 1px dashed var(--g-primary, #1d4ed8);
  background: color-mix(in srgb, var(--g-primary, #1d4ed8) 6%, transparent);
  color: var(--g-primary, #1d4ed8);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}
.pg__demo-form:hover { background: color-mix(in srgb, var(--g-primary, #1d4ed8) 12%, transparent); }
.pg__field { display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; }
.pg__field--row { flex-direction: row; align-items: center; gap: 8px; cursor: pointer; }
.pg__field input[type='checkbox'] { accent-color: var(--g-primary, #1d4ed8); }
.pg__select, .pg__input {
  border: 1px solid var(--ac-border);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.82rem;
  background: var(--ac-surface);
  color: inherit;
}
.pg__color {
  width: 48px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--ac-border);
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.pg__reset {
  margin-top: auto;
  border: 1px solid var(--ac-border);
  background: transparent;
  color: inherit;
  border-radius: 8px;
  padding: 8px;
  font-size: 0.82rem;
  cursor: pointer;
}
.pg__reset:hover { border-color: var(--g-primary, #1d4ed8); color: var(--g-primary, #1d4ed8); }

/* 右侧主区 */
.pg__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  gap: 12px;
}
.pg__tabs { display: flex; gap: 8px; }
.pg__tab {
  border: 1px solid var(--ac-border);
  background: transparent;
  color: var(--ac-muted);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 0.82rem;
  cursor: pointer;
}
.pg__tab--on { color: var(--g-primary, #1d4ed8); border-color: var(--g-primary, #1d4ed8); font-weight: 600; }

.pg__preview {
  flex: 1;
  min-height: 0;
  display: flex;
  border: 1px solid var(--ac-border);
  border-radius: 12px;
  overflow: hidden;
}
/* CopilotProvider 渲染的 .ac-root 中间层需要撑满预览区 */
.pg__preview :deep(.ac-root) {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.pg__chat-frame { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.pg__chat-frame :deep(.ac-chat) { height: 100%; }
.pg__wb-frame { flex: 1; min-height: 0; }

.pg__code {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--ac-border);
  border-radius: 12px;
  background: #0f172a;
}
.pg__code pre { margin: 0; padding: 20px; color: #e2e8f0; font-size: 0.82rem; line-height: 1.6; font-family: ui-monospace, monospace; }
.pg__copy {
  position: absolute;
  top: 10px;
  right: 10px;
  border: 1px solid rgb(255 255 255 / 0.2);
  background: rgb(255 255 255 / 0.08);
  color: #e2e8f0;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 0.76rem;
  cursor: pointer;
}
.pg__copy:hover { background: rgb(255 255 255 / 0.16); }

@media (max-width: 860px) {
  .pg { flex-direction: column; }
  .pg__form {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--ac-border);
    max-height: 45vh;
  }
}
</style>
