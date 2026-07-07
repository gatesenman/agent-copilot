/**
 * mcp — MCP（Model Context Protocol）客户端
 * https://modelcontextprotocol.io — Anthropic 发起的模型-工具/资源连接标准。
 *
 * 定位：MCP 不是对话协议，而是「工具/资源/提示模板」的供给协议。
 * 本客户端实现 Streamable HTTP 传输（2025-03-26 修订版），把 MCP 服务器的
 * tools 桥接为 CopilotActionDef，供 BrowserAgentRuntime 的 ReAct 循环调用 ——
 * 即任何 A 类模型协议 + MCP 服务器即可组合出「模型 + 企业工具」的完整智能体。
 *
 * 用法：
 *   const mcp = new McpClient({ endpoint: 'https://mcp.example.com/mcp' })
 *   await mcp.connect()
 *   const actions = await mcp.asActions()   // 注入 CopilotProvider 的 actions
 */
import type { CopilotActionDef } from '../types'

export interface McpClientOptions {
  endpoint: string
  /** Authorization: Bearer 头 */
  apiKey?: string
  headers?: Record<string, string>
  /** 客户端标识 */
  clientInfo?: { name: string; version: string }
}

export interface McpTool {
  name: string
  description?: string
  inputSchema?: { type: 'object'; properties?: Record<string, any>; required?: string[] }
}

export interface McpResource {
  uri: string
  name?: string
  description?: string
  mimeType?: string
}

export interface McpPrompt {
  name: string
  description?: string
  arguments?: { name: string; description?: string; required?: boolean }[]
}

export class McpClient {
  private nextId = 1
  private sessionId: string | null = null
  /** 服务器声明信息（connect 后可读） */
  serverInfo: { name?: string; version?: string; capabilities?: Record<string, unknown> } = {}

  constructor(private options: McpClientOptions) {}

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {}),
      ...(this.sessionId ? { 'Mcp-Session-Id': this.sessionId } : {}),
      ...this.options.headers,
    }
  }

  /** JSON-RPC 调用（Streamable HTTP：响应可能是 JSON 或单事件 SSE） */
  private async rpc<T = any>(method: string, params?: unknown): Promise<T> {
    const res = await fetch(this.options.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: this.nextId++, method, params }),
    })
    if (!res.ok) {
      throw new Error(`MCP 请求失败（${res.status}）：${await res.text().catch(() => '')}`)
    }
    // 会话 id 由 initialize 响应头下发
    const sid = res.headers.get('Mcp-Session-Id')
    if (sid) this.sessionId = sid

    const contentType = res.headers.get('Content-Type') ?? ''
    if (contentType.includes('text/event-stream')) {
      // 单响应 SSE：取第一个 data 帧
      const raw = await res.text()
      const dataLine = raw.split('\n').find((l) => l.startsWith('data:'))
      const parsed = dataLine ? JSON.parse(dataLine.slice(5).trim()) : null
      if (parsed?.error) throw new Error(`MCP 错误：${parsed.error.message}`)
      return parsed?.result as T
    }
    const json = await res.json()
    if (json.error) throw new Error(`MCP 错误：${json.error.message}`)
    return json.result as T
  }

  /** 通知（无响应体） */
  private async notify(method: string, params?: unknown): Promise<void> {
    await fetch(this.options.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ jsonrpc: '2.0', method, params }),
    }).catch(() => {})
  }

  /** 初始化握手（协议版本协商 + capabilities 交换） */
  async connect(): Promise<void> {
    const result = await this.rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: this.options.clientInfo ?? { name: 'agent-copilot-vue', version: '1.0.0' },
    })
    this.serverInfo = {
      name: result?.serverInfo?.name,
      version: result?.serverInfo?.version,
      capabilities: result?.capabilities ?? {},
    }
    await this.notify('notifications/initialized')
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.rpc('tools/list')
    return result?.tools ?? []
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await this.rpc('tools/call', { name, arguments: args })
    // content 数组：text 拼接，json 直接返回
    const contents = result?.content ?? []
    const jsonPart = contents.find((c: any) => c.type === 'resource' || c.type === 'json')
    if (jsonPart) return jsonPart.resource ?? jsonPart.json
    const textParts = contents.filter((c: any) => c.type === 'text').map((c: any) => c.text)
    if (result?.isError) throw new Error(textParts.join('\n') || 'MCP 工具执行失败')
    return textParts.length === 1 ? textParts[0] : textParts.join('\n')
  }

  async listResources(): Promise<McpResource[]> {
    const result = await this.rpc('resources/list')
    return result?.resources ?? []
  }

  async readResource(uri: string): Promise<unknown> {
    const result = await this.rpc('resources/read', { uri })
    return result?.contents ?? []
  }

  async listPrompts(): Promise<McpPrompt[]> {
    const result = await this.rpc('prompts/list')
    return result?.prompts ?? []
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<unknown> {
    const result = await this.rpc('prompts/get', { name, arguments: args })
    return result?.messages ?? []
  }

  /**
   * 把 MCP tools 桥接为 CopilotActionDef —— handler 内部走 tools/call。
   * BrowserAgentRuntime 的 ReAct 循环即可像本地工具一样调用 MCP 服务器工具。
   */
  async asActions(): Promise<CopilotActionDef[]> {
    const tools = await this.listTools()
    return tools.map((t) => ({
      name: t.name,
      description: t.description ?? t.name,
      parameters: Object.entries(t.inputSchema?.properties ?? {}).map(([name, schema]: [string, any]) => ({
        name,
        type: (schema.type === 'number' || schema.type === 'integer') ? 'number'
          : schema.type === 'boolean' ? 'boolean'
          : schema.type === 'object' ? 'object'
          : 'string',
        description: schema.description ?? '',
        required: (t.inputSchema?.required ?? []).includes(name),
      })),
      handler: async (args: Record<string, unknown>) => this.callTool(t.name, args),
    }))
  }
}
