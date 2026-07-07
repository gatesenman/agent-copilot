package com.odagent.copilot.protocol;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * SSE 事件。与前端 types/index.ts 的 AgentEvent / AgentEventType 完全对齐。
 *
 * 事件类型（type 字段，全大写）：
 *  RUN_STARTED / RUN_FINISHED / RUN_ERROR
 *  STAGE_STARTED / STAGE_FINISHED          —— 5+1 流水线阶段
 *  TEXT_MESSAGE_START / TEXT_DELTA / TEXT_MESSAGE_END
 *  TOOL_CALL_START / TOOL_CALL_ARGS / TOOL_CALL_RESULT
 *  REACT_STEP                              —— thought/action/observation/final
 *  AGENT_STATE_DELTA                       —— CoAgent 共享状态
 *  GOVERNANCE_EVENT                        —— US-012 治理审计
 *  GATE_DECISION                           —— US-010 就绪门决策
 *  STRUCTURED_PAYLOAD                      —— 结构化载荷（表格/卡片）
 *  INTERRUPT                               —— HITL 审批中断
 *  USAGE                                   —— token 用量
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AgentEvent(
    String type,
    String runId,
    long timestamp,
    Object data
) {
  public static AgentEvent of(String type, String runId, Object data) {
    return new AgentEvent(type, runId, System.currentTimeMillis(), data);
  }
}
