package com.odagent.copilot.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 协议一致性测试用最小 Mock 后端。
 *
 * 为前端 11 种 Agent 协议适配器各提供一个端点，按各协议的官方流帧格式
 * 回放固定脚本（文本增量 + 工具调用 + 结构化载荷 + 用量 + 结束信号），
 * 供演示站「协议测试」页做端到端断言。
 *
 * 端点一览（与各适配器 buildRunRequest 的 URL 拼接规则严格对应）：
 *   POST /api/mock/ag-ui
 *   POST /api/mock/langgraph/threads/{threadId}/runs/stream
 *   POST /api/mock/langserve/stream_events
 *   POST /api/mock/agentscope/chat
 *   POST /api/mock/ai-sdk
 *   POST /api/mock/dify/chat-messages
 *   POST /api/mock/coze/v3/chat
 *   POST /api/mock/fastgpt/v1/chat/completions
 *   POST /api/mock/a2a
 *   POST /api/mock/acp/runs
 *   POST /api/mock/openai-assistants/threads/runs
 *   GET  /api/mock/health
 */
@RestController
@RequestMapping("/api/mock")
public class ProtocolMockController {

  private static final ObjectMapper JSON = new ObjectMapper();
  /** 帧间隔：足够小保证测试快，足够大保证逐帧到达（验证增量解析） */
  private static final Duration TICK = Duration.ofMillis(15);

  // ---------- 通用工具 ----------

  private static String json(Object o) {
    try {
      return JSON.writeValueAsString(o);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
  }

  private static ServerSentEvent<String> sse(String data) {
    return ServerSentEvent.<String>builder().data(data).build();
  }

  private static ServerSentEvent<String> sse(String event, String data) {
    return ServerSentEvent.<String>builder().event(event).data(data).build();
  }

  private static Flux<ServerSentEvent<String>> stream(List<ServerSentEvent<String>> frames) {
    return Flux.fromIterable(frames).delayElements(TICK);
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    return Map.of("status", "ok", "protocols", 11);
  }

  // ---------- 1. AG-UI ----------

  @PostMapping(value = "/ag-ui", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> agUi(@RequestBody Map<String, Object> body) {
    String threadId = String.valueOf(body.getOrDefault("threadId", "t1"));
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("type", "RUN_STARTED", "threadId", threadId, "runId", "mock_run"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_START", "messageId", "m1"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_CONTENT", "messageId", "m1", "delta", "来自 "))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_CONTENT", "messageId", "m1", "delta", "AG-UI "))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_CONTENT", "messageId", "m1", "delta", "协议的问候"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_END", "messageId", "m1"))));
    f.add(sse(json(Map.of("type", "TOOL_CALL_START", "toolCallId", "tc1", "toolCallName", "get_weather"))));
    f.add(sse(json(Map.of("type", "TOOL_CALL_ARGS", "toolCallId", "tc1", "delta", "{\"city\":"))));
    f.add(sse(json(Map.of("type", "TOOL_CALL_ARGS", "toolCallId", "tc1", "delta", "\"北京\"}"))));
    f.add(sse(json(Map.of("type", "TOOL_CALL_END", "toolCallId", "tc1"))));
    f.add(sse(json(Map.of("type", "TOOL_CALL_RESULT", "toolCallId", "tc1", "content", "{\"temp\":21}"))));
    f.add(sse(json(Map.of("type", "STATE_SNAPSHOT", "snapshot", Map.of("progress", 100)))));
    f.add(sse(json(Map.of(
        "type", "CUSTOM", "name", "structured_payload",
        "value", Map.of("type", "plan", "title", "Mock 计划",
            "data", Map.of("steps", List.of(Map.of("title", "步骤一", "status", "done"))))))));
    f.add(sse(json(Map.of("type", "RUN_FINISHED"))));
    return stream(f);
  }

  // ---------- 2. LangGraph ----------

  @PostMapping(value = "/langgraph/threads/{threadId}/runs/stream",
      produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> langgraph(@PathVariable String threadId,
                                                 @RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    // messages 模式：[AIMessageChunk, metadata]
    f.add(sse("messages/partial", json(List.of(Map.of("content", "来自 "), Map.of()))));
    f.add(sse("messages/partial", json(List.of(Map.of("content", "LangGraph "), Map.of()))));
    f.add(sse("messages/partial", json(List.of(
        Map.of("content", "", "tool_call_chunks",
            List.of(Map.of("index", 0, "id", "lg_tc1", "name", "search_docs", "args", "{\"query\":"))),
        Map.of()))));
    f.add(sse("messages/partial", json(List.of(
        Map.of("content", "", "tool_call_chunks",
            List.of(Map.of("index", 0, "args", "\"向量检索\"}"))),
        Map.of()))));
    // ToolMessage（工具结果）
    f.add(sse("messages/partial", json(List.of(
        Map.of("type", "tool", "tool_call_id", "lg_tc1", "content", "{\"hits\":3}", "status", "success"),
        Map.of()))));
    f.add(sse("messages/partial", json(List.of(Map.of("content", "协议的问候"), Map.of()))));
    // updates 模式：节点级状态
    f.add(sse("updates", json(Map.of("agent", Map.of("step", "final")))));
    return stream(f);
  }

  // ---------- 3. LangServe ----------

  @PostMapping(value = "/langserve/stream_events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> langserve(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("event", "on_chat_model_stream",
        "data", Map.of("chunk", Map.of("content", "来自 "))))));
    f.add(sse(json(Map.of("event", "on_tool_start", "run_id", "r1", "name", "calculator",
        "data", Map.of("input", Map.of("expr", "1+1"))))));
    f.add(sse(json(Map.of("event", "on_tool_end", "run_id", "r1",
        "data", Map.of("output", "2")))));
    f.add(sse(json(Map.of("event", "on_chat_model_stream",
        "data", Map.of("chunk", Map.of("content", "LangServe "))))));
    f.add(sse(json(Map.of("event", "on_chat_model_stream",
        "data", Map.of("chunk", Map.of("content", "协议的问候"))))));
    return stream(f);
  }

  // ---------- 4. AgentScope（本项目 AgentEvent 透传协议） ----------

  @PostMapping(value = "/agentscope/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> agentscope(@RequestBody Map<String, Object> body) {
    String runId = String.valueOf(body.getOrDefault("runId", "mock_run"));
    long now = System.currentTimeMillis();
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("type", "RUN_STARTED", "runId", runId, "timestamp", now, "data", Map.of()))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_START", "runId", runId, "timestamp", now,
        "data", Map.of("messageId", "as_m1")))));
    f.add(sse(json(Map.of("type", "TEXT_DELTA", "runId", runId, "timestamp", now,
        "data", Map.of("messageId", "as_m1", "delta", "来自 ")))));
    f.add(sse(json(Map.of("type", "TEXT_DELTA", "runId", runId, "timestamp", now,
        "data", Map.of("messageId", "as_m1", "delta", "AgentScope ")))));
    f.add(sse(json(Map.of("type", "TEXT_DELTA", "runId", runId, "timestamp", now,
        "data", Map.of("messageId", "as_m1", "delta", "协议的问候")))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_END", "runId", runId, "timestamp", now,
        "data", Map.of("messageId", "as_m1")))));
    f.add(sse(json(Map.of("type", "TOOL_CALL_START", "runId", runId, "timestamp", now,
        "data", Map.of("toolCallId", "as_tc1", "name", "query_db", "origin", "backend")))));
    f.add(sse(json(Map.of("type", "TOOL_CALL_ARGS", "runId", runId, "timestamp", now,
        "data", Map.of("toolCallId", "as_tc1", "args", Map.of("table", "orders"))))));
    f.add(sse(json(Map.of("type", "TOOL_CALL_RESULT", "runId", runId, "timestamp", now,
        "data", Map.of("toolCallId", "as_tc1", "name", "query_db",
            "result", Map.of("rows", 5), "status", "succeeded")))));
    f.add(sse(json(Map.of("type", "STRUCTURED_PAYLOAD", "runId", runId, "timestamp", now,
        "data", Map.of("type", "metric", "title", "订单数",
            "data", Map.of("value", 5, "label", "订单数"))))));
    f.add(sse(json(Map.of("type", "USAGE", "runId", runId, "timestamp", now,
        "data", Map.of("promptTokens", 10, "completionTokens", 20, "totalTokens", 30)))));
    f.add(sse(json(Map.of("type", "RUN_FINISHED", "runId", runId, "timestamp", now, "data", Map.of()))));
    return stream(f);
  }

  // ---------- 5. AI SDK（UI Message Stream） ----------

  @PostMapping(value = "/ai-sdk", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> aiSdk(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("type", "text-delta", "delta", "来自 "))));
    f.add(sse(json(Map.of("type", "text-delta", "delta", "AI SDK "))));
    f.add(sse(json(Map.of("type", "tool-input-start", "toolCallId", "sdk_tc1", "toolName", "web_search"))));
    f.add(sse(json(Map.of("type", "tool-input-delta", "toolCallId", "sdk_tc1", "inputTextDelta", "{\"q\":\"vue\"}"))));
    f.add(sse(json(Map.of("type", "tool-input-available", "toolCallId", "sdk_tc1"))));
    f.add(sse(json(Map.of("type", "tool-output-available", "toolCallId", "sdk_tc1",
        "output", Map.of("results", 2)))));
    f.add(sse(json(Map.of("type", "data-payload",
        "data", Map.of("type", "citations", "data",
            Map.of("items", List.of(Map.of("title", "Vue 官方文档", "url", "https://vuejs.org"))))))));
    f.add(sse(json(Map.of("type", "text-delta", "delta", "协议的问候"))));
    f.add(sse(json(Map.of("type", "finish"))));
    f.add(sse("[DONE]"));
    return stream(f);
  }

  // ---------- 6. Dify ----------

  @PostMapping(value = "/dify/chat-messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> dify(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("event", "agent_thought", "thought", "需要先查询知识库"))));
    f.add(sse(json(Map.of("event", "agent_thought", "tool", "knowledge_search",
        "tool_input", "{\"kw\":\"合同\"}", "observation", "{\"docs\":1}"))));
    f.add(sse(json(Map.of("event", "agent_message", "answer", "来自 "))));
    f.add(sse(json(Map.of("event", "agent_message", "answer", "Dify "))));
    f.add(sse(json(Map.of("event", "agent_message", "answer", "协议的问候"))));
    f.add(sse(json(Map.of("event", "message_end", "metadata",
        Map.of("usage", Map.of("prompt_tokens", 12, "completion_tokens", 8, "total_tokens", 20))))));
    return stream(f);
  }

  // ---------- 7. Coze v3 ----------

  @PostMapping(value = "/coze/v3/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> coze(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse("conversation.message.delta", json(Map.of("type", "answer", "content", "来自 "))));
    f.add(sse("conversation.message.delta", json(Map.of("type", "answer", "content", "Coze "))));
    f.add(sse("conversation.message.completed", json(Map.of(
        "type", "function_call",
        "content", "{\"name\":\"send_mail\",\"arguments\":{\"to\":\"a@b.c\"}}"))));
    f.add(sse("conversation.message.completed", json(Map.of("type", "tool_response", "content", "已发送"))));
    f.add(sse("conversation.message.delta", json(Map.of("type", "answer", "content", "协议的问候"))));
    f.add(sse("conversation.chat.completed", json(Map.of(
        "usage", Map.of("input_count", 15, "output_count", 9, "token_count", 24)))));
    f.add(sse("done", "\"[DONE]\""));
    return stream(f);
  }

  // ---------- 8. FastGPT ----------

  @PostMapping(value = "/fastgpt/v1/chat/completions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> fastgpt(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse("flowNodeStatus", json(Map.of("name", "知识库检索", "status", "running"))));
    f.add(sse("toolCall", json(Map.of("tool", Map.of("id", "fg1", "toolName", "kb_search")))));
    f.add(sse("toolParams", json(Map.of("tool", Map.of("id", "fg1", "params", "{\"kw\":\"报销\"}")))));
    f.add(sse("toolResponse", json(Map.of("tool", Map.of("id", "fg1", "response", "{\"docs\":2}")))));
    f.add(sse("answer", json(Map.of("choices", List.of(Map.of(
        "delta", Map.of("content", "来自 ")))))));
    f.add(sse("answer", json(Map.of("choices", List.of(Map.of(
        "delta", Map.of("content", "FastGPT ")))))));
    f.add(sse("answer", json(Map.of("choices", List.of(Map.of(
        "delta", Map.of("content", "协议的问候"), "finish_reason", "stop"))))));
    f.add(sse("flowResponses", json(List.of())));
    f.add(sse("[DONE]"));
    return stream(f);
  }

  // ---------- 9. A2A（JSON-RPC over SSE） ----------

  @PostMapping(value = "/a2a", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> a2a(@RequestBody Map<String, Object> body) {
    Object rpcId = body.getOrDefault("id", "1");
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("jsonrpc", "2.0", "id", rpcId, "result", Map.of(
        "id", "task_1", "kind", "task",
        "status", Map.of("state", "submitted"))))));
    f.add(sse(json(Map.of("jsonrpc", "2.0", "id", rpcId, "result", Map.of(
        "kind", "status-update", "taskId", "task_1",
        "status", Map.of("state", "working"))))));
    f.add(sse(json(Map.of("jsonrpc", "2.0", "id", rpcId, "result", Map.of(
        "kind", "message", "role", "agent",
        "parts", List.of(Map.of("kind", "text", "text", "来自 A2A 协议的问候")))))));
    Map<String, Object> tableData = Map.of(
        "columns", List.of(Map.of("key", "name", "label", "名称")),
        "rows", List.of(Map.of("name", "样例")));
    Map<String, Object> dataPart = Map.of(
        "kind", "data",
        "data", Map.of("type", "table", "title", "结果表", "data", tableData));
    Map<String, Object> artifact = Map.of("name", "分析����告", "parts", List.of(dataPart));
    f.add(sse(json(Map.of("jsonrpc", "2.0", "id", rpcId, "result", Map.of(
        "kind", "artifact-update", "taskId", "task_1", "artifact", artifact)))));
    f.add(sse(json(Map.of("jsonrpc", "2.0", "id", rpcId, "result", Map.of(
        "kind", "status-update", "taskId", "task_1", "final", true,
        "status", Map.of("state", "completed"))))));
    return stream(f);
  }

  // ---------- 10. ACP ----------

  @PostMapping(value = "/acp/runs", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> acp(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("type", "run.created",
        "run", Map.of("run_id", "acp_r1", "status", "created")))));
    f.add(sse(json(Map.of("type", "run.in-progress",
        "run", Map.of("run_id", "acp_r1", "status", "in-progress")))));
    f.add(sse(json(Map.of("type", "message.part",
        "part", Map.of("content_type", "text/plain", "content", "来自 ")))));
    f.add(sse(json(Map.of("type", "message.part",
        "part", Map.of("content_type", "text/plain", "content", "ACP ")))));
    f.add(sse(json(Map.of("type", "message.part",
        "part", Map.of("content_type", "application/json",
            "content", Map.of("type", "metric", "title", "指标",
                "data", Map.of("value", 42, "label", "覆盖率")))))));
    f.add(sse(json(Map.of("type", "message.part",
        "part", Map.of("content_type", "text/plain", "content", "协议的问候")))));
    f.add(sse(json(Map.of("type", "run.completed",
        "run", Map.of("run_id", "acp_r1", "status", "completed", "output", List.of())))));
    return stream(f);
  }

  // ---------- 11. OpenAI Assistants v2 ----------

  @PostMapping(value = "/openai-assistants/threads/runs", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> assistants(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse("thread.run.created", json(Map.of("id", "oa_run1", "thread_id", "oa_th1"))));
    f.add(sse("thread.run.in_progress", json(Map.of("id", "oa_run1"))));
    f.add(sse("thread.message.delta", json(Map.of("delta", Map.of("content",
        List.of(Map.of("type", "text", "text", Map.of("value", "来自 "))))))));
    f.add(sse("thread.run.step.delta", json(Map.of("delta", Map.of("step_details", Map.of(
        "tool_calls", List.of(Map.of("type", "function", "id", "oa_tc1",
            "function", Map.of("name", "lookup_crm", "arguments", "{\"id\":7}")))))))));
    // 工具步骤完成：function.output 携带工具结果（对应真实 Assistants v2 行为）
    f.add(sse("thread.run.step.completed", json(Map.of("step_details", Map.of(
        "tool_calls", List.of(Map.of("type", "function", "id", "oa_tc1",
            "function", Map.of("name", "lookup_crm", "arguments", "{\"id\":7}",
                "output", "{\"customer\":\"Acme\",\"tier\":\"VIP\"}"))))))));
    f.add(sse("thread.message.delta", json(Map.of("delta", Map.of("content",
        List.of(Map.of("type", "text", "text", Map.of("value", "Assistants "))))))));
    f.add(sse("thread.message.delta", json(Map.of("delta", Map.of("content",
        List.of(Map.of("type", "text", "text", Map.of("value", "协议的问候"))))))));
    f.add(sse("thread.message.completed", json(Map.of("id", "oa_m1"))));
    f.add(sse("thread.run.completed", json(Map.of("id", "oa_run1",
        "usage", Map.of("prompt_tokens", 18, "completion_tokens", 11, "total_tokens", 29)))));
    f.add(sse("done", "[DONE]"));
    return stream(f);
  }

  // ---------- 边界用例（容错与中断验证，统一走 AG-UI 帧格式） ----------

  /** flaky 计数器：每个 key 独立计数，前 N 次返回 503，之后成功（验证自动重连） */
  private final Map<String, java.util.concurrent.atomic.AtomicInteger> flakyCounters =
      new java.util.concurrent.ConcurrentHashMap<>();

  /**
   * 前 2 次请求返回 503，第 3 次起正常回放 AG-UI 流。
   * 用 body.key 区分测试会话，避免多次运行相互污染。
   */
  @PostMapping(value = "/edge/flaky", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public org.springframework.http.ResponseEntity<Flux<ServerSentEvent<String>>> edgeFlaky(
      @RequestBody Map<String, Object> body) {
    String key = String.valueOf(body.getOrDefault("threadId", "default"));
    int n = flakyCounters
        .computeIfAbsent(key, (k) -> new java.util.concurrent.atomic.AtomicInteger())
        .incrementAndGet();
    if (n <= 2) {
      return org.springframework.http.ResponseEntity.status(503).build();
    }
    flakyCounters.remove(key);
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("type", "RUN_STARTED", "threadId", "t1", "runId", "flaky_run"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_START", "messageId", "m1"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_CONTENT", "messageId", "m1", "delta", "重连成功后的完整输出"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_END", "messageId", "m1"))));
    f.add(sse(json(Map.of("type", "RUN_FINISHED"))));
    return org.springframework.http.ResponseEntity.ok(stream(f));
  }

  /** HTTP 500：验证运行时把非 2xx 转成 RUN_ERROR 且流正常终止 */
  @PostMapping("/edge/http-error")
  public org.springframework.http.ResponseEntity<Map<String, Object>> edgeHttpError(
      @RequestBody Map<String, Object> body) {
    return org.springframework.http.ResponseEntity.status(500)
        .body(Map.of("error", "mock internal failure", "code", "E_MOCK_500"));
  }

  /** 协议级错误帧：流中途发 RUN_ERROR，验证错误事件透传且不再补 RUN_FINISHED */
  @PostMapping(value = "/edge/error-frame", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> edgeErrorFrame(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("type", "RUN_STARTED", "threadId", "t1", "runId", "edge_run"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_START", "messageId", "m1"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_CONTENT", "messageId", "m1", "delta", "出错前的部分输出"))));
    f.add(sse(json(Map.of("type", "RUN_ERROR", "message", "mock 工具执行超时", "code", "E_TOOL_TIMEOUT"))));
    return stream(f);
  }

  /** 畸形帧容错：正常帧中夹杂非法 JSON 与未知类型，验证解析器跳过而非崩溃 */
  @PostMapping(value = "/edge/malformed", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> edgeMalformed(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("type", "RUN_STARTED", "threadId", "t1", "runId", "edge_run"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_START", "messageId", "m1"))));
    f.add(sse("{\"type\":\"TEXT_MESSAGE_CONTENT\",\"messageId\":\"m1\",\"delta\":")); // 截断的 JSON
    f.add(sse("not-json-at-all")); // 完全非 JSON
    f.add(sse(json(Map.of("type", "UNKNOWN_FUTURE_EVENT", "foo", "bar")))); // 未知事件类型
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_CONTENT", "messageId", "m1", "delta", "畸形帧之后仍然存活"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_END", "messageId", "m1"))));
    f.add(sse(json(Map.of("type", "RUN_FINISHED"))));
    return stream(f);
  }

  /** 慢速流：帧间 400ms、共 25 帧，供前端验证 AbortSignal 中断（cancelled 收尾） */
  @PostMapping(value = "/edge/slow", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> edgeSlow(@RequestBody Map<String, Object> body) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("type", "RUN_STARTED", "threadId", "t1", "runId", "edge_run"))));
    f.add(sse(json(Map.of("type", "TEXT_MESSAGE_START", "messageId", "m1"))));
    for (int i = 0; i < 22; i++) {
      f.add(sse(json(Map.of("type", "TEXT_MESSAGE_CONTENT", "messageId", "m1", "delta", "块" + i + " "))));
    }
    f.add(sse(json(Map.of("type", "RUN_FINISHED"))));
    return Flux.fromIterable(f).delayElements(Duration.ofMillis(400));
  }
}
