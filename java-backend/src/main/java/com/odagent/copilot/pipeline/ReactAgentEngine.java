package com.odagent.copilot.pipeline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.odagent.copilot.config.AgentProperties;
import com.odagent.copilot.governance.GovernanceHook;
import com.odagent.copilot.llm.SiliconFlowClient;
import com.odagent.copilot.protocol.RunRequest;
import com.odagent.copilot.tools.ToolRegistry;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * US-011 ReAct 业务代理执行层。
 * Reason(LLM) -> Act(工具) -> Observe(结果) 循环。
 *
 * <p>HITL 模型：遇到高风险工具时发出 INTERRUPT 事件并返回 INTERRUPTED，
 * 检查点（llmMessages / iteration / pendingToolCall）保存在 RunContext；
 * PipelineOrchestrator.resume() 处理审批结果后重新调用 loop() 继续。</p>
 *
 * <p>事件形状与前端 BrowserAgentRuntime 逐一对齐。</p>
 */
@Component
public class ReactAgentEngine {

  public enum LoopResult { FINISHED, INTERRUPTED, MAX_ITERATIONS }

  private final SiliconFlowClient llm;
  private final ToolRegistry toolRegistry;
  private final GovernanceHook governance;
  private final AgentProperties props;
  private final ObjectMapper mapper = new ObjectMapper();

  public ReactAgentEngine(SiliconFlowClient llm, ToolRegistry toolRegistry,
                          GovernanceHook governance, AgentProperties props) {
    this.llm = llm;
    this.toolRegistry = toolRegistry;
    this.governance = governance;
    this.props = props;
  }

  /**
   * 从 ctx.iteration 继续执行 ReAct 循环，事件写入 ctx.sink。
   */
  public LoopResult loop(RunContext ctx) throws Exception {
    int maxIter = props.maxIterations() != null ? props.maxIterations() : 8;
    List<Map<String, Object>> tools = buildToolList(ctx.request);

    while (ctx.iteration < maxIter) {
      if (ctx.cancelled.get()) return LoopResult.FINISHED;

      StringBuilder text = new StringBuilder();
      String messageId = "msg_" + UUID.randomUUID();
      boolean textStarted = false;
      boolean thinkingStarted = false;
      // index -> {id, name, args}
      Map<Integer, String[]> calls = new TreeMap<>();

      List<JsonNode> chunks = llm.streamWithTools(ctx.llmMessages, tools,
          ctx.request.temperature() != null ? ctx.request.temperature() : 0.3,
          ctx.request.thinkingEnabled())
          .collectList().block();
      if (chunks == null) chunks = List.of();

      for (JsonNode chunk : chunks) {
        JsonNode delta = chunk.at("/choices/0/delta");
        if (delta.isMissingNode()) continue;

        // ---- 深度思考流（DeepSeek-R1 / Qwen3 等 reasoning_content）→ THINKING_* ----
        JsonNode reasoning = delta.get("reasoning_content");
        if (reasoning != null && !reasoning.isNull() && !reasoning.asText().isEmpty()) {
          if (!thinkingStarted) {
            thinkingStarted = true;
            ctx.emit("THINKING_START", Map.of("messageId", messageId));
          }
          ctx.emit("THINKING_DELTA", Map.of("messageId", messageId, "delta", reasoning.asText()));
        }

        JsonNode content = delta.get("content");
        if (content != null && !content.isNull() && !content.asText().isEmpty()) {
          if (thinkingStarted) {
            thinkingStarted = false;
            ctx.emit("THINKING_END", Map.of("messageId", messageId));
          }
          if (!textStarted) {
            textStarted = true;
            ctx.emit("TEXT_MESSAGE_START", Map.of("messageId", messageId));
          }
          String piece = content.asText();
          text.append(piece);
          ctx.emit("TEXT_DELTA", Map.of("messageId", messageId, "delta", piece));
        }

        JsonNode toolCalls = delta.get("tool_calls");
        if (toolCalls != null && toolCalls.isArray()) {
          for (JsonNode tc : toolCalls) {
            int idx = tc.path("index").asInt(0);
            String[] acc = calls.computeIfAbsent(idx, k -> new String[]{"", "", ""});
            if (tc.has("id")) acc[0] = tc.get("id").asText();
            JsonNode fn = tc.path("function");
            if (fn.has("name")) acc[1] = fn.get("name").asText();
            if (fn.has("arguments")) acc[2] += fn.get("arguments").asText();
          }
        }
      }

      // 思考块未随正文闭合（如推理后直接发起工具调用）时补发 END
      if (thinkingStarted) {
        ctx.emit("THINKING_END", Map.of("messageId", messageId));
      }

      // ---- 无工具调用 -> 最终回答 ----
      if (calls.isEmpty()) {
        String sanitized = governance.sanitizeOutput(text.toString());
        if (textStarted) {
          ctx.emit("TEXT_MESSAGE_END", Map.of("messageId", messageId));
        }
        if (!sanitized.isBlank()) {
          ctx.emit("REACT_STEP", Map.of("type", "final", "content", truncate(sanitized)));
        }
        return LoopResult.FINISHED;
      }

      // ---- 有工具调用 ----
      if (textStarted) {
        ctx.emit("TEXT_MESSAGE_END", Map.of("messageId", messageId));
      }
      if (text.length() > 0) {
        ctx.emit("REACT_STEP", Map.of("type", "thought", "content", truncate(text.toString())));
      }

      // assistant 消息（含 tool_calls）追加到检查点
      List<Map<String, Object>> assistantToolCalls = new ArrayList<>();
      for (Map.Entry<Integer, String[]> e : calls.entrySet()) {
        String[] acc = e.getValue();
        if (acc[0].isEmpty()) acc[0] = "tc_" + UUID.randomUUID();
        assistantToolCalls.add(Map.of(
            "id", acc[0], "type", "function",
            "function", Map.of("name", acc[1],
                "arguments", acc[2].isEmpty() ? "{}" : acc[2])));
      }
      Map<String, Object> assistantMsg = new HashMap<>();
      assistantMsg.put("role", "assistant");
      assistantMsg.put("content", text.length() > 0 ? text.toString() : null);
      assistantMsg.put("tool_calls", assistantToolCalls);
      ctx.llmMessages.add(assistantMsg);

      for (Map.Entry<Integer, String[]> e : calls.entrySet()) {
        String[] acc = e.getValue();
        String callId = acc[0];
        String name = acc[1];
        Map<String, Object> args = parseArgs(acc[2]);
        String label = resolveLabel(ctx.request, name);

        ctx.emit("REACT_STEP", Map.of(
            "type", "action",
            "content", "调用工具 " + label + "(" + truncate(acc[2], 120) + ")",
            "toolCallId", callId));
        ctx.emit("TOOL_CALL_START", Map.of(
            "toolCallId", callId, "name", name, "label", label, "origin", "backend"));
        ctx.emit("TOOL_CALL_ARGS", Map.of("toolCallId", callId, "args", args));

        // ---- US-012 pre_tool + HITL 判定 ----
        boolean declared = declaredApproval(ctx.request, name)
            || (toolRegistry.has(name) && toolRegistry.get(name).requiresApproval());
        if (governance.requiresApproval(name, declared, ctx.request.agentMode())) {
          String interruptId = "itr_" + UUID.randomUUID();
          governance.emit(ctx, "pre_tool", "warn", "GOV-HITL",
              "高影响动作「" + label + "」触发人工审批");
          ctx.emit("TOOL_CALL_RESULT", Map.of(
              "toolCallId", callId, "name", name, "status", "awaiting_approval"));

          Map<String, Object> pendingCall = new HashMap<>();
          pendingCall.put("id", callId);
          pendingCall.put("name", name);
          pendingCall.put("label", label);
          pendingCall.put("args", args);
          ctx.pendingToolCall = pendingCall;
          ctx.pendingInterruptId = interruptId;

          ctx.emit("INTERRUPT", Map.of(
              "id", interruptId,
              "runId", ctx.runId,
              "kind", "approval",
              "title", "确认执行：" + label,
              "description", toolDescription(ctx.request, name),
              "action", Map.of("name", name, "label", label, "args", args),
              "timestamp", System.currentTimeMillis()));
          return LoopResult.INTERRUPTED;
        }

        executeAndRecord(ctx, callId, name, label, args);
      }
      ctx.iteration++;
    }

    governance.emit(ctx, "post_stage", "warn", "GOV-LOOP",
        "已达最大推理轮数(" + maxIter + ")，强制结束");
    emitAssistantText(ctx, "已达到最大推理轮数，任务未能完全完成。请尝试将问题拆分后重新提问。");
    return LoopResult.MAX_ITERATIONS;
  }

  /** 执行工具（后端注册表）并发出结果事件、写入检查点。 */
  public void executeAndRecord(RunContext ctx, String callId, String name,
                               String label, Map<String, Object> args) {
    try {
      if (!toolRegistry.has(name)) {
        // 前端 Action：后端无法执行，返回提示（生产实现可用双向通道回传前端执行）
        Map<String, Object> hint = Map.of(
            "notice", "该工具为前端 Action，请在前端 BrowserAgentRuntime 模式下执行，"
                + "或在后端 ToolRegistry 中注册同名实现。");
        ctx.emit("TOOL_CALL_RESULT", Map.of(
            "toolCallId", callId, "name", name, "result", hint, "status", "succeeded"));
        ctx.llmMessages.add(Map.of("role", "tool", "tool_call_id", callId,
            "content", toJson(hint)));
        return;
      }
      Map<String, Object> result = toolRegistry.get(name).executor().apply(args);
      ctx.emit("TOOL_CALL_RESULT", Map.of(
          "toolCallId", callId, "name", name, "result", result, "status", "succeeded"));
      ctx.emit("REACT_STEP", Map.of(
          "type", "observation", "content", truncate(toJson(result))));
      governance.emit(ctx, "post_tool", "info", "GOV-TOOL", "工具「" + label + "」执行成功");
      ctx.llmMessages.add(Map.of("role", "tool", "tool_call_id", callId,
          "content", toJson(result)));
    } catch (Exception ex) {
      String msg = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
      ctx.emit("TOOL_CALL_RESULT", Map.of(
          "toolCallId", callId, "name", name, "error", msg, "status", "failed"));
      ctx.emit("REACT_STEP", Map.of("type", "observation", "content", "工具执行失败: " + msg));
      governance.emit(ctx, "post_tool", "warn", "GOV-TOOL", "工具「" + label + "」执行失败: " + msg);
      ctx.llmMessages.add(Map.of("role", "tool", "tool_call_id", callId,
          "content", "{\"error\":\"" + msg.replace("\"", "'") + "\"}"));
    }
  }

  public void emitAssistantText(RunContext ctx, String textContent) {
    String messageId = "msg_" + UUID.randomUUID();
    ctx.emit("TEXT_MESSAGE_START", Map.of("messageId", messageId));
    ctx.emit("TEXT_DELTA", Map.of("messageId", messageId, "delta", textContent));
    ctx.emit("TEXT_MESSAGE_END", Map.of("messageId", messageId));
  }

  private boolean declaredApproval(RunRequest req, String name) {
    if (req.actions() == null) return false;
    return req.actions().stream().anyMatch(a ->
        a.name().equals(name) && Boolean.TRUE.equals(a.requiresApproval()));
  }

  private String resolveLabel(RunRequest req, String name) {
    if (req.actions() != null) {
      for (RunRequest.ActionDef a : req.actions()) {
        if (a.name().equals(name) && a.label() != null) return a.label();
      }
    }
    if (toolRegistry.has(name)) return toolRegistry.get(name).description();
    return name;
  }

  private String toolDescription(RunRequest req, String name) {
    if (req.actions() != null) {
      for (RunRequest.ActionDef a : req.actions()) {
        if (a.name().equals(name) && a.description() != null) return a.description();
      }
    }
    return toolRegistry.has(name) ? toolRegistry.get(name).description() : "";
  }

  private List<Map<String, Object>> buildToolList(RunRequest req) {
    List<Map<String, Object>> tools = new ArrayList<>(toolRegistry.toOpenAiTools());
    if (req.actions() != null) {
      for (RunRequest.ActionDef fa : req.actions()) {
        if (toolRegistry.has(fa.name())) continue; // 后端同名工具优先
        tools.add(Map.of("type", "function", "function", Map.of(
            "name", fa.name(),
            "description", fa.description() == null ? "" : fa.description(),
            "parameters", fa.parameters() == null
                ? Map.of("type", "object", "properties", Map.of())
                : fa.parameters())));
      }
    }
    return tools;
  }

  private Map<String, Object> parseArgs(String json) {
    try {
      return mapper.readValue(json == null || json.isBlank() ? "{}" : json,
          mapper.getTypeFactory().constructMapType(LinkedHashMap.class,
              String.class, Object.class));
    } catch (Exception e) {
      return new LinkedHashMap<>();
    }
  }

  private String toJson(Object o) {
    try {
      return mapper.writeValueAsString(o);
    } catch (Exception e) {
      return "{}";
    }
  }

  private String truncate(String s) { return truncate(s, 300); }

  private String truncate(String s, int n) {
    return s != null && s.length() > n ? s.substring(0, n) + "…" : (s == null ? "" : s);
  }
}
