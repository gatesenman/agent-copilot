/**
 * 五层配置模型单测：深合并优先级、整体替换语义、undefined 不击穿、patch 分流。
 */
import { describe, expect, it } from 'vitest'
import type { CopilotConfig } from '../types'
import {
  mergeCopilotConfig,
  splitConfigPatch,
  validateCopilotConfig,
  REACTIVE_CONFIG_KEYS,
  STRUCTURAL_CONFIG_KEYS,
} from '../utils/config-merge'

describe('mergeCopilotConfig 深合并', () => {
  it('高层覆盖低层标量', () => {
    const merged = mergeCopilotConfig(
      { model: 'a', temperature: 0.2 },
      { model: 'b' },
    )
    expect(merged.model).toBe('b')
    expect(merged.temperature).toBe(0.2)
  })

  it('嵌套段按键合并而非整体覆盖', () => {
    const merged = mergeCopilotConfig(
      { markdown: { enabled: true, codeHighlight: true } } as Partial<CopilotConfig>,
      { markdown: { codeHighlight: false } } as Partial<CopilotConfig>,
    )
    const md = merged.markdown as { enabled?: boolean; codeHighlight?: boolean }
    expect(md.enabled).toBe(true)
    expect(md.codeHighlight).toBe(false)
  })

  it('undefined 不击穿低层值', () => {
    const merged = mergeCopilotConfig({ model: 'a' }, { model: undefined })
    expect(merged.model).toBe('a')
  })

  it('数组整体替换不做元素合并', () => {
    const merged = mergeCopilotConfig(
      { suggestions: ['a', 'b', 'c'] } as unknown as Partial<CopilotConfig>,
      { suggestions: ['x'] } as unknown as Partial<CopilotConfig>,
    )
    expect(merged.suggestions).toEqual(['x'])
  })

  it('false 显式关闭段整体替换对象', () => {
    const merged = mergeCopilotConfig(
      { messageActions: { copy: true } } as unknown as Partial<CopilotConfig>,
      { messageActions: false } as unknown as Partial<CopilotConfig>,
    )
    expect(merged.messageActions).toBe(false)
  })

  it('函数与类实例整体替换', () => {
    const fn1 = () => 1
    const fn2 = () => 2
    const merged = mergeCopilotConfig(
      { callbacks: { onError: fn1 } } as Partial<CopilotConfig>,
      { callbacks: { onError: fn2 } } as Partial<CopilotConfig>,
    )
    expect(merged.callbacks?.onError).toBe(fn2)
  })

  it('四层链依次覆盖（默认<预设<全局<实例）', () => {
    const merged = mergeCopilotConfig(
      { model: 'default', locale: 'zh-CN', theme: 'light' },
      { model: 'preset' },
      { model: 'global', theme: 'dark' },
      { model: 'instance' },
    )
    expect(merged.model).toBe('instance')
    expect(merged.theme).toBe('dark')
    expect(merged.locale).toBe('zh-CN')
  })

  it('null/undefined 层被跳过', () => {
    const merged = mergeCopilotConfig(undefined, { model: 'a' }, null, undefined)
    expect(merged.model).toBe('a')
  })
})

describe('splitConfigPatch 分流', () => {
  it('响应式键与结构键正确分流', () => {
    const { reactive, structural } = splitConfigPatch({
      model: 'gpt-x', theme: 'dark', endpoint: '/api/new', provider: 'dify',
    } as Partial<CopilotConfig>)
    expect(Object.keys(reactive).sort()).toEqual(['model', 'theme'])
    expect(Object.keys(structural).sort()).toEqual(['endpoint', 'provider'])
  })

  it('undefined 值被忽略', () => {
    const { reactive, structural } = splitConfigPatch({ model: undefined, endpoint: undefined })
    expect(Object.keys(reactive)).toHaveLength(0)
    expect(Object.keys(structural)).toHaveLength(0)
  })

  it('响应式与结构键集合无交集', () => {
    for (const key of REACTIVE_CONFIG_KEYS) {
      expect(STRUCTURAL_CONFIG_KEYS.has(key)).toBe(false)
    }
  })
})

describe('validateCopilotConfig 校验', () => {
  it('http 模式缺 endpoint 告警', () => {
    const warnings = validateCopilotConfig({ runtime: 'http' } as CopilotConfig)
    expect(warnings.some((w) => w.includes('endpoint'))).toBe(true)
  })

  it('agent 协议缺 endpoint 告警', () => {
    const warnings = validateCopilotConfig({ protocol: 'dify' } as CopilotConfig)
    expect(warnings.some((w) => w.includes('endpoint'))).toBe(true)
  })

  it('temperature 越界告警', () => {
    const warnings = validateCopilotConfig({ temperature: 3 } as CopilotConfig)
    expect(warnings.some((w) => w.includes('temperature'))).toBe(true)
  })

  it('合法配置零告警', () => {
    const warnings = validateCopilotConfig({
      runtime: 'http', endpoint: '/api/agent', temperature: 0.7,
    } as CopilotConfig)
    expect(warnings).toHaveLength(0)
  })
})
