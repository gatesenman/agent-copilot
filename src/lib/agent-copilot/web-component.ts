/**
 * Web Component 集成通道 —— <agent-copilot-chat>
 *
 * 将 CopilotProvider + CopilotChat 封装为框架无关的自定义元素，
 * React / Angular / Svelte / 原生页面均可直接使用（对标 Coze <coze-chat>）。
 *
 * 用法：
 *   import { registerAgentCopilotElements } from '@od/agent-copilot-vue/web-component'
 *   registerAgentCopilotElements()
 *
 *   <agent-copilot-chat
 *     title="AI 助手" theme="auto" brand-color="#0f6b54"
 *     endpoint="/api/agent"                 <!-- 有值走 http 模式；否则浏览器直连 -->
 *     api-base="..." api-key="..." model="..."
 *     style="display:block;height:600px"
 *   ></agent-copilot-chat>
 *
 * 事件：元素上派发 CustomEvent
 *   - 'message'  detail: { role: 'user' | 'assistant', content: string }
 *
 * 说明：采用 shadowRoot: false（Vue 3.5+），组件样式走文档级样式表，
 * 保证 Markdown/KaTeX 等全局样式正常生效，也允许宿主用 CSS 变量定制主题。
 */
import { defineComponent, defineCustomElement, h, watch } from 'vue'
import CopilotProvider from './components/CopilotProvider.vue'
import CopilotChat from './components/chat/CopilotChat.vue'
import { useCopilot } from './composables/useCopilot'
import type { CopilotConfig } from './types'

/** Provider 上下文内的消息桥：完成的消息通过回调上抛 */
const MessageBridge = defineComponent({
  name: 'AcWcMessageBridge',
  props: {
    onMessageEvent: { type: Function, required: true },
  },
  setup(props) {
    const store = useCopilot()
    let reported = 0
    watch(
      () => [store.messages.value.length, store.status.value] as const,
      () => {
        const list = store.messages.value
        const settled = store.status.value === 'running' ? list.length - 1 : list.length
        for (; reported < settled; reported++) {
          const m = list[reported]
          if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue
          props.onMessageEvent({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })
        }
      },
    )
    return () => null
  },
})

const AgentCopilotChatElement = defineComponent({
  name: 'AgentCopilotChatElement',
  props: {
    /** 窗口标题 */
    title: { type: String, default: 'AI 助手' },
    subtitle: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    initialMessage: { type: String, default: '' },
    /** light | dark | auto */
    theme: { type: String, default: 'auto' },
    brandColor: { type: String, default: '' },
    botName: { type: String, default: '' },
    /** 有值 → http 模式对接自有后端 SSE；否则浏览器直连模型 */
    endpoint: { type: String, default: '' },
    apiBase: { type: String, default: '' },
    apiKey: { type: String, default: '' },
    model: { type: String, default: '' },
    showHeader: { type: Boolean, default: true },
  },
  emits: ['message'],
  setup(props, { emit }) {
    function buildConfig(): CopilotConfig {
      const cfg: CopilotConfig = {
        theme: (props.theme === 'dark' || props.theme === 'light' ? props.theme : 'auto') as CopilotConfig['theme'],
        botName: props.botName || props.title,
        suggestions: false,
      }
      if (props.brandColor) cfg.brandColor = props.brandColor
      if (props.endpoint) {
        cfg.runtime = 'http'
        cfg.endpoint = props.endpoint
      } else {
        cfg.runtime = 'browser'
        if (props.apiBase) cfg.apiBase = props.apiBase
        if (props.apiKey) cfg.apiKey = props.apiKey
        if (props.model) cfg.model = props.model
      }
      return cfg
    }

    return () =>
      h(CopilotProvider, { config: buildConfig(), style: 'height:100%;display:flex;flex-direction:column' }, () => [
        h(MessageBridge, { onMessageEvent: (m: unknown) => emit('message', m) }),
        h(CopilotChat, {
          title: props.title,
          subtitle: props.subtitle,
          placeholder: props.placeholder,
          initialMessage: props.initialMessage,
          showHeader: props.showHeader,
          style: 'flex:1;min-height:0',
        }),
      ])
  },
})

/** <agent-copilot-chat> 自定义元素构造器 */
export const AgentCopilotChat = defineCustomElement(AgentCopilotChatElement, { shadowRoot: false })

/** 注册全部自定义元素（幂等，可安全重复调用） */
export function registerAgentCopilotElements(prefix = 'agent-copilot') {
  const tag = `${prefix}-chat`
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
    customElements.define(tag, AgentCopilotChat)
  }
}
