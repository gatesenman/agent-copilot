<script setup lang="ts">
/** 输入框增强演示：附件 / 语音 / 思考开关，可实时改配置 */
import { ref } from 'vue'
import ChatInput from '../../../lib/agent-copilot/components/chat/ChatInput.vue'
import DocDemo from '../DocDemo.vue'

const thinkingOn = ref(false)
const lastAction = ref('')
</script>

<template>
  <DocDemo
    title="输入框增强"
    description="附件上传、语音输入、深度思考开关都由属性控制，事件回调交由宿主实现。"
    component-name="ChatInput"
    usage="通常不直接使用——CopilotChat 内部已集成，并由 config（attachments/sendOnEnter/commands 等）驱动。需要独立聊天输入框（如评论区 AI 辅助）时可单独引入，事件回调全部由宿主实现。"
    :props-table="[
      { name: 'showAttachButton', type: 'boolean', default: 'false', description: '附件上传按钮' },
      { name: 'showVoiceButton', type: 'boolean', default: 'false', description: '语音输入按钮（Web Speech API）' },
      { name: 'showThinkingToggle', type: 'boolean', default: 'false', description: '深度思考开关' },
      { name: 'thinkingOn', type: 'boolean', default: 'false', description: '思考开关状态（v-model:thinking-on）' },
      { name: 'placeholder', type: 'string', description: '占位文案' },
      { name: 'disabled', type: 'boolean', default: 'false', description: '禁用输入' },
      { name: '@send', type: '(text: string, attachments?: File[]) => void', description: '发送消息' },
      { name: '@attach', type: '(files: File[]) => void', description: '选择附件' },
    ]"
    :controls="[
      { name: 'showAttachButton', label: '附件按钮', type: 'boolean', default: true },
      { name: 'showVoiceButton', label: '语音按钮', type: 'boolean', default: true },
      { name: 'showThinkingToggle', label: '思考开关', type: 'boolean', default: true },
      { name: 'placeholder', label: '占位文案', type: 'text', default: '输入消息，试试 / 命令…' },
    ]"
  >
    <template #default="{ values }">
      <div class="demo-input ac-root">
        <ChatInput
          :show-attach-button="!!values.showAttachButton"
          :show-voice-button="!!values.showVoiceButton"
          :show-thinking-toggle="!!values.showThinkingToggle"
          :placeholder="String(values.placeholder)"
          :thinking-on="thinkingOn"
          @send="(t) => (lastAction = `发送：${t}`)"
          @attach="(fs) => (lastAction = `附件：${fs.map((f) => f.name).join('、')}`)"
          @voice="lastAction = '触发语音输入'"
          @update:thinking-on="(v) => { thinkingOn = v; lastAction = `思考：${v ? '开' : '关'}` }"
        />
        <p v-if="lastAction" class="demo-input__log">{{ lastAction }}</p>
      </div>
    </template>
  </DocDemo>
</template>

<style scoped>
.demo-input { display: flex; flex-direction: column; gap: 8px; }
.demo-input__log { margin: 0; font-size: 12px; color: var(--ac-muted, #667085); }
</style>
