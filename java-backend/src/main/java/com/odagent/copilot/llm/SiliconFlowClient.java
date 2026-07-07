package com.odagent.copilot.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.odagent.copilot.config.SiliconFlowProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

/**
 * 硅基流动（SiliconFlow）OpenAI 兼容接口客户端。
 * 支持流式 chat/completions 与 function calling。
 */
@Component
public class SiliconFlowClient {

  private final WebClient webClient;
  private final SiliconFlowProperties props;
  private final ObjectMapper mapper = new ObjectMapper();

  public SiliconFlowClient(SiliconFlowProperties props) {
    this.props = props;
    this.webClient = WebClient.builder()
        .baseUrl(props.apiBase())
        .defaultHeader("Authorization", "Bearer " + props.apiKey())
        .build();
  }

  /** 非流式补全（用于意图识别、本体推理等内部阶段） */
  public Mono<JsonNode> complete(List<Map<String, Object>> messages, double temperature) {
    ObjectNode body = mapper.createObjectNode();
    body.put("model", props.model());
    body.put("temperature", temperature);
    body.put("stream", false);
    body.set("messages", mapper.valueToTree(messages));
    return webClient.post()
        .uri("/chat/completions")
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(body)
        .retrieve()
        .bodyToMono(JsonNode.class);
  }

  /**
   * 流式补全，支持 tools。
   * 返回原始 SSE data 行（JSON chunk），由 ReactAgentEngine 解析。
   */
  public Flux<JsonNode> streamWithTools(
      List<Map<String, Object>> messages,
      List<Map<String, Object>> tools,
      double temperature
  ) {
    return streamWithTools(messages, tools, temperature, false);
  }

  /**
   * 流式补全，支持 tools 与深度思考。
   *
   * @param enableThinking true 时请求 reasoning 输出（Qwen3 等混合推理模型的
   *                       enable_thinking 开关；模型侧 delta.reasoning_content
   *                       由 ReactAgentEngine 转为 THINKING_* 事件）
   */
  public Flux<JsonNode> streamWithTools(
      List<Map<String, Object>> messages,
      List<Map<String, Object>> tools,
      double temperature,
      boolean enableThinking
  ) {
    ObjectNode body = mapper.createObjectNode();
    body.put("model", props.model());
    body.put("temperature", temperature);
    body.put("stream", true);
    if (enableThinking) {
      body.put("enable_thinking", true);
    }
    body.set("messages", mapper.valueToTree(messages));
    if (tools != null && !tools.isEmpty()) {
      ArrayNode toolsNode = mapper.valueToTree(tools);
      body.set("tools", toolsNode);
      body.put("tool_choice", "auto");
    }
    return webClient.post()
        .uri("/chat/completions")
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.TEXT_EVENT_STREAM)
        .bodyValue(body)
        .retrieve()
        .bodyToFlux(String.class)
        .filter(line -> !line.isBlank() && !"[DONE]".equals(line.trim()))
        .mapNotNull(line -> {
          try {
            return mapper.readTree(line);
          } catch (Exception e) {
            return null;
          }
        });
  }
}
