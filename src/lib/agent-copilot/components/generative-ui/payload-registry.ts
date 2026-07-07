/**
 * 载荷渲染注册表 — AG-UI 生成式 UI 扩展点
 *
 * 16 种内置载荷类型各对应一个渲染组件；业务可通过
 * registerPayloadRenderer(type, component) 覆盖内置实现或注册自定义类型。
 */
import type { Component } from 'vue'
import type { StructuredPayloadType } from '../../types'

const registry = new Map<string, Component>()

/** 注册（或覆盖）某载荷类型的渲染组件 */
export function registerPayloadRenderer(type: StructuredPayloadType | (string & {}), component: Component): void {
  registry.set(type, component)
}

/** 获取载荷类型的渲染组件；未注册返回 undefined（由 PayloadCard 走兜底渲染） */
export function getPayloadRenderer(type: string): Component | undefined {
  return registry.get(type)
}

/** 已注册的类型列表 */
export function listPayloadTypes(): string[] {
  return [...registry.keys()]
}
