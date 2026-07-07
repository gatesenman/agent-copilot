package com.odagent.copilot.api;

import com.odagent.copilot.pipeline.PipelineOrchestrator;
import com.odagent.copilot.pipeline.RunContext;
import com.odagent.copilot.protocol.AgentEvent;
import com.odagent.copilot.protocol.CancelRequest;
import com.odagent.copilot.protocol.ResumeRequest;
import com.odagent.copilot.protocol.RunRequest;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;

/**
 * Agent 运行时 REST 接口。与前端 HttpAgentRuntime 协议对齐：
 *
 *  POST /api/agent/chat    -> 发起运行，SSE 返回 AgentEvent 流
 *  POST /api/agent/resume  -> HITL 审批恢复，SSE 返回后续 AgentEvent 流
 *  POST /api/agent/cancel  -> 取消运行
 *  GET  /api/agent/health  -> 健康检查
 *
 * HITL 采用「检查点挂起」模型：INTERRUPT 事件发出后首个 SSE 流结束，
 * RunContext（含 llmMessages 检查点）保留在 RunRegistry 中；
 * /resume 置换新 sink 并从检查点继续 ReAct 循环。
 */
@RestController
@RequestMapping("/api/agent")
public class AgentController {

  private final PipelineOrchestrator orchestrator;
  private final RunRegistry registry;

  public AgentController(PipelineOrchestrator orchestrator, RunRegistry registry) {
    this.orchestrator = orchestrator;
    this.registry = registry;
  }

  @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<AgentEvent>> chat(@RequestBody RunRequest request) {
    RunContext ctx = new RunContext(request);
    registry.register(ctx);
    orchestrator.run(ctx);
    return ctx.sink.asFlux()
        .map(this::toSse)
        .doFinally(sig -> {
          // 挂起等待审批的 run 不注销，等待 /resume
          if (ctx.pendingInterruptId == null) registry.remove(ctx.runId);
        });
  }

  @PostMapping(value = "/resume", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<AgentEvent>> resume(@RequestBody ResumeRequest req) {
    RunContext ctx = registry.get(req.runId());
    if (ctx == null || ctx.pendingInterruptId == null
        || !ctx.pendingInterruptId.equals(req.interruptId())) {
      return Flux.just(toSse(AgentEvent.of("RUN_ERROR",
          req.runId() == null ? "unknown" : req.runId(),
          Map.of("message", "运行不存在、已结束或中断 ID 不匹配"))));
    }
    ctx.renewSink();
    boolean approved = Boolean.TRUE.equals(req.approved());
    String feedback = req.comment() != null ? req.comment() : req.value();
    orchestrator.resume(ctx, approved, feedback);
    return ctx.sink.asFlux()
        .map(this::toSse)
        .doFinally(sig -> {
          if (ctx.pendingInterruptId == null) registry.remove(ctx.runId);
        });
  }

  @PostMapping("/cancel")
  public Map<String, Object> cancel(@RequestBody CancelRequest req) {
    RunContext ctx = registry.get(req.runId());
    if (ctx == null) return Map.of("ok", false, "error", "run 不存在或已结束");
    ctx.cancelled.set(true);
    ctx.emit("RUN_FINISHED", Map.of("outcome", "cancelled"));
    ctx.complete();
    registry.remove(ctx.runId);
    return Map.of("ok", true);
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    return Map.of("status", "UP", "runtime", "agentscope-java-copilot");
  }

  private ServerSentEvent<AgentEvent> toSse(AgentEvent ev) {
    return ServerSentEvent.<AgentEvent>builder().event(ev.type()).data(ev).build();
  }
}
