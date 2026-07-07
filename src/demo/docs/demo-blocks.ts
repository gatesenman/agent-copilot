/**
 * 文档演示块注册表 — markdown 中以 [demo:名称] 标记引用。
 * DocsView 解析标记后按名称渲染对应演示组件（异步加载，不影响文档首屏）。
 */
import { defineAsyncComponent, type Component } from 'vue'

export const DEMO_BLOCKS: Record<string, Component> = {
  'input-toolbar': defineAsyncComponent(() => import('./blocks/InputToolbarDemo.vue')),
  'mode-selector': defineAsyncComponent(() => import('./blocks/ModeSelectorDemo.vue')),
  'thinking-block': defineAsyncComponent(() => import('./blocks/ThinkingBlockDemo.vue')),
  'markdown-live': defineAsyncComponent(() => import('./blocks/MarkdownLiveDemo.vue')),
  'protocol-badge': defineAsyncComponent(() => import('./blocks/ProtocolBadgeDemo.vue')),
  'session-list': defineAsyncComponent(() => import('./blocks/SessionListDemo.vue')),
  'usage-meter': defineAsyncComponent(() => import('./blocks/UsageMeterDemo.vue')),
  'task-tracker': defineAsyncComponent(() => import('./blocks/TaskTrackerDemo.vue')),
  'plan-panel': defineAsyncComponent(() => import('./blocks/PlanPanelDemo.vue')),
  'change-review': defineAsyncComponent(() => import('./blocks/ChangeReviewDemo.vue')),
  'agent-form': defineAsyncComponent(() => import('./blocks/AgentFormDemo.vue')),
}

/**
 * 把文档内容按 [demo:name] 标记切分为交替的
 * { kind: 'md', content } / { kind: 'demo', name } 片段。
 */
export function splitDocContent(content: string): ({ kind: 'md'; content: string } | { kind: 'demo'; name: string })[] {
  const out: ({ kind: 'md'; content: string } | { kind: 'demo'; name: string })[] = []
  const re = /^\[demo:([\w-]+)\]$/gm
  let last = 0
  for (const m of content.matchAll(re)) {
    const before = content.slice(last, m.index).trim()
    if (before) out.push({ kind: 'md', content: before })
    if (DEMO_BLOCKS[m[1]]) out.push({ kind: 'demo', name: m[1] })
    last = (m.index ?? 0) + m[0].length
  }
  const rest = content.slice(last).trim()
  if (rest) out.push({ kind: 'md', content: rest })
  return out
}
