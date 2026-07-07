<script setup lang="ts">
import { ThinkingBlock } from '../../../lib/agent-copilot'
import DocDemo from '../DocDemo.vue'

const SAMPLE = '用户要求给登录表单加校验。先查看现有组件结构，确认表单提交路径；然后抽一个 validators 工具模块，在组件中接入校验与错误态；最后运行测试确认无回归。'
</script>

<template>
  <DocDemo
    title="ThinkingBlock 思考块"
    description="展示模型的思考过程（THINKING_* 事件累积）。流式中自动展开，结束后折叠并显示耗时。"
    component-name="ThinkingBlock"
    usage="放在助手消息气泡上方，展示推理过程。协议侧由 THINKING_DELTA/THINKING_END 事件驱动 content 与 streaming；手动接入时流式期间置 streaming=true 会自动展开，结束后传 duration 显示耗时并折叠。"
    :props-table="[
      { name: 'content', type: 'string', description: '思考内容（流式累积文本）' },
      { name: 'streaming', type: 'boolean', default: 'false', description: '是否思考中（显示动画并自动展开）' },
      { name: 'duration', type: 'number', description: '思考耗时毫秒（结束后显示）' },
      { name: 'defaultExpanded', type: 'boolean', default: 'false', description: '非流式时默认是否展开' },
      { name: 'label', type: 'string', default: `'思考过程'`, description: '标题文案' },
    ]"
    :controls="[
      { name: 'streaming', label: '思考中', type: 'boolean', default: false },
      { name: 'defaultExpanded', label: '默认展开', type: 'boolean', default: true },
    ]"
  >
    <template #default="{ values }">
      <div class="ac-root" style="max-width: 560px;">
        <ThinkingBlock
          :content="SAMPLE"
          :streaming="!!values.streaming"
          :default-expanded="!!values.defaultExpanded"
          :duration="values.streaming ? undefined : 4200"
        />
      </div>
    </template>
  </DocDemo>
</template>
