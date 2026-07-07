/**
 * openai-compatible — OpenAI Chat Completions 标准协议适配器
 *
 * 覆盖厂商（见 presets.ts）：OpenAI / Azure OpenAI / 硅基流动 / DeepSeek / Kimi /
 * 智谱 GLM / 通义千问 / 混元 / 豆包 / 百川 / MiniMax / 零一 / 阶跃 / Groq /
 * Mistral / xAI / Together / OpenRouter / vLLM / Ollama(v1) 等。
 *
 * LlmClient 即该协议的实现；Azure 通过 api-key 头 + api-version 查询参数接入。
 */
import { LlmClient } from '../../runtime/llm-client'
import type { ModelAdapter, ModelAdapterOptions } from '../types'

export function createOpenAICompatibleAdapter(opts: ModelAdapterOptions): ModelAdapter {
  const apiVersion = typeof opts.extra?.apiVersion === 'string' ? (opts.extra.apiVersion as string) : undefined

  return new LlmClient({
    apiBase: opts.apiBase,
    apiKey: opts.apiKey,
    model: opts.model,
    extraHeaders: opts.headers,
    // Azure OpenAI：api-key 认证头 + api-version 查询参数
    ...(apiVersion
      ? { authStyle: 'api-key-header' as const, queryParams: { 'api-version': apiVersion } }
      : {}),
  })
}
