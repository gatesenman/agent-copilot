/**
 * 厂商预设表 — config.provider 一个字段即可接入 20+ 厂商
 *
 * 例：{ provider: 'deepseek', apiKey: 'sk-...' }
 * 自动推断 apiBase / 默认模型 / 协议。
 */
import type { ProviderPreset } from './types'

export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  // ============ OpenAI 兼容协议厂商（openai-compatible） ============
  openai: {
    id: 'openai', label: 'OpenAI', protocol: 'openai-compatible',
    apiBase: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini',
  },
  'azure-openai': {
    id: 'azure-openai', label: 'Azure OpenAI', protocol: 'openai-compatible',
    apiBase: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}',
    defaultModel: 'gpt-4o-mini',
    notes: 'protocolOptions: { apiVersion: "2024-06-01" }；apiBase 中替换 {resource}/{deployment}',
  },
  siliconflow: {
    id: 'siliconflow', label: '硅基流动 SiliconFlow', protocol: 'openai-compatible',
    apiBase: 'https://api.siliconflow.cn/v1', defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
  },
  deepseek: {
    id: 'deepseek', label: 'DeepSeek 深度求索', protocol: 'openai-compatible',
    apiBase: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat',
  },
  moonshot: {
    id: 'moonshot', label: 'Moonshot Kimi', protocol: 'openai-compatible',
    apiBase: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k',
  },
  zhipu: {
    id: 'zhipu', label: '智谱 GLM', protocol: 'openai-compatible',
    apiBase: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4-flash',
  },
  qwen: {
    id: 'qwen', label: '通义千问 DashScope', protocol: 'openai-compatible',
    apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus',
  },
  hunyuan: {
    id: 'hunyuan', label: '腾讯混元', protocol: 'openai-compatible',
    apiBase: 'https://api.hunyuan.cloud.tencent.com/v1', defaultModel: 'hunyuan-turbo',
  },
  doubao: {
    id: 'doubao', label: '字节豆包（方舟）', protocol: 'openai-compatible',
    apiBase: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: '',
    notes: 'model 填方舟推理接入点 ID（ep-xxx）',
  },
  baichuan: {
    id: 'baichuan', label: '百川智能', protocol: 'openai-compatible',
    apiBase: 'https://api.baichuan-ai.com/v1', defaultModel: 'Baichuan4',
  },
  minimax: {
    id: 'minimax', label: 'MiniMax', protocol: 'openai-compatible',
    apiBase: 'https://api.minimax.chat/v1', defaultModel: 'abab6.5s-chat',
  },
  yi: {
    id: 'yi', label: '零一万物 Yi', protocol: 'openai-compatible',
    apiBase: 'https://api.lingyiwanwu.com/v1', defaultModel: 'yi-lightning',
  },
  stepfun: {
    id: 'stepfun', label: '阶跃星辰 Step', protocol: 'openai-compatible',
    apiBase: 'https://api.stepfun.com/v1', defaultModel: 'step-1-8k',
  },
  groq: {
    id: 'groq', label: 'Groq', protocol: 'openai-compatible',
    apiBase: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile',
  },
  mistral: {
    id: 'mistral', label: 'Mistral AI', protocol: 'openai-compatible',
    apiBase: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest',
  },
  xai: {
    id: 'xai', label: 'xAI Grok', protocol: 'openai-compatible',
    apiBase: 'https://api.x.ai/v1', defaultModel: 'grok-2-latest',
  },
  together: {
    id: 'together', label: 'Together AI', protocol: 'openai-compatible',
    apiBase: 'https://api.together.xyz/v1', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  },
  openrouter: {
    id: 'openrouter', label: 'OpenRouter', protocol: 'openai-compatible',
    apiBase: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o-mini',
  },
  vllm: {
    id: 'vllm', label: 'vLLM 自托管', protocol: 'openai-compatible',
    apiBase: 'http://localhost:8000/v1', defaultModel: '',
    notes: 'model 填部署的模型名',
  },
  'ollama-v1': {
    id: 'ollama-v1', label: 'Ollama（OpenAI 兼容端点）', protocol: 'openai-compatible',
    apiBase: 'http://localhost:11434/v1', defaultModel: 'llama3.2',
  },

  // ============ 专有模型协议 ============
  anthropic: {
    id: 'anthropic', label: 'Anthropic Claude', protocol: 'anthropic',
    apiBase: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-4-5',
    notes: '浏览器直连需 anthropic-dangerous-direct-browser-access 头（适配器自动附加）',
  },
  gemini: {
    id: 'gemini', label: 'Google Gemini', protocol: 'gemini',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-2.0-flash',
  },
  'ollama-native': {
    id: 'ollama-native', label: 'Ollama（原生 /api/chat）', protocol: 'ollama-native',
    apiBase: 'http://localhost:11434', defaultModel: 'llama3.2',
  },
  cohere: {
    id: 'cohere', label: 'Cohere', protocol: 'cohere',
    apiBase: 'https://api.cohere.com', defaultModel: 'command-r-plus',
  },

  // ============ Agent 框架协议 ============
  'ag-ui': {
    id: 'ag-ui', label: 'AG-UI 标准协议', protocol: 'ag-ui',
    apiBase: 'http://localhost:8000/awp',
    notes: 'endpoint 为 AG-UI agent 端点',
  },
  langgraph: {
    id: 'langgraph', label: 'LangGraph Platform', protocol: 'langgraph',
    apiBase: 'http://localhost:2024',
    notes: 'protocolOptions: { assistantId: "agent" }',
  },
  langserve: {
    id: 'langserve', label: 'LangChain LangServe', protocol: 'langserve',
    apiBase: 'http://localhost:8000/chain',
    notes: 'endpoint 为链的根路径，适配器调用 {endpoint}/stream_events',
  },
  agentscope: {
    id: 'agentscope', label: 'AgentScope（Java 后端）', protocol: 'agentscope',
    apiBase: 'http://localhost:8080/api/agent',
    notes: '本项目 java-backend 的原生协议，支持全部能力',
  },
  'ai-sdk': {
    id: 'ai-sdk', label: 'Vercel AI SDK', protocol: 'ai-sdk',
    apiBase: '/api/chat',
    notes: 'Data Stream Protocol（useChat 兼容端点）',
  },
  dify: {
    id: 'dify', label: 'Dify', protocol: 'dify',
    apiBase: 'https://api.dify.ai/v1',
    notes: 'protocolOptions: { user: "用户标识" }；工具由 Dify 服务端编排',
  },
  coze: {
    id: 'coze', label: 'Coze 扣子', protocol: 'coze',
    apiBase: 'https://api.coze.cn',
    notes: 'protocolOptions: { botId: "bot_id", userId: "user_id" }',
  },
  fastgpt: {
    id: 'fastgpt', label: 'FastGPT', protocol: 'fastgpt',
    apiBase: 'https://api.fastgpt.in/api',
    notes: 'OpenAI 兼容 + detail 事件扩展（flowNodeStatus → 流水线事件）',
  },

  // ============ AI 行业互操作协议 ============
  a2a: {
    id: 'a2a', label: 'A2A（Agent-to-Agent）', protocol: 'a2a',
    apiBase: 'http://localhost:9999',
    notes: 'JSON-RPC message/stream；Agent Card 位于 /.well-known/agent-card.json；input-required → HITL',
  },
  acp: {
    id: 'acp', label: 'ACP（BeeAI）', protocol: 'acp',
    apiBase: 'http://localhost:8000',
    notes: 'protocolOptions: { agentName: "目标Agent名" }；awaiting → HITL',
  },
  'openai-assistants': {
    id: 'openai-assistants', label: 'OpenAI Assistants API', protocol: 'openai-assistants',
    apiBase: 'https://api.openai.com/v1',
    notes: 'protocolOptions: { assistantId: "asst_..." }；requires_action → HITL',
  },
}

export function getProviderPreset(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS[id]
}

export function listProviderPresets(): ProviderPreset[] {
  return Object.values(PROVIDER_PRESETS)
}
