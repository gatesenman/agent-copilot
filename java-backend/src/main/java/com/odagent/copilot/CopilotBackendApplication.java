package com.odagent.copilot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Agent Copilot 后端启动类。
 *
 * <p>实现 AgentScope 风格的 5+1 流水线（US-008 ~ US-014），
 * 通过 SSE 与 agent-copilot Vue 组件库的 HttpAgentRuntime 对接。</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
public class CopilotBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(CopilotBackendApplication.class, args);
    }
}
