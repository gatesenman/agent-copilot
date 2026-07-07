<script setup lang="ts">
/**
 * EmbedBridge —— 嵌入页消息桥（无 UI）。
 * 在 CopilotProvider 上下文内监听会话，向父窗口转发消息事件：
 *  { type: 'ac:message', role: 'user' | 'assistant', content: string }
 * 父页面可据此做未读角标、埋点、会话同步等。
 */
import { watch } from 'vue'
import { useCopilot } from '../lib/agent-copilot'

const store = useCopilot()
const isEmbedded = window.self !== window.top

let reported = 0

watch(
  () => [store.messages.value.length, store.status.value] as const,
  () => {
    if (!isEmbedded) return
    // 仅上报"已完成"的消息：运行中最后一条助手消息仍在流式追加，跳过
    const list = store.messages.value
    const settled = store.status.value === 'running' ? list.length - 1 : list.length
    for (; reported < settled; reported++) {
      const m = list[reported]
      if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue
      window.parent.postMessage(
        { type: 'ac:message', role: m.role, content: typeof m.content === 'string' ? m.content : '' },
        '*',
      )
    }
  },
)
</script>

<template>
  <span hidden aria-hidden="true" />
</template>
