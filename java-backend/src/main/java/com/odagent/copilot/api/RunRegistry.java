package com.odagent.copilot.api;

import com.odagent.copilot.pipeline.RunContext;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 活跃 Run 注册表：runId -> RunContext。
 * 用于 /resume 时找回挂起的 HITL future。
 * 生产环境可换成 Redis + 持久化 checkpoint 以支持横向扩容。
 */
@Component
public class RunRegistry {

  private final Map<String, RunContext> runs = new ConcurrentHashMap<>();

  public void register(RunContext ctx) { runs.put(ctx.runId, ctx); }
  public RunContext get(String runId) { return runs.get(runId); }
  public void remove(String runId) { runs.remove(runId); }
}
