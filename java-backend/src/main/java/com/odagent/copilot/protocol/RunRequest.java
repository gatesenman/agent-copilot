package com.odagent.copilot.protocol;

import java.util.List;
import java.util.Map;

/**
 * POST /api/agent/chat 请求体。
 * 与前端 HttpAgentRuntime.run() 发送的 JSON 完全对齐（见 types/index.ts RunInput）。
 */
public record RunRequest(
    String sessionId,
    String runId,
    List<ChatMessage> messages,
    /** useCopilotReadable 注入的上下文快照 */
    List<ReadableContext> readables,
    /** useCopilotAction 注册的前端 Action 定义（handler 不序列化） */
    List<ActionDef> actions,
    /** useCopilotAdditionalInstructions 注入的附加指令 */
    List<String> additionalInstructions,
    String systemPrompt,
    String model,
    Double temperature,
    Integer maxTokens,
    /** 运行元数据：agentMode（confirm_edits/auto_edit/plan/full_access）、thinking（深度思考）等 */
    Map<String, Object> metadata
) {

  /** metadata.thinking == true 时启用深度思考（reasoning）流式输出 */
  public boolean thinkingEnabled() {
    return metadata != null && Boolean.TRUE.equals(metadata.get("thinking"));
  }

  /** metadata.agentMode，默认 confirm_edits */
  public String agentMode() {
    Object v = metadata == null ? null : metadata.get("agentMode");
    return v == null ? "confirm_edits" : String.valueOf(v);
  }

  public record ChatMessage(String role, String content) {}

  public record ReadableContext(String description, Object value) {}

  public record ActionDef(
      String name,
      String label,
      String description,
      Map<String, Object> parameters,
      Boolean requiresApproval
  ) {}
}
