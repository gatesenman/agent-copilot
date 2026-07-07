package com.odagent.copilot.protocol;

/** POST /api/agent/cancel 请求体。 */
public record CancelRequest(String sessionId, String runId) {}
