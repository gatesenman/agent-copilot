/**
 * createCopilot — 应用级插件（标准集成入口）。
 *
 * 提供全局默认配置层：apiBase / apiKey / locale / theme 等应用级参数
 * 只在 app.use() 配置一次，页面内任意多个 CopilotProvider / AgentCopilot /
 * CopilotSidebar 实例自动继承，config prop 仅做实例级差异覆盖。
 *
 * @example
 * // main.ts —— 应用级默认（第 3 层）
 * import { createCopilot, defineCopilotConfig } from 'agent-copilot'
 * app.use(createCopilot(defineCopilotConfig({
 *   runtime: 'http',
 *   endpoint: '/api/copilot',
 *   locale: 'zh-CN',
 *   theme: 'auto',
 * })))
 *
 * // 页面 —— 实例级差异（第 4 层，深合并覆盖全局默认）
 * <CopilotSidebar :config="{ agentType: 'code', model: 'gpt-5' }" />
 */
import type { App, InjectionKey, Plugin } from 'vue'
import type { CopilotConfig } from './types'
import { validateAndWarn } from './utils/config-merge'

/**
 * 全局默认配置注入键。
 * 与 COPILOT_KEY 相同原因使用 Symbol.for：HMR 重新求值模块时保证键引用一致。
 */
export const COPILOT_GLOBAL_DEFAULTS_KEY: InjectionKey<Partial<CopilotConfig>> =
  Symbol.for('agent-copilot:global-defaults')

/**
 * 类型助手：宿主把配置抽到独立文件时获得完整补全与类型检查。
 * 纯 identity 函数，无运行时开销。
 */
export function defineCopilotConfig<T extends Partial<CopilotConfig>>(config: T): T {
  return config
}

/**
 * 创建 Copilot 应用插件。
 * @param globalDefaults 应用级默认配置（合并优先级：内置默认 < agentType 预设 < 此层 < config prop）
 */
export function createCopilot(globalDefaults: Partial<CopilotConfig> = {}): Plugin {
  return {
    install(app: App) {
      // 全局默认层不含 agentType 语义（预设由实例层触发），此处仅做基础校验
      validateAndWarn(globalDefaults as CopilotConfig)
      app.provide(COPILOT_GLOBAL_DEFAULTS_KEY, globalDefaults)
    },
  }
}
