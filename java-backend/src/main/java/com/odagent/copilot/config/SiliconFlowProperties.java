package com.odagent.copilot.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 硅基流动 LLM 服务配置。
 */
@ConfigurationProperties(prefix = "siliconflow")
public record SiliconFlowProperties(
        String apiBase,
        String apiKey,
        String model,
        Double temperature,
        Integer maxTokens
) {
}
