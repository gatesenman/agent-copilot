package com.odagent.copilot.pipeline;

import com.odagent.copilot.protocol.AgentEvent;
import com.odagent.copilot.protocol.RunRequest;
import reactor.core.publisher.Sinks;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 一次 Agent 运行的上下文（US-014 Pipeline Orchestrator 的 runtime state）。
 *
 * <p>HITL 采用「检查点挂起」模型（与前端 BrowserAgentRuntime 一致）：
 * 触发 INTERRUPT 后当前 SSE 流结束，检查点保存在本对象中；
 * /resume 会换一个新的 sink 继续发事件，从检查点恢复 ReAct 循环。</p>
 */
public class RunContext {

  public final String runId;
  public final RunRequest request;
  public final AtomicBoolean cancelled = new AtomicBoolean(false);

  /** 当前 SSE 下游。resume 时由 Controller 置换。 */
  public volatile Sinks.Many<AgentEvent> sink = Sinks.many().unicast().onBackpressureBuffer();

  // ---------- HITL 检查点 ----------
  /** ReAct 对话消息（含 assistant tool_calls 与 tool 结果），恢复时继续使用 */
  public final List<Map<String, Object>> llmMessages = new ArrayList<>();
  /** 已完成的 ReAct 轮数 */
  public volatile int iteration = 0;
  /** 待审批的工具调用：{id, name, label, args} */
  public volatile Map<String, Object> pendingToolCall;
  public volatile String pendingInterruptId;

  public RunContext(RunRequest request) {
    this.request = request;
    this.runId = request.runId() != null && !request.runId().isBlank()
        ? request.runId()
        : "run_" + UUID.randomUUID();
  }

  /** resume 时创建新的下游流 */
  public void renewSink() {
    this.sink = Sinks.many().unicast().onBackpressureBuffer();
  }

  public void emit(String type, Object data) {
    sink.tryEmitNext(AgentEvent.of(type, runId, data));
  }

  public void complete() {
    sink.tryEmitComplete();
  }
}
