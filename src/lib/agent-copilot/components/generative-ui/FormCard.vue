<script setup lang="ts">
/**
 * FormCard —— form 载荷渲染器：包装 AgentFormCard 并接入 store 的 submitForm。
 */
import { computed, inject, ref } from 'vue'
import { COPILOT_KEY } from '../../composables/useCopilot'
import type { FormPayload, StructuredPayload } from '../../types'
import AgentFormCard from '../agentic/AgentFormCard.vue'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<FormPayload>(() => props.payload.data as FormPayload)

// 独立使用（无 Provider）时降级为本地提交
const store = inject(COPILOT_KEY, null)
const submitted = ref(false)
const submittedValues = ref<Record<string, unknown>>()

function onSubmit(values: Record<string, unknown>) {
  submittedValues.value = values
  submitted.value = true
  store?.submitForm(data.value.formId, values)
}
</script>

<template>
  <AgentFormCard
    :form="data"
    :submitted="submitted"
    :submitted-values="submittedValues"
    @submit="onSubmit"
  />
</template>
