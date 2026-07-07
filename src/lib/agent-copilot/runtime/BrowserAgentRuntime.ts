/**
 * BrowserAgentRuntime — 浏览器内运行时（演示/预览模式）
 *
 * 在浏览器中直连硅基流动 OpenAI 兼容 API，并内置一个 TypeScript 版
 * AgentScope 5+1 流水线模拟器（US-008 输入理解 → US-009 本体推理 →
 * US-010 就绪门 → US-011 ReAct 执行 → US-013 输出管理，US-012 治理钩子横切），
 * 使组件全部能力可以在没有 Java 后端的情况下完整演示。
 *
 * 生产环境请使用 HttpAgentRuntime 对接 Java Spring Boot 后端。
 */
import type {
  AgentEvent, AgentRuntime, CopilotActionDef, GateDecisionState,
  GovernanceEvent, InterruptResponse, PipelineStageId, RunInput, StructuredPayload,
} from '../types'
import { genId, STAGE_LABELS } from '../types'
import { LlmClient, type LlmMessage, type LlmToolDef } from './llm-client'

/** 模型适配器最小接口（与 protocols/types.ts 的 ModelAdapter 一致，避免循环依赖在此重复声明） */
interface ModelAdapterLike {
  chatStream: LlmClient['chatStream']
  chatOnce: LlmClient['chatOnce']
}

interface BrowserRuntimeOptions {
  apiBase: string
  apiKey: string
  model: string
  /** 高影响动作是否需要 HITL 审批 */
  approvalMode?: 'auto' | 'gate' | 'always'
  /** gate 模式下强制需要审批的工具名列表（与 action.requiresApproval 合并） */
  gateTools?: string[]
  maxIterations?: number
  /**
   * 可插拔模型适配器（协议层注入：anthropic / gemini / ollama-native / cohere 等）。
   * 不传时默认用 OpenAI 兼容 LlmClient（向后兼容）。
   */
  modelAdapter?: ModelAdapterLike
}

interface PendingInterrupt {
  runId: string
  toolCall: { id: string; name: string; args: Record<string, unknown> }
  /** 恢复执行的续延 */
  resume: (resp: InterruptResponse) => void
}

export class BrowserAgentRuntime implements AgentRuntime {
  readonly kind = 'browser' as const
  private client: ModelAdapterLike
  private pendingInterrupts = new Map<string, PendingInterrupt>()
  private cancelled = new Set<string>()
  /** 中断时保存的运行现场，resume 时恢复 */
  private suspendedRuns = new Map<string, {
    input: RunInput
    llmMessages: LlmMessage[]
    iteration: number
  }>()

  constructor(private opts: BrowserRuntimeOptions) {
    this.client = opts.modelAdapter ?? new LlmClient({
      apiBase: opts.apiBase,
      apiKey: opts.apiKey,
      model: opts.model,
    })
  }

  async cancel(_sessionId: string, runId: string): Promise<void> {
    this.cancelled.add(runId)
  }

  async *run(input: RunInput): AsyncIterable<AgentEvent> {
    yield* this.executePipeline(input, null)
  }

  async *resume(
    _sessionId: string,
    runId: string,
    response: InterruptResponse,
    _signal?: AbortSignal,
  ): AsyncIterable<AgentEvent> {
    const suspended = this.suspendedRuns.get(runId)
    if (!suspended) {
      yield this.ev('RUN_ERROR', runId, { message: '找不到可恢复的运行现场' })
      return
    }
    this.suspendedRuns.delete(runId)
    yield* this.executePipeline(suspended.input, {
      response,
      llmMessages: suspended.llmMessages,
      iteration: suspended.iteration,
    })
  }

  // ============ 核心流水线 ============

  private async *executePipeline(
    input: RunInput,
    resumeCtx: { response: InterruptResponse; llmMessages: LlmMessage[]; iteration: number } | null,
  ): AsyncIterable<AgentEvent> {
    const { runId } = input
    const t = () => Date.now()

    try {
      if (!resumeCtx) {
        yield this.ev('RUN_STARTED', runId, { sessionId: input.sessionId })

        // ---- US-012 治理钩子: pre_pipeline ----
        yield this.governance(runId, 'pre_pipeline', 'info', 'GOV-AUTH', '会话身份与权限校验通过（演示模式默认放行）')

        const userMessage = [...input.messages].reverse().find((m) => m.role === 'user')?.content ?? ''

        // ---- US-008 输入理解 ----
        yield this.ev('STAGE_STARTED', runId, { stage: 'input_understanding' })
        const understanding = await this.stageInputUnderstanding(userMessage, input)
        if (this.cancelled.has(runId)) { yield this.cancelEvent(runId); return }
        yield this.ev('STAGE_FINISHED', runId, {
          stage: 'input_understanding',
          status: 'succeeded',
          summary: `意图: ${understanding.intent} · 实体: ${understanding.entities.join('、') || '无'}`,
          detail: understanding,
        })
        yield this.governance(runId, 'post_stage', 'info', 'GOV-STAGE', `US-008 完成，意图分类: ${understanding.intent}`)

        // ---- US-009 本体推理 ----
        yield this.ev('STAGE_STARTED', runId, { stage: 'ontology_reasoning' })
        const ontologyCtx = this.stageOntologyReasoning(understanding, input)
        yield this.ev('STAGE_FINISHED', runId, {
          stage: 'ontology_reasoning',
          status: 'succeeded',
          summary: `命中对象: ${ontologyCtx.matchedObjects.join('、') || '通用对话'} · 规则 ${ontologyCtx.rules.length} 条`,
          detail: ontologyCtx,
        })

        // ---- US-010 就绪门 ----
        yield this.ev('STAGE_STARTED', runId, { stage: 'readiness_gate' })
        const gate = this.stageReadinessGate(understanding, ontologyCtx, input)
        yield this.ev('GATE_DECISION', runId, gate)
        yield this.ev('STAGE_FINISHED', runId, {
          stage: 'readiness_gate',
          status: gate.decision === 'REJECT' ? 'blocked' : 'succeeded',
          summary: `决策: ${gate.decision} · ${gate.reasons[0] ?? ''}`,
          detail: gate,
        })

        if (gate.decision === 'REJECT') {
          yield this.governance(runId, 'pre_output', 'block', 'GOV-GATE', `就绪门拒绝执行: ${gate.reasons.join('；')}`)
          yield* this.emitAssistantText(runId, `很抱歉，该请求未通过执行就绪检查：\n\n${gate.reasons.map((r) => `- ${r}`).join('\n')}\n\n请调整后重试。`)
          yield this.ev('RUN_FINISHED', runId, {})
          return
        }

        // ---- US-011 ReAct 执行 ----
        yield this.ev('STAGE_STARTED', runId, { stage: 'react_execution' })
        const llmMessages = this.buildLlmMessages(input, understanding, ontologyCtx, gate)
        yield* this.reactLoop(input, llmMessages, 0)
      } else {
        // ---- HITL 恢复 ----
        const pending = this.pendingInterrupts.get(resumeCtx.response.interruptId)
        this.pendingInterrupts.delete(resumeCtx.response.interruptId)
        const llmMessages = resumeCtx.llmMessages
        const tc = pending?.toolCall

        if (tc) {
          if (resumeCtx.response.approved) {
            yield this.governance(runId, 'pre_tool', 'info', 'GOV-HITL', `用户已批准执行「${tc.name}」`)
            const rawResult = await this.execTool(input, tc.name, tc.args)
            const { payloads, llmResult } = this.extractPayloads(rawResult)
            yield this.ev('TOOL_CALL_RESULT', runId, { toolCallId: tc.id, name: tc.name, result: llmResult, status: 'succeeded' })
            for (const p of payloads) {
              yield this.ev('STRUCTURED_PAYLOAD', runId, p)
            }
            yield this.ev('REACT_STEP', runId, { type: 'observation', content: this.truncate(JSON.stringify(llmResult)) })
            llmMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(llmResult ?? null) })
          } else {
            yield this.governance(runId, 'pre_tool', 'warn', 'GOV-HITL', `用户拒绝执行「${tc.name}」${resumeCtx.response.comment ? `：${resumeCtx.response.comment}` : ''}`)
            yield this.ev('TOOL_CALL_RESULT', runId, { toolCallId: tc.id, name: tc.name, status: 'rejected' })
            llmMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ rejected: true, reason: resumeCtx.response.comment || '用户拒绝了该操作' }),
            })
          }
        }
        yield* this.reactLoop(input, llmMessages, resumeCtx.iteration)
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        yield this.cancelEvent(runId)
        return
      }
      yield this.governance(runId, 'on_error', 'block', 'GOV-ERR', `运行异常: ${err?.message ?? String(err)}`)
      yield this.ev('RUN_ERROR', runId, { message: err?.message ?? String(err) })
    }
  }

  // ============ ReAct 循环（US-011） ============

  private async *reactLoop(
    input: RunInput,
    llmMessages: LlmMessage[],
    startIteration: number,
  ): AsyncIterable<AgentEvent> {
    const { runId } = input
    const maxIter = this.opts.maxIterations ?? 8
    let usage: any = null

    for (let iteration = startIteration; iteration < maxIter; iteration++) {
      if (this.cancelled.has(runId)) { yield this.cancelEvent(runId); return }

      const tools = this.buildToolDefs(input.actions)
      let textBuffer = ''
      let messageId: string | null = null
      const toolCallAcc = new Map<number, { id: string; name: string; args: string }>()
      let finishReason: string | undefined

      for await (const chunk of this.client.chatStream({
        messages: llmMessages,
        tools,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        signal: input.signal,
      })) {
        if (this.cancelled.has(runId)) { yield this.cancelEvent(runId); return }

        if (chunk.usage) usage = chunk.usage

        if (chunk.delta) {
          if (!messageId) {
            messageId = genId('msg')
            yield this.ev('TEXT_MESSAGE_START', runId, { messageId })
          }
          textBuffer += chunk.delta
          yield this.ev('TEXT_DELTA', runId, { messageId, delta: chunk.delta })
        }

        if (chunk.toolCallDelta) {
          const d = chunk.toolCallDelta
          const acc = toolCallAcc.get(d.index) ?? { id: '', name: '', args: '' }
          if (d.id) acc.id = d.id
          if (d.name) acc.name = d.name
          if (d.argumentsDelta) acc.args += d.argumentsDelta
          toolCallAcc.set(d.index, acc)
        }

        if (chunk.finishReason) finishReason = chunk.finishReason
      }

      if (messageId) {
        yield this.ev('TEXT_MESSAGE_END', runId, { messageId })
      }

      // 无工具调用 → final
      if (finishReason !== 'tool_calls' || toolCallAcc.size === 0) {
        if (textBuffer) {
          yield this.ev('REACT_STEP', runId, { type: 'final', content: this.truncate(textBuffer) })
        }
        yield this.ev('STAGE_FINISHED', runId, {
          stage: 'react_execution',
          status: 'succeeded',
          summary: `完成，共 ${iteration + 1} 轮推理`,
        })

        // ---- US-013 输出管理 ----
        yield this.ev('STAGE_STARTED', runId, { stage: 'output_management' })
        yield this.governance(runId, 'pre_output', 'info', 'GOV-OUT', '输出内容合规检查通过')
        yield this.ev('STAGE_FINISHED', runId, {
          stage: 'output_management',
          status: 'succeeded',
          summary: '响应已组装（Markdown + 结构化载荷）',
        })

        if (usage) {
          yield this.ev('USAGE', runId, {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          })
        }
        yield this.ev('RUN_FINISHED', runId, {})
        return
      }

      // 有工具调用
      if (textBuffer) {
        yield this.ev('REACT_STEP', runId, { type: 'thought', content: this.truncate(textBuffer) })
      }

      // assistant 消息带 tool_calls 追加到历史
      const assistantToolCalls = [...toolCallAcc.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => ({
          id: v.id || genId('tc'),
          type: 'function' as const,
          function: { name: v.name, arguments: v.args || '{}' },
        }))
      llmMessages.push({ role: 'assistant', content: textBuffer || '', tool_calls: assistantToolCalls })

      for (const tc of assistantToolCalls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(tc.function.arguments || '{}') } catch { /* 忽略解析失败 */ }

        const action = input.actions.find((a) => a.name === tc.function.name)
        const label = action?.label ?? tc.function.name

        yield this.ev('REACT_STEP', runId, { type: 'action', content: `调用工具 ${label}(${this.truncate(JSON.stringify(args), 120)})`, toolCallId: tc.id })
        yield this.ev('TOOL_CALL_START', runId, {
          toolCallId: tc.id, name: tc.function.name, label,
          origin: 'frontend',
        })
        yield this.ev('TOOL_CALL_ARGS', runId, { toolCallId: tc.id, args })

        // ---- US-012 治理钩子: pre_tool + HITL 判定 ----
        const needsApproval = this.needsApproval(action)
        if (needsApproval) {
          yield this.governance(runId, 'pre_tool', 'warn', 'RULE-006', `「${label}」为高影响动作，需要用户确认`)

          const interruptId = genId('itr')
          // 保存现场
          this.suspendedRuns.set(runId, { input, llmMessages, iteration })
          this.pendingInterrupts.set(interruptId, {
            runId,
            toolCall: { id: tc.id, name: tc.function.name, args },
            resume: () => {},
          })

          yield this.ev('TOOL_CALL_RESULT', runId, { toolCallId: tc.id, name: tc.function.name, status: 'awaiting_approval' })
          yield this.ev('INTERRUPT', runId, {
            id: interruptId,
            runId,
            kind: 'approval',
            title: `确认执行：${label}`,
            description: action?.description,
            action: { name: tc.function.name, label, args },
            timestamp: Date.now(),
          })
          // 挂起：等待 resume() 被调用
          return
        }

        yield this.governance(runId, 'pre_tool', 'info', 'GOV-TOOL', `工具「${label}」参数校验通过`)

        try {
          const rawResult = await this.execTool(input, tc.function.name, args)
          const { payloads, llmResult } = this.extractPayloads(rawResult)
          yield this.ev('TOOL_CALL_RESULT', runId, { toolCallId: tc.id, name: tc.function.name, result: llmResult, status: 'succeeded' })
          for (const p of payloads) {
            yield this.ev('STRUCTURED_PAYLOAD', runId, p)
          }
          yield this.ev('REACT_STEP', runId, { type: 'observation', content: this.truncate(JSON.stringify(llmResult)) })
          yield this.governance(runId, 'post_tool', 'info', 'GOV-TOOL', `工具「${label}」执行成功`)
          llmMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(llmResult ?? null) })
        } catch (err: any) {
          const msg = err?.message ?? String(err)
          yield this.ev('TOOL_CALL_RESULT', runId, { toolCallId: tc.id, name: tc.function.name, error: msg, status: 'failed' })
          yield this.ev('REACT_STEP', runId, { type: 'observation', content: `工具执行失败: ${msg}` })
          yield this.governance(runId, 'post_tool', 'warn', 'GOV-TOOL', `工具「${label}」执行失败: ${msg}`)
          llmMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: msg }) })
        }
      }
    }

    // 达到最大迭代
    yield this.governance(runId, 'post_stage', 'warn', 'GOV-LOOP', `已达最大推理轮数(${maxIter})，强制结束`)
    yield* this.emitAssistantText(runId, '已达到最大推理轮数，任务未能完全完成。请尝试将问题拆分后重新提问。')
    yield this.ev('STAGE_FINISHED', runId, { stage: 'react_execution', status: 'failed', summary: '达到最大迭代轮数' })
    yield this.ev('RUN_FINISHED', runId, {})
  }

  // ============ US-008 输入理解 ============

  private async stageInputUnderstanding(userMessage: string, input: RunInput) {
    const fallback = { intent: '通用对话', entities: [] as string[], conditions: {} as Record<string, string>, completeness: 'complete' }
    if (!userMessage.trim()) return fallback

    try {
      const raw = await this.client.chatOnce({
        messages: [
          {
            role: 'system',
            content:
              '你是业务意图理解模块。分析用户输入，输出 JSON：' +
              '{"intent":"查询|筛选|统计|校验|创建|修改|删除|发布|撤回|审批|对比|推荐|指派|查询执行状态|解释规则|通用对话",' +
              '"entities":["提到的业务对象/编号/人员等"],"conditions":{"条件名":"条件值"},' +
              '"completeness":"complete|needs_clarification"}。只输出 JSON。',
          },
          { role: 'user', content: userMessage },
        ],
        jsonMode: true,
        maxTokens: 400,
        signal: input.signal,
      })
      const parsed = JSON.parse(raw)
      return {
        intent: parsed.intent ?? fallback.intent,
        entities: Array.isArray(parsed.entities) ? parsed.entities.map(String) : [],
        conditions: parsed.conditions ?? {},
        completeness: parsed.completeness ?? 'complete',
      }
    } catch {
      return fallback
    }
  }

  // ============ US-009 本体推理（基于注入的 readable 本体上下文做轻量匹配） ============

  private stageOntologyReasoning(
    understanding: { intent: string; entities: string[] },
    input: RunInput,
  ) {
    const ontologyReadable = input.readables.find((r) => r.description.includes('本体'))
    const ontology: any = ontologyReadable?.value

    const matchedObjects: string[] = []
    const rules: { id: string; condition: string }[] = []
    const relationPaths: string[] = []

    if (ontology?.objectTypes) {
      const text = `${understanding.intent} ${understanding.entities.join(' ')}`
      for (const obj of ontology.objectTypes) {
        const names: string[] = [obj.name, ...(obj.synonyms ?? [])]
        if (names.some((n) => text.includes(n))) {
          matchedObjects.push(obj.name)
        }
      }
      for (const rule of ontology.rules ?? []) {
        if (matchedObjects.length > 0 || ['创建', '修改', '删除', '生成订单', '审批', '发布', '撤回'].includes(understanding.intent)) {
          rules.push({ id: rule.id, condition: rule.condition })
        }
      }
      for (const rel of ontology.relationships ?? []) {
        if (matchedObjects.includes(rel.from) || matchedObjects.includes(rel.to)) {
          relationPaths.push(`${rel.from} —[${rel.name}]→ ${rel.to}`)
        }
      }
    }

    return { matchedObjects, rules, relationPaths, ontologyVersion: ontology?.version ?? 'N/A' }
  }

  // ============ US-010 就绪门 ============

  private stageReadinessGate(
    understanding: { intent: string; completeness: string },
    ontologyCtx: { matchedObjects: string[]; rules: { id: string; condition: string }[] },
    input: RunInput,
  ): GateDecisionState {
    const reasons: string[] = []
    const missing: string[] = []

    // 演示规则：无 LLM Key → REJECT（防御）
    if (!this.opts.apiKey) {
      return { decision: 'REJECT', reasons: ['LLM API Key 未配置'], confidence: 1 }
    }

    if (understanding.completeness === 'needs_clarification') {
      reasons.push('输入信息不完整，将在对话中向用户澄清')
      return { decision: 'CLARIFY', reasons, missing, confidence: 0.7 }
    }

    if (ontologyCtx.matchedObjects.length === 0 && !['通用对话', '解释规则'].includes(understanding.intent)) {
      reasons.push('未命中明确的本体对象，将以降级模式（通用能力+上下文）回答')
      return { decision: 'DEGRADE', reasons, confidence: 0.6 }
    }

    reasons.push(
      ontologyCtx.matchedObjects.length > 0
        ? `已命中本体对象「${ontologyCtx.matchedObjects.join('、')}」，工具与规则上下文就绪`
        : '通用对话请求，直接放行',
    )
    return { decision: 'GO', reasons, confidence: 0.92 }
  }

  // ============ 构建 LLM 消息 ============

  private buildLlmMessages(
    input: RunInput,
    understanding: any,
    ontologyCtx: any,
    gate: GateDecisionState,
  ): LlmMessage[] {
    const parts: string[] = []
    if (input.systemPrompt) parts.push(input.systemPrompt)

    if (input.readables.length > 0) {
      parts.push(
        '\n# 应用实时上下文（useCopilotReadable 注入）\n' +
        input.readables.map((r) => `## ${r.description}\n${JSON.stringify(r.value, null, 1)}`).join('\n'),
      )
    }
    if (input.additionalInstructions.length > 0) {
      parts.push('\n# 附加指令\n' + input.additionalInstructions.map((s) => `- ${s}`).join('\n'))
    }
    parts.push(
      '\n# 流水线上下文\n' +
      `- 意图识别(US-008): ${understanding.intent}；实体: ${understanding.entities.join('、') || '无'}\n` +
      `- 本体命中(US-009): ${ontologyCtx.matchedObjects.join('、') || '无'}；关系路径: ${ontologyCtx.relationPaths.join('；') || '无'}\n` +
      `- 适用规则: ${ontologyCtx.rules.map((r: any) => `${r.id}(${r.condition})`).join('；') || '无'}\n` +
      `- 就绪门(US-010): ${gate.decision} — ${gate.reasons.join('；')}`,
    )
    parts.push(
      '\n# 工具调用要求（最高优先级）\n- 需要查询或操作数据时，必须直接通过 function calling 机制调用工具，一次只调用一个工具，等待结果后再决定下一步。\n- 严禁在回复文本中书写工具名、JSON 参数或"我将调用XX工具"之类的计划描述——直接调用即可。\n- 严禁在未收到工具真实返回结果的情况下声称"创建成功""已完成"等——任何创建/修改类操作都必须真正调用对应工具并等待返回。\n- 工具返回结果后，用自然语言总结结果，不要原样粘贴 JSON。',
    )
    parts.push(
      '\n# 输出要求\n- 使用 Markdown 回复，重要数据用表格呈现。\n- 引用单号时使用行内代码格式。\n- 执行了工具后，回复中说明：意图识别结果、命中对象、执行的动作、结果和下一步建议。',
    )

    const msgs: LlmMessage[] = [{ role: 'system', content: parts.join('\n') }]
    for (const m of input.messages) {
      if (m.role === 'user' || (m.role === 'assistant' && !m.streaming && m.content)) {
        msgs.push({ role: m.role, content: m.content })
      }
    }
    return msgs
  }

  private buildToolDefs(actions: CopilotActionDef[]): LlmToolDef[] {
    return actions.map((a) => ({
      type: 'function',
      function: {
        name: a.name,
        description: a.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            (a.parameters ?? []).map((p) => [
              p.name,
              {
                type: p.type === 'array' ? 'array' : p.type,
                description: p.description,
                ...(p.enum ? { enum: p.enum } : {}),
                ...(p.type === 'array' ? { items: { type: 'string' } } : {}),
              },
            ]),
          ),
          required: (a.parameters ?? []).filter((p) => p.required).map((p) => p.name),
        },
      },
    }))
  }

  private needsApproval(action?: CopilotActionDef): boolean {
    const mode = this.opts.approvalMode ?? 'gate'
    if (mode === 'auto') return false
    if (mode === 'always') return true
    if (action && this.opts.gateTools?.includes(action.name)) return true
    return !!action?.requiresApproval
  }

  private async execTool(input: RunInput, name: string, args: Record<string, unknown>): Promise<unknown> {
    const action = input.actions.find((a) => a.name === name)
    if (!action) throw new Error(`未注册的工具: ${name}`)
    if (!action.handler) throw new Error(`工具 ${name} 没有 handler`)
    return await action.handler(args)
  }

  /**
   * 从工具返回值中提取 __payload / __payloads 字段（AG-UI 生成式 UI 约定）：
   * handler 返回 { __payload: { type: 'chart', title, data }, ...其余给 LLM 的数据 }
   * 运行时自动发出 STRUCTURED_PAYLOAD 事件，其余部分作为工具结果继续给模型。
   */
  private extractPayloads(result: unknown): { payloads: StructuredPayload[]; llmResult: unknown } {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return { payloads: [], llmResult: result }
    }
    const obj = result as Record<string, unknown>
    const payloads: StructuredPayload[] = []
    const single = obj.__payload as StructuredPayload | undefined
    const multi = obj.__payloads as StructuredPayload[] | undefined
    if (single && typeof single === 'object' && 'type' in single) payloads.push(single)
    if (Array.isArray(multi)) {
      for (const p of multi) if (p && typeof p === 'object' && 'type' in p) payloads.push(p)
    }
    if (payloads.length === 0) return { payloads, llmResult: result }
    const { __payload: _p, __payloads: _ps, ...rest } = obj
    // 若剥离载荷后为空对象，给 LLM 一个简要确认，避免空结果
    const llmResult = Object.keys(rest).length > 0 ? rest : { ok: true, rendered: payloads.map((p) => p.type) }
    return { payloads, llmResult }
  }

  // ============ 事件工具 ============

  private ev(type: AgentEvent['type'], runId: string, data: unknown): AgentEvent {
    return { type, runId, timestamp: Date.now(), data }
  }

  private governance(
    runId: string,
    hook: GovernanceEvent['hook'],
    severity: GovernanceEvent['severity'],
    rule: string,
    message: string,
  ): AgentEvent {
    return this.ev('GOVERNANCE_EVENT', runId, {
      id: genId('gov'), hook, severity, rule, message, timestamp: Date.now(),
    } satisfies GovernanceEvent)
  }

  private cancelEvent(runId: string): AgentEvent {
    this.cancelled.delete(runId)
    return this.ev('RUN_FINISHED', runId, { cancelled: true })
  }

  private async *emitAssistantText(runId: string, text: string): AsyncIterable<AgentEvent> {
    const messageId = genId('msg')
    yield this.ev('TEXT_MESSAGE_START', runId, { messageId })
    yield this.ev('TEXT_DELTA', runId, { messageId, delta: text })
    yield this.ev('TEXT_MESSAGE_END', runId, { messageId })
  }

  private truncate(s: string, n = 300): string {
    return s.length > n ? s.slice(0, n) + '…' : s
  }
}
