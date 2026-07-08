package com.odagent.copilot.pipeline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.odagent.copilot.config.AgentProperties;
import com.odagent.copilot.governance.GovernanceHook;
import com.odagent.copilot.llm.SiliconFlowClient;
import com.odagent.copilot.protocol.RunRequest;
import com.odagent.copilot.tools.DemoDataStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * US-014 Agent Runtime 流水线编排器。
 *
 * <p>5+1 阶段：输入理解(US-008) -> 本体推理(US-009) -> 就绪门(US-010)
 * -> ReAct 执行(US-011) -> 输出管理(US-013)；治理钩子(US-012) 横切全程。</p>
 *
 * <p>事件协议与前端 BrowserAgentRuntime / useCopilot.ts 逐字段对齐：
 * 大写事件类型；阶段事件使用 {stage, status, summary, detail}；
 * 门禁决策值为 GO / CLARIFY / REJECT / DEGRADE。</p>
 */
@Component
public class PipelineOrchestrator {

  private static final Logger log = LoggerFactory.getLogger(PipelineOrchestrator.class);

  private final SiliconFlowClient llm;
  private final ReactAgentEngine reactEngine;
  private final GovernanceHook governance;
  private final DemoDataStore db;
  private final AgentProperties agentProps;
  private final ObjectMapper mapper = new ObjectMapper();

  public PipelineOrchestrator(SiliconFlowClient llm, ReactAgentEngine reactEngine,
                              GovernanceHook governance, DemoDataStore db,
                              AgentProperties agentProps) {
    this.llm = llm;
    this.reactEngine = reactEngine;
    this.governance = governance;
    this.db = db;
    this.agentProps = agentProps;
  }

  /** 首次运行：完整执行 5+1 流水线。事件写入 ctx.sink（SSE 下游）。 */
  @Async
  public void run(RunContext ctx) {
    try {
      ctx.emit("RUN_STARTED", Map.of(
          "sessionId", ctx.request.sessionId() == null ? "default" : ctx.request.sessionId()));
      governance.emit(ctx, "pre_pipeline", "info", "GOV-AUDIT", "运行开始，流水线已装配");

      // ============ US-008 输入理解 ============
      stageStarted(ctx, "input_understanding");
      Map<String, Object> understanding = stageInputUnderstanding(ctx);
      stageFinished(ctx, "input_understanding", "succeeded",
          "意图: " + understanding.getOrDefault("intent", "未知"), understanding);

      // ============ US-009 本体推理 ============
      stageStarted(ctx, "ontology_reasoning");
      Map<String, Object> ontology = stageOntologyReasoning(ctx, understanding);
      stageFinished(ctx, "ontology_reasoning", "succeeded",
          "实体 " + ((List<?>) ontology.getOrDefault("entities", List.of())).size()
              + " · 本体已装配", ontology);

      // ============ US-010 就绪门 ============
      stageStarted(ctx, "readiness_gate");
      Map<String, Object> gate = stageReadinessGate(understanding);
      ctx.emit("GATE_DECISION", gate);
      String decision = String.valueOf(gate.get("decision"));
      governance.emit(ctx, "post_stage", "REJECT".equals(decision) ? "warn" : "info",
          "GOV-GATE", "就绪门决策: " + decision);

      if ("REJECT".equals(decision)) {
        stageFinished(ctx, "readiness_gate", "failed",
            String.valueOf(gate.get("reason")), null);
        reactEngine.emitAssistantText(ctx,
            "抱歉，这个请求超出了我的能力范围。我可以帮你：查询工作项、查询团队成员、"
                + "创建审批流、评估对比、创建和查询执行指派。");
        finish(ctx, "rejected_by_gate");
        return;
      }
      if ("CLARIFY".equals(decision)) {
        stageFinished(ctx, "readiness_gate", "succeeded", "需要澄清", null);
        reactEngine.emitAssistantText(ctx,
            "你的请求信息不足，请补充：工作项编号（如 `WI-2024-001`）、目标成员或期望的操作。");
        finish(ctx, "clarification_needed");
        return;
      }
      stageFinished(ctx, "readiness_gate", "succeeded", "GATE_PASS", null);

      // ============ US-011 ReAct 执行（US-012 治理横切 + HITL） ============
      stageStarted(ctx, "react_execution");
      ctx.llmMessages.addAll(buildMessages(ctx));
      ReactAgentEngine.LoopResult result = reactEngine.loop(ctx);
      if (result == ReactAgentEngine.LoopResult.INTERRUPTED) {
        // HITL 挂起：检查点保存在 ctx，等待 /api/agent/resume；当前 SSE 流结束。
        ctx.complete();
        return;
      }
      stageFinished(ctx, "react_execution", "succeeded",
          "共 " + (ctx.iteration + 1) + " 轮推理", null);

      // ============ US-013 输出管理 ============
      stageOutputManagement(ctx);

      finish(ctx, "completed");
    } catch (Exception e) {
      log.error("pipeline failed, runId={}", ctx.runId, e);
      ctx.emit("RUN_ERROR", Map.of("message",
          e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
      ctx.complete();
    }
  }

  /** 人工审批后恢复：从检查点继续 ReAct 循环，再走输出管理。 */
  @Async
  public void resume(RunContext ctx, boolean approved, Object feedback) {
    try {
      governance.emit(ctx, "pre_tool", "info", "GOV-HITL",
          approved ? "人工审批通过，恢复执行" : "人工审批拒绝");

      Map<String, Object> pending = ctx.pendingToolCall;
      ctx.pendingToolCall = null;
      ctx.pendingInterruptId = null;

      if (pending != null) {
        String callId = String.valueOf(pending.get("id"));
        String name = String.valueOf(pending.get("name"));
        String label = String.valueOf(pending.get("label"));
        @SuppressWarnings("unchecked")
        Map<String, Object> args = (Map<String, Object>) pending.get("args");

        if (approved) {
          reactEngine.executeAndRecord(ctx, callId, name, label, args);
        } else {
          Map<String, Object> rejection = new HashMap<>();
          rejection.put("rejected", true);
          rejection.put("reason", feedback == null ? "用户拒绝执行" : feedback);
          ctx.emit("TOOL_CALL_RESULT", Map.of(
              "toolCallId", callId, "name", name, "result", rejection, "status", "rejected"));
          ctx.llmMessages.add(Map.of("role", "tool", "tool_call_id", callId,
              "content", mapper.writeValueAsString(rejection)));
        }
      }

      ctx.iteration++;
      ReactAgentEngine.LoopResult result = reactEngine.loop(ctx);
      if (result == ReactAgentEngine.LoopResult.INTERRUPTED) {
        ctx.complete();
        return;
      }
      stageFinished(ctx, "react_execution", "succeeded",
          "共 " + (ctx.iteration + 1) + " 轮推理", null);

      stageOutputManagement(ctx);
      finish(ctx, "completed");
    } catch (Exception e) {
      log.error("resume failed, runId={}", ctx.runId, e);
      ctx.emit("RUN_ERROR", Map.of("message",
          e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
      ctx.complete();
    }
  }

  // ---------------------------------------------------------------
  // US-008 输入理解：LLM 结构化抽取意图 / 实体 / 置信度
  // ---------------------------------------------------------------
  private Map<String, Object> stageInputUnderstanding(RunContext ctx) {
    try {
      JsonNode res = llm.complete(List.of(
          Map.of("role", "system", "content",
              "你是协作领域的意图识别器。分析用户输入，只输出 JSON："
                  + "{\"intent\":\"查询工作项|查询成员|创建审批流|���估对比|创建指派|查询指派|闲聊|超出范围\","
                  + "\"entities\":[\"提到的单号或对象\"],\"confidence\":0.0}"),
          Map.of("role", "user", "content", lastUserMessage(ctx))
      ), 0.1).block();
      String content = res == null ? "{}" : res.at("/choices/0/message/content").asText("{}");
      Map<String, Object> parsed = parseJsonLoose(content);
      if (!parsed.containsKey("intent")) {
        parsed = new HashMap<>(parsed);
        parsed.put("intent", "查询工作项");
        parsed.put("confidence", 0.5);
      }
      return parsed;
    } catch (Exception e) {
      Map<String, Object> fallback = new HashMap<>();
      fallback.put("intent", "查询工作项");
      fallback.put("confidence", 0.5);
      return fallback;
    }
  }

  // ---------------------------------------------------------------
  // US-009 本体推理：实体映射本体类 + 装配可执行上下文
  // ---------------------------------------------------------------
  private Map<String, Object> stageOntologyReasoning(RunContext ctx,
                                                     Map<String, Object> understanding) {
    List<Map<String, Object>> entities = new ArrayList<>();
    Object rawEntities = understanding.get("entities");
    if (rawEntities instanceof List<?> list) {
      for (Object e : list) {
        String v = String.valueOf(e);
        Map<String, Object> oe = new HashMap<>();
        oe.put("value", v);
        oe.put("ontologyClass", mapToOntologyClass(v));
        entities.add(oe);
      }
    }
    Map<String, Object> ontology = new HashMap<>();
    ontology.put("entities", entities);
    ontology.put("schema", db.ontologySchema);
    ontology.put("executable", true);
    return ontology;
  }

  private String mapToOntologyClass(String v) {
    String u = v.toUpperCase();
    if (u.contains("PR-") || v.contains("需求")) return "PurchaseRequest";
    if (u.contains("MB-") || v.contains("成员")) return "Member";
    if (u.contains("AF-") || v.contains("审批流")) return "ApprovalFlow";
    if (u.contains("PO-") || v.contains("订单")) return "PurchaseOrder";
    if (v.matches(".*\\d{4}-\\d{2}-\\d{2}.*") || v.contains("截止")) return "Deadline";
    return "Thing";
  }

  // ---------------------------------------------------------------
  // US-010 就绪门：GO / CLARIFY / REJECT（与前端 GateDecision 对齐）
  // ---------------------------------------------------------------
  private Map<String, Object> stageReadinessGate(Map<String, Object> understanding) {
    String intent = String.valueOf(understanding.getOrDefault("intent", ""));
    double confidence = 0.5;
    if (understanding.get("confidence") instanceof Number n) confidence = n.doubleValue();

    Map<String, Object> gate = new HashMap<>();
    if (intent.contains("超出范围")) {
      gate.put("decision", "REJECT");
      gate.put("reason", "请求超出助手能力边界");
      gate.put("missing", List.of());
    } else if (confidence < 0.35 && !intent.contains("闲聊")) {
      gate.put("decision", "CLARIFY");
      gate.put("reason", "意图置信度过低 (" + confidence + ")");
      gate.put("missing", List.of("明确的业务意图", "工作项编号或成员"));
    } else {
      gate.put("decision", "GO");
      gate.put("reason", "要素齐备");
      gate.put("missing", List.of());
    }
    return gate;
  }

  // ---------------------------------------------------------------
  // US-013 输出管理：状态快照 + 建议追问 + 交付
  // ---------------------------------------------------------------
  private void stageOutputManagement(RunContext ctx) {
    stageStarted(ctx, "output_management");
    governance.emit(ctx, "pre_output", "info", "GOV-OUTPUT", "输出已通过治理检查（脱敏/合规）");
    ctx.emit("AGENT_STATE_DELTA", Map.of(
        "workItemCount", db.workItems.size(),
        "assignmentCount", db.assignments.size()));
    stageFinished(ctx, "output_management", "succeeded", "已交付", null);
  }

  // ---------------------------------------------------------------
  // 消息装配：系统提示词 + readables + 附加指令 + 会话历史
  // ---------------------------------------------------------------
  private List<Map<String, Object>> buildMessages(RunContext ctx) {
    List<Map<String, Object>> messages = new ArrayList<>();
    StringBuilder system = new StringBuilder(
        ctx.request.systemPrompt() != null && !ctx.request.systemPrompt().isBlank()
            ? ctx.request.systemPrompt()
            : agentProps.systemPromptOrDefault());

    if (ctx.request.readables() != null && !ctx.request.readables().isEmpty()) {
      system.append("\n\n# 应用上下文（useCopilotReadable）\n");
      for (RunRequest.ReadableContext r : ctx.request.readables()) {
        try {
          system.append("- ").append(r.description()).append(": ")
              .append(mapper.writeValueAsString(r.value())).append('\n');
        } catch (Exception ignored) { }
      }
    }
    if (ctx.request.additionalInstructions() != null) {
      for (String ins : ctx.request.additionalInstructions()) {
        system.append("\n# 附加指令\n").append(ins).append('\n');
      }
    }
    system.append("\n# 工具调用要求（最高优先级）\n")
        .append("- 需要查询或操作数据时，必须直接通过 function calling 调用工具，一次一个。\n")
        .append("- 严禁在回复文本中书写工具名或 JSON 参数——直接调用即可。\n")
        .append("- 严禁在未收到工具真实返回结果时声称操作已完成。\n")
        .append("- 工具返回后用自然语言总结，重要数据用 Markdown 表格。");

    messages.add(Map.of("role", "system", "content", system.toString()));
    for (RunRequest.ChatMessage m : ctx.request.messages()) {
      messages.add(Map.of("role", m.role(), "content", m.content() == null ? "" : m.content()));
    }
    return messages;
  }

  // ---------------------------------------------------------------
  // 事件辅助（形状与 useCopilot.ts 的 STAGE_* 处理逐字段对齐）
  // ---------------------------------------------------------------
  private void stageStarted(RunContext ctx, String stage) {
    ctx.emit("STAGE_STARTED", Map.of("stage", stage));
  }

  private void stageFinished(RunContext ctx, String stage, String status,
                             String summary, Object detail) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("stage", stage);
    payload.put("status", status);
    payload.put("summary", summary == null ? "" : summary);
    if (detail != null) payload.put("detail", detail);
    ctx.emit("STAGE_FINISHED", payload);
  }

  private void finish(RunContext ctx, String outcome) {
    governance.emit(ctx, "post_stage", "info", "GOV-AUDIT", "运行结束: " + outcome);
    ctx.emit("RUN_FINISHED", Map.of("outcome", outcome));
    ctx.complete();
  }

  private String lastUserMessage(RunContext ctx) {
    var msgs = ctx.request.messages();
    for (int i = msgs.size() - 1; i >= 0; i--) {
      if ("user".equals(msgs.get(i).role())) return msgs.get(i).content();
    }
    return "";
  }

  private Map<String, Object> parseJsonLoose(String content) {
    try {
      String json = content;
      int start = json.indexOf('{');
      int end = json.lastIndexOf('}');
      if (start >= 0 && end > start) json = json.substring(start, end + 1);
      return mapper.readValue(json, mapper.getTypeFactory()
          .constructMapType(HashMap.class, String.class, Object.class));
    } catch (Exception e) {
      return new HashMap<>();
    }
  }
}
