package com.odagent.copilot.governance;

import com.odagent.copilot.pipeline.RunContext;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * US-012 治理钩子（横切层）。
 * 事件形状与前端 GovernanceEvent 类型对齐：
 * { id, hook, severity, rule, message, timestamp }
 *
 * hook 取值: pre_pipeline / post_stage / pre_tool / post_tool / pre_output
 * severity 取值: info / warn / block
 */
@Component
public class GovernanceHook {

  public void emit(RunContext ctx, String hook, String severity, String rule, String message) {
    ctx.emit("GOVERNANCE_EVENT", Map.of(
        "id", "gov_" + UUID.randomUUID(),
        "hook", hook,
        "severity", severity,
        "rule", rule,
        "message", message,
        "timestamp", System.currentTimeMillis()
    ));
  }

  /** 工具调用前置检查：返回 true 表示需要 HITL 审批（RULE-006 高影响动作） */
  public boolean requiresApproval(String toolName, boolean declaredApproval) {
    return requiresApproval(toolName, declaredApproval, "confirm_edits");
  }

  /**
   * 工具调用前置检查（带 Agent 模式，与前端 ModeSelector 对齐）：
   * - full_access / auto_edit：跳过写操作审批（仅显式声明 requiresApproval 的动作仍需审批）
   * - plan：所有工具调用一律拦截审批（规划模式不执行副作用）
   * - confirm_edits（默认）：写操作（create/update/delete 前缀）需审批
   */
  public boolean requiresApproval(String toolName, boolean declaredApproval, String agentMode) {
    if ("plan".equals(agentMode)) return true;
    if ("full_access".equals(agentMode) || "auto_edit".equals(agentMode)) {
      return declaredApproval;
    }
    return declaredApproval
        || toolName.startsWith("create")
        || toolName.startsWith("update")
        || toolName.startsWith("delete");
  }

  /** 输出治理：脱敏（US-013 前置）。演示实现：手机号打码 */
  public String sanitizeOutput(String text) {
    if (text == null) return "";
    return text.replaceAll("(1[3-9]\\d)\\d{4}(\\d{4})", "$1****$2");
  }
}
