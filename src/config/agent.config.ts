/**
 * 全局 Agent 配置（按用户要求：Key 明文写在配置文件中）
 *
 * 注意：明文 Key 存在泄露风险，生产环境请改用 HttpAgentRuntime 对接 Java 后端，
 * Key 只保存在服务端 application.yml。
 */

export const AGENT_CONFIG = {
  /** 硅基流动 OpenAI 兼容 API */
  siliconflow: {
    apiBase: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-agldbqufcjxuxosrcjfvgbvifikfhqhtqtteactzaompembe',
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
