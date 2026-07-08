<script setup lang="ts">
/**
 * 通用企业组件演示：会话列表 / 模板库 / 模型切换 / 用量 / 对比 / 反馈 /
 * 安全拦截 / 文件上传 / 语音波形 / 引用溯源。
 */
import { reactive, ref } from 'vue'
import DemoKnobs, { type KnobDef } from './DemoKnobs.vue'
import SessionList from '../../lib/agent-copilot/components/general/SessionList.vue'
import PromptLibrary from '../../lib/agent-copilot/components/general/PromptLibrary.vue'
import ModelSelector from '../../lib/agent-copilot/components/general/ModelSelector.vue'
import UsageMeter from '../../lib/agent-copilot/components/general/UsageMeter.vue'
import CompareView from '../../lib/agent-copilot/components/general/CompareView.vue'
import FeedbackDialog from '../../lib/agent-copilot/components/general/FeedbackDialog.vue'
import SafetyBanner from '../../lib/agent-copilot/components/general/SafetyBanner.vue'
import FileDropzone from '../../lib/agent-copilot/components/general/FileDropzone.vue'
import SourcePanel from '../../lib/agent-copilot/components/general/SourcePanel.vue'
import PayloadCard from '../../lib/agent-copilot/components/generative-ui/PayloadCard.vue'
import VoiceRecorderBar from '../../lib/agent-copilot/components/input/VoiceRecorderBar.vue'
import { sampleAudio, sampleVideo } from './payload-samples'
import type { SessionItem } from '../../lib/agent-copilot/components/general/SessionList.vue'
import type { PromptTemplate } from '../../lib/agent-copilot/components/general/PromptLibrary.vue'
import type { UploadingFile } from '../../lib/agent-copilot/components/general/FileDropzone.vue'
import type { SourceChunk } from '../../lib/agent-copilot/components/general/SourcePanel.vue'

// ============ 属性控制（DemoKnobs） ============
const K = reactive({
  sessions: { searchable: true, creatable: true },
  usage: { compact: false, quota: 128000 },
  compare: { votable: true },
  safety: { level: 'blocked', appealable: true },
  dropzone: { disabled: false, maxFiles: 6, maxSizeMb: 20 },
  prompts: { emptyText: '没有匹配的模板' },
  sources: { title: '引用来源' },
  recorder: { paused: false },
})

const C: Record<keyof typeof K, KnobDef[]> = {
  sessions: [
    { key: 'searchable', label: 'searchable', type: 'boolean' },
    { key: 'creatable', label: 'creatable', type: 'boolean' },
  ],
  usage: [
    { key: 'compact', label: 'compact', type: 'boolean' },
    { key: 'quota', label: 'quota', type: 'number', min: 0, max: 512000, step: 1000 },
  ],
  compare: [{ key: 'votable', label: 'votable', type: 'boolean' }],
  safety: [
    { key: 'level', label: 'level', type: 'select', options: [{ value: 'info', label: 'info' }, { value: 'warning', label: 'warning' }, { value: 'blocked', label: 'blocked' }] },
    { key: 'appealable', label: 'appealable', type: 'boolean' },
  ],
  dropzone: [
    { key: 'disabled', label: 'disabled', type: 'boolean' },
    { key: 'maxFiles', label: 'maxFiles', type: 'number', min: 1, max: 20 },
    { key: 'maxSizeMb', label: 'maxSizeMb', type: 'number', min: 1, max: 100 },
  ],
  prompts: [{ key: 'emptyText', label: 'emptyText', type: 'text' }],
  sources: [{ key: 'title', label: 'title', type: 'text' }],
  recorder: [{ key: 'paused', label: 'paused', type: 'boolean' }],
}

// ---- 录音条 ----
const recMsg = ref('等待操作')

// ---- 会话列表 ----
const now = Date.now()
const sessions = ref<SessionItem[]>([
  { id: 's1', title: '年度方案对比分析', preview: '已生成 3 个候选方案对比表…', updatedAt: now - 30 * 60_000, pinned: true },
  { id: 's2', title: 'PO-2026-0612 交期跟进', preview: '台风影响海运，建议切换陆运', updatedAt: now - 3 * 3600_000, unread: 2 },
  { id: 's3', title: '差旅报销流程咨询', preview: '差旅报销分为 4 步…', updatedAt: now - 26 * 3600_000 },
  { id: 's4', title: 'Q2 运营指标分析', preview: '核心指标环比上升 12%…', updatedAt: now - 6 * 86400_000 },
])
const activeSession = ref('s1')

// ---- 提示模板库 ----
const templates: PromptTemplate[] = [
  { id: 't1', title: '方案对比', category: '通用', content: '请对比 {方案A} 和 {方案B} 在 {维度} 上的成本、周期与风险', description: '生成结构化对比表' },
  { id: 't2', title: '合同风险审查', category: '合规', content: '审查以下合同条款的风险点：{合同条款}', description: '识别付款/违约/知识产权风险' },
  { id: 't3', title: '周报生成', category: '效率', content: '根据以下工作记录生成本周周报：{工作记录}', description: '按项目分组汇总' },
  { id: 't4', title: 'SQL 生成', category: '数据', content: '基于 orders 表生成查询：{查询需求}', description: '自动带上库表结构上下文' },
]

// ---- 模型切换 ----
const model = ref('siliconflow')

// ---- 双模型对比 ----
const voted = ref<'left' | 'right' | 'tie' | undefined>(undefined)

// ---- 反馈弹窗 ----
const feedbackOpen = ref(false)
const feedbackResult = ref('')

function onFeedbackSubmit(p: { reasons: string[]; comment: string }) {
  const suffix = p.comment ? `：${p.comment}` : ''
  feedbackResult.value = `${p.reasons.join('、')}${suffix}`
  feedbackOpen.value = false
}

// ---- 文件上传 ----
const files = ref<UploadingFile[]>([
  { id: 'f1', name: '项目资料包.pdf', size: 2.4 * 1024 * 1024, progress: 100 },
  { id: 'f2', name: '合同草案-v3.docx', size: 800 * 1024, progress: 65 },
])

// ---- 引用溯源 ----
const sources: SourceChunk[] = [
  { id: 'c1', title: '费用管理制度（2026 修订版）', snippet: '单笔金额超过 50 万元的支出需走集中审批流程，审批层级不少于 3 级……', score: 0.92, location: '知识库/制度/费用管理.pdf · 第 12 页' },
  { id: 'c2', title: '数据安全规范', snippet: '核心系统数据需分级存储，敏感字段必须加密落盘，且近两年无重大数据事故……', score: 0.87, location: '知识库/安全/数据规范.docx' },
  { id: 'c3', title: '2026 Q2 供应链报告', snippet: '动力电池品类供应集中度偏高，建议引入第二供应源以降低断供风险……', score: 0.79, location: '知识库/报告/Q2.pdf · 第 3 页' },
]

function onUpload(list: File[]) {
  for (const f of list) {
    files.value.push({ id: `f_${Date.now()}_${f.name}`, name: f.name, size: f.size, progress: 100 })
  }
}
</script>

<template>
  <div class="ent-pane">
    <div class="ent-grid">
      <section class="g-section">
        <h2>SessionList — 会话历史</h2>
        <p class="g-desc">按 今天/本周/更早 分组，支持置顶、重命名、删除、未读角标与搜索。</p>
        <DemoKnobs :controls="C.sessions" :state="K.sessions" />
        <div class="ent-frame ent-frame--tall">
          <SessionList
            :sessions="sessions"
            :active-id="activeSession"
            :searchable="K.sessions.searchable"
            :creatable="K.sessions.creatable"
            @select="(id: string) => (activeSession = id)"
            @create="sessions.unshift({ id: `s_${Date.now()}`, title: '新会话', updatedAt: Date.now() })"
            @delete="(id: string) => (sessions = sessions.filter((s) => s.id !== id))"
            @rename="(id: string, title: string) => { const s = sessions.find((x) => x.id === id); if (s) s.title = title }"
            @pin="(id: string, pinned: boolean) => { const s = sessions.find((x) => x.id === id); if (s) s.pinned = pinned }"
          />
        </div>
      </section>

      <section class="g-section">
        <h2>PromptLibrary — 提示模板库</h2>
        <p class="g-desc">分类浏览 + 搜索，选择后由宿主把模板填入输入框（{变量} 占位）。</p>
        <DemoKnobs :controls="C.prompts" :state="K.prompts" />
        <div class="ent-frame ent-frame--tall">
          <PromptLibrary :templates="templates" :empty-text="K.prompts.emptyText" />
        </div>
      </section>
    </div>

    <div class="ent-grid">
      <section class="g-section">
        <h2>ModelSelector + UsageMeter</h2>
        <p class="g-desc">厂商/模型切换（读协议预设）与 Token 用量、成本估算。</p>
        <DemoKnobs :controls="C.usage" :state="K.usage" />
        <div class="ent-stack">
          <ModelSelector v-model="model" />
          <UsageMeter
            :prompt-tokens="48200"
            :completion-tokens="12600"
            :quota="K.usage.quota"
            :compact="K.usage.compact"
            :prompt-price-per-k="0.004"
            :completion-price-per-k="0.016"
          />
        </div>
      </section>

    </div>

    <section class="g-section">
      <h2>CompareView — 双模型对比</h2>
      <p class="g-desc">同一问题两路回答并排渲染，支持投票（用于模型评估 / A-B 测试）。</p>
      <DemoKnobs :controls="C.compare" :state="K.compare" />
      <CompareView
        question="总结一下季度经营报告的三个关键风险"
        :votable="K.compare.votable"
        :left="{ label: 'DeepSeek-V3', content: '1. **进度风险**：关键路径依赖集中\n2. **资源风险**：核心人员负载过高\n3. **质量风险**：测试覆盖不足', latencyMs: 1840, tokens: 96 }"
        :right="{ label: 'Qwen2.5-72B', content: '关键风险包括：\n- 单点依赖，建议冗余备份策略\n- 需求变更频繁导致返工\n- 上线窗口与假期冲突', latencyMs: 2210, tokens: 88 }"
        :voted="voted"
        @vote="(v) => (voted = v)"
      />
    </section>

    <div class="ent-grid">
      <section class="g-section">
        <h2>SafetyBanner + FeedbackDialog</h2>
        <p class="g-desc">安全拦截提示（合规拒答样式）与点踩反馈弹窗。</p>
        <DemoKnobs :controls="C.safety" :state="K.safety" />
        <div class="ent-stack">
          <SafetyBanner
            :level="K.safety.level as 'info' | 'warning' | 'blocked'"
            title="该请求已被安全策略拦截"
            detail="检测到请求中包含未脱敏的员工银行账号，请移除敏感信息后重试。"
            policy="PII 检测"
            :appealable="K.safety.appealable"
          />
          <SafetyBanner
            level="warning"
            title="回答可能包含过时信息"
            detail="引用的制度文件版本为 2024 版，最新版本请以 OA ��告为准。"
            policy="时效性检查"
          />
          <button type="button" class="ent-btn" @click="feedbackOpen = true">打开反馈弹窗</button>
          <p v-if="feedbackResult" class="ent-result">上报内容：{{ feedbackResult }}</p>
        </div>
        <FeedbackDialog
          :open="feedbackOpen"
          @close="feedbackOpen = false"
          @submit="onFeedbackSubmit"
        />
      </section>

      <section class="g-section">
        <h2>FileDropzone — 拖拽上传</h2>
        <p class="g-desc">多文件、类型/大小校验、上传进度，由宿主接管实际上传。</p>
        <DemoKnobs :controls="C.dropzone" :state="K.dropzone" />
        <FileDropzone
          :files="files"
          accept=".pdf,.docx,.xlsx,image/*"
          :max-size-mb="K.dropzone.maxSizeMb"
          :max-files="K.dropzone.maxFiles"
          :disabled="K.dropzone.disabled"
          @add="onUpload"
          @remove="(id: string) => (files = files.filter((f) => f.id !== id))"
        />
      </section>
    </div>

    <section class="g-section">
      <h2>SourcePanel — 引用溯源</h2>
      <p class="g-desc">RAG 场景的引用片段面板：相关度评分、来源定位、点击展开原文。</p>
      <DemoKnobs :controls="C.sources" :state="K.sources" />
      <SourcePanel :sources="sources" :title="K.sources.title" />
    </section>

    <section class="g-section">
      <h2>多模态交互 — AudioCard / VideoCard / VoiceRecorderBar</h2>
      <p class="g-desc">
        语音消息播放卡（波形进度 / 倍速 / 转写折叠 / 下载）、视频回复卡（原生控件 / 下载）、录音中状态条（波形跳动 / 计时 / 取消 / 停止发送）。
        音视频经 PayloadCard 按 payload type 'audio' / 'video' 自动分发；录音条由 ChatInput 语音按钮触发后替换输入区展示。
      </p>
      <div class="ent-grid">
        <div class="ent-stack">
          <h3 class="ent-sub">AudioCard — 语音消息 / TTS 回复</h3>
          <PayloadCard :payload="sampleAudio" />
        </div>
        <div class="ent-stack">
          <h3 class="ent-sub">VideoCard — 视频回复</h3>
          <PayloadCard :payload="sampleVideo" />
        </div>
      </div>
      <div class="ent-stack" style="margin-top: 16px">
        <h3 class="ent-sub">VoiceRecorderBar — 录音中状态条（{{ recMsg }}）</h3>
        <DemoKnobs :controls="C.recorder" :state="K.recorder" />
        <VoiceRecorderBar
          :paused="K.recorder.paused"
          @cancel="recMsg = '已取消'"
          @stop="recMsg = '已停止并发送'"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.ent-pane {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.ent-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: start;
}
@media (min-width: 980px) {
  .ent-grid { grid-template-columns: 1fr 1fr; }
}
.ent-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ent-frame--tall {
  height: 420px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ac-border);
  border-radius: 12px;
  overflow: hidden;
}
.ent-voice {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ent-btn {
  align-self: flex-start;
  border: 1px solid var(--ac-border);
  background: var(--ac-surface);
  color: var(--ac-fg);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
}
.ent-btn:hover { border-color: var(--ac-primary); color: var(--ac-primary); }
.ent-result {
  margin: 0;
  font-size: 12.5px;
  color: var(--ac-muted);
}
.g-section h2 { font-size: 17px; margin: 0 0 6px; }
.ent-sub {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ac-fg);
  margin: 0 0 8px;
}
.g-desc {
  color: var(--ac-muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 12px;
}
</style>
