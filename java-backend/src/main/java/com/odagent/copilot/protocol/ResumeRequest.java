package com.odagent.copilot.protocol;

/**
 * POST /api/agent/resume 请求体。
 * 与前端 HttpAgentRuntime.resume() 发送的 { sessionId, runId, ...InterruptResponse } 对齐。
 */
public record ResumeRequest(
    String sessionId,
    String runId,
    String interruptId,
    /** 审批结果：true 批准 / false 拒绝 */
    Boolean approved,
    /** input 类中断的用户输入值 */
    String value,
    /** 审批备注 / 拒绝原因 */
    String comment
) {}
