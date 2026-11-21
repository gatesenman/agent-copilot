/**
 * 全局 Agent 配置。
 *
 * API 密钥请通过环境变量 VITE_SILICONFLOW_API_KEY 提供，不要把真实密钥提交到仓库。
 * 生产环境请改用 HttpAgentRuntime 对接 Java 后端，由服务端持有 SILICONFLOW_API_KEY。
 */

export const AGENT_CONFIG = {
  /** 硅基流动 OpenAI 兼容 API */
  siliconflow: {
    apiBase: 'https://api.siliconflow.cn/v1',
    apiKey: import.meta.env.VITE_SILICONFLOW_API_KEY ?? '',
    /** 对话主模型 */
    model: 'Qwen/Qwen2.5-72B-Instruct',
    /** 轻量模型（用于建议问题、Textarea 补全等低成本任务） */
    lightModel: 'Qwen/Qwen2.5-7B-Instruct',
  },
  /** Java 后端地址（HttpAgentRuntime 使用） */
  javaBackend: {
    endpoint: 'http://localhost:8080/api/agent',
  },
} as const
