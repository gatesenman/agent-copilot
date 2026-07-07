package com.odagent.copilot.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Agent 运行时配置（US-012 治理规则 / US-011 ReAct 循环参数）。
 */
@ConfigurationProperties(prefix = "agent")
public record AgentProperties(
        Integer maxIterations,
        List<String> approvalRequiredTools,
        List<String> corsOrigins,
        String systemPrompt
) {
    public String systemPromptOrDefault() {
        return systemPrompt != null && !systemPrompt.isBlank()
                ? systemPrompt
                : "你是企业 AI 助手。帮助用户完成工作项查询、审批流创建、评估对比与执行指派。"
                + "回复使用简体中文 Markdown。";
    }
}
