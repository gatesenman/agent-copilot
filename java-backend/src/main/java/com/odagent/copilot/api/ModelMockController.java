package com.odagent.copilot.api;

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
 * 模型协议一致性测试 Mock —— 按 5 种模型协议的官方流帧格式回放固定脚本，
 * 供前端 protocols/model/* 适配器做端到端解析验证。
 *
 * 每种协议覆盖 4 个特征：文本增量、工具调用（增量或整体）、usage 统计、结束原因。
 */
@RestController
@RequestMapping("/api/mock/model")
public class ModelMockController {

  private final ObjectMapper om = new ObjectMapper();

  private String json(Object o) {
    try { return om.writeValueAsString(o); } catch (Exception e) { throw new RuntimeException(e); }
  }

  /** SSE 帧（纯 data，无 event 名）——由 Spring 负责 data: 前缀序列化 */
  private static ServerSentEvent<String> sse(String data) {
    return ServerSentEvent.builder(data).build();
  }

  /** SSE 帧（带 event 名，Anthropic 风格） */
  private static ServerSentEvent<String> sse(String event, String data) {
    return ServerSentEvent.builder(data).event(event).build();
  }

  private static Flux<ServerSentEvent<String>> stream(List<ServerSentEvent<String>> frames) {
    return Flux.fromIterable(frames).delayElements(Duration.ofMillis(20));
  }

  private static Flux<String> streamRaw(List<String> frames) {
    return Flux.fromIterable(frames).delayElements(Duration.ofMillis(20));
  }

  // ---------- 1) openai-compatible：/chat/completions SSE ----------
  @PostMapping(value = "/openai/chat/completions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> openaiCompatible() {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("choices", List.of(Map.of("index", 0,
        "delta", Map.of("role", "assistant", "content", "来自 ")))))));
    f.add(sse(json(Map.of("choices", List.of(Map.of("index", 0,
        "delta", Map.of("content", "OpenAI 兼容协议的回复")))))));
    // 工具调用增量（两帧拼出完整 arguments）
    Map<String, Object> tcFrame1 = Map.of("index", 0, "id", "call_oc1",
        "function", Map.of("name", "get_weather", "arguments", "{\"city\":"));
    f.add(sse(json(Map.of("choices", List.of(Map.of("index", 0,
        "delta", Map.of("tool_calls", List.of(tcFrame1))))))));
    Map<String, Object> tcFrame2 = Map.of("index", 0,
        "function", Map.of("arguments", "\"北京\"}"));
    f.add(sse(json(Map.of("choices", List.of(Map.of("index", 0,
        "delta", Map.of("tool_calls", List.of(tcFrame2))))))));
    f.add(sse(json(Map.of(
        "choices", List.of(Map.of("index", 0, "delta", Map.of(), "finish_reason", "tool_calls")),
        "usage", Map.of("prompt_tokens", 12, "completion_tokens", 8, "total_tokens", 20)))));
    f.add(sse("[DONE]"));
    return stream(f);
  }

  // ---------- 2) anthropic：/v1/messages SSE（带 event 名） ----------
  @PostMapping(value = "/anthropic/v1/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> anthropic() {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse("message_start", json(Map.of("type", "message_start",
        "message", Map.of("usage", Map.of("input_tokens", 15))))));
    f.add(sse("content_block_start", json(Map.of("type", "content_block_start", "index", 0,
        "content_block", Map.of("type", "text", "text", "")))));
    f.add(sse("content_block_delta", json(Map.of("type", "content_block_delta", "index", 0,
        "delta", Map.of("type", "text_delta", "text", "来自 Anthropic 协议的回复")))));
    f.add(sse("content_block_start", json(Map.of("type", "content_block_start", "index", 1,
        "content_block", Map.of("type", "tool_use", "id", "toolu_a1", "name", "get_weather")))));
    f.add(sse("content_block_delta", json(Map.of("type", "content_block_delta", "index", 1,
        "delta", Map.of("type", "input_json_delta", "partial_json", "{\"city\":\"北京\"}")))));
    f.add(sse("message_delta", json(Map.of("type", "message_delta",
        "delta", Map.of("stop_reason", "tool_use"),
        "usage", Map.of("output_tokens", 9)))));
    f.add(sse("message_stop", json(Map.of("type", "message_stop"))));
    return stream(f);
  }

  // ---------- 3) gemini：/models/{spec} SSE（spec 含 ":streamGenerateContent"） ----------
  @PostMapping(value = "/gemini/models/{spec}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> gemini(@PathVariable String spec) {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("candidates", List.of(Map.of("content", Map.of(
        "parts", List.of(Map.of("text", "来自 Gemini 协议的回复")))))))));
    f.add(sse(json(Map.of("candidates", List.of(Map.of("content", Map.of(
        "parts", List.of(Map.of("functionCall", Map.of(
            "name", "get_weather", "args", Map.of("city", "北京")))))))))));
    f.add(sse(json(Map.of(
        "candidates", List.of(Map.of(
            "content", Map.of("parts", List.of()),
            "finishReason", "STOP")),
        "usageMetadata", Map.of("promptTokenCount", 11, "candidatesTokenCount", 7, "totalTokenCount", 18)))));
    return stream(f);
  }

  // ---------- 4) cohere：/v2/chat SSE（专有事件类型） ----------
  @PostMapping(value = "/cohere/v2/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> cohere() {
    List<ServerSentEvent<String>> f = new ArrayList<>();
    f.add(sse(json(Map.of("type", "message-start"))));
    f.add(sse(json(Map.of("type", "content-delta",
        "delta", Map.of("message", Map.of("content", Map.of("text", "来自 Cohere 协议的回复")))))));
    f.add(sse(json(Map.of("type", "tool-call-start", "index", 0,
        "delta", Map.of("message", Map.of("tool_calls", Map.of("id", "co_tc1",
            "function", Map.of("name", "get_weather", "arguments", "{\"city\":"))))))));
    f.add(sse(json(Map.of("type", "tool-call-delta", "index", 0,
        "delta", Map.of("message", Map.of("tool_calls", Map.of(
            "function", Map.of("arguments", "\"北京\"}"))))))));
    f.add(sse(json(Map.of("type", "message-end",
        "delta", Map.of(
            "finish_reason", "TOOL_CALL",
            "usage", Map.of("billed_units", Map.of("input_tokens", 10, "output_tokens", 6)))))));
    return stream(f);
  }

  // ---------- 5) ollama-native：/api/chat NDJSON（非 SSE） ----------
  @PostMapping(value = "/ollama/api/chat", produces = MediaType.APPLICATION_NDJSON_VALUE)
  public Flux<String> ollama() {
    List<String> f = new ArrayList<>();
    f.add(json(Map.of("message", Map.of("role", "assistant", "content", "来自 "), "done", false)) + "\n");
    f.add(json(Map.of("message", Map.of("role", "assistant", "content", "Ollama 原生协议的回复"), "done", false)) + "\n");
    f.add(json(Map.of("message", Map.of("role", "assistant", "content", "",
        "tool_calls", List.of(Map.of("function", Map.of(
            "name", "get_weather", "arguments", Map.of("city", "北京"))))), "done", false)) + "\n");
    f.add(json(Map.of("message", Map.of("role", "assistant", "content", ""),
        "done", true, "prompt_eval_count", 14, "eval_count", 5)) + "\n");
    return streamRaw(f);
  }
}
