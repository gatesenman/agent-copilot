<script setup lang="ts">
/** Agent 追问表单演示：Agent 请求人补充信息 */
import { ref } from 'vue'
import AgentFormCard from '../../../lib/agent-copilot/components/agentic/AgentFormCard.vue'
import type { FormPayload } from '../../../lib/agent-copilot'
import DocDemo from '../DocDemo.vue'

const form: FormPayload = {
  formId: 'travel-info',
  title: '补充出差信息',
  description: 'Agent 需要以下信息才能继续为你办理差旅申请。',
  fields: [
    { name: 'city', label: '目的地城市', type: 'text', required: true, placeholder: '如：上海' },
    { name: 'dates', label: '出差日期', type: 'date', required: true },
    { name: 'reason', label: '事由', type: 'select', required: true, options: [
      { label: '客户拜访', value: 'visit' },
      { label: '项目实施', value: 'project' },
      { label: '培训会议', value: 'training' },
    ] },
    { name: 'note', label: '备注', type: 'textarea', placeholder: '可选' },
  ],
  submitLabel: '提交给 Agent',
}

const submitted = ref(false)
const submittedValues = ref<Record<string, unknown>>({})

function onSubmit(vals: Record<string, unknown>) {
  submitted.value = true
  submittedValues.value = vals
}
</script>

<template>
  <DocDemo
    title="Agent 追问表单"
    description="Agent 通过 FORM_REQUEST 事件下发表单请求，人填写后经 onFormSubmit 回传，实现双向交互。"
    component-name="AgentFormCard"
    usage="Agent 侧发起的双向表单：后端通过 FORM_REQUEST 事件（payload type: form）下发字段规格，组件渲染 16 种控件并执行内置校验（必填/长度/范围/正则/格式），提交经 @submit 回传。配合 config.agentic.formReview 可让 AI 自动检查提交内容并通过 aiIssue 逐字段回填问题。"
    :props-table="[
      { name: 'form', type: 'FormPayload', description: '表单规格：{ formId, title?, fields, submitLabel?, aiReview?, aiSummary? }；fields 支持 text/textarea/select/radio/checkbox/date/number/email/tel/url/time/slider/rating/switch/tags/multiselect' },
      { name: 'submitted', type: 'boolean', default: 'false', description: '已提交态（锁定并展示提交值）' },
      { name: 'submittedValues', type: 'Record<string, unknown>', description: '已提交的值（回显）' },
      { name: 'disabled', type: 'boolean', default: 'false', description: '禁用全部控件' },
      { name: '@submit', type: '(values: Record<string, unknown>) => void', description: '校验通过后提交' },
      { name: '@cancel', type: '() => void', description: '取消填写' },
    ]"
    :controls="[
      { name: 'disabled', label: '禁用态', type: 'boolean', default: false },
    ]"
  >
    <template #default="{ values }">
      <div class="demo-form ac-root">
        <AgentFormCard
          :form="form"
          :submitted="submitted"
          :submitted-values="submittedValues"
          :disabled="!!values.disabled"
          @submit="onSubmit"
        />
        <button v-if="submitted" type="button" class="demo-form__reset" @click="submitted = false">重置演示</button>
      </div>
    </template>
  </DocDemo>
</template>

<style scoped>
.demo-form { display: flex; flex-direction: column; gap: 10px; max-width: 480px; }
.demo-form__reset {
  align-self: flex-start;
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid var(--ac-border, #e4e7ec);
  border-radius: 6px;
  background: var(--ac-surface, #fff);
  color: var(--ac-muted, #667085);
  cursor: pointer;
}
</style>
