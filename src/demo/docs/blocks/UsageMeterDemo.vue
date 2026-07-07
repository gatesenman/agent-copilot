<script setup lang="ts">
/** 用量计费演示：token 数与配额可调 */
import UsageMeter from '../../../lib/agent-copilot/components/general/UsageMeter.vue'
import DocDemo from '../DocDemo.vue'
</script>

<template>
  <DocDemo
    title="用量与计费"
    description="展示 token 消耗、配额进度与估算费用。价格系数由属性传入。"
    component-name="UsageMeter"
    usage="放在标题栏或设置面板，展示当前会话 token 消耗与费用估算。数据来源于运行时 TokenUsage 累积（store.usage），价格系数按模型定价传入；超过配额 80% 进度条自动变警示色。"
    :props-table="[
      { name: 'promptTokens', type: 'number', default: '0', description: '输入 token 数' },
      { name: 'completionTokens', type: 'number', default: '0', description: '输出 token 数' },
      { name: 'quota', type: 'number', description: '配额上限（不传则不显示进度条）' },
      { name: 'promptPricePerK', type: 'number', description: '输入价格（元/千 token）' },
      { name: 'completionPricePerK', type: 'number', description: '输出价格（元/千 token）' },
      { name: 'compact', type: 'boolean', default: 'false', description: '紧凑模式（单行徽章）' },
    ]"
    :controls="[
      { name: 'promptTokens', label: 'Prompt tokens', type: 'number', default: 12800 },
      { name: 'completionTokens', label: 'Completion tokens', type: 'number', default: 5400 },
      { name: 'quota', label: '配额上限', type: 'number', default: 100000 },
      { name: 'compact', label: '紧凑模式', type: 'boolean', default: false },
    ]"
  >
    <template #default="{ values }">
      <div class="ac-root">
        <UsageMeter
          :prompt-tokens="Number(values.promptTokens)"
          :completion-tokens="Number(values.completionTokens)"
          :quota="Number(values.quota)"
          :compact="!!values.compact"
          :prompt-price-per-k="0.008"
          :completion-price-per-k="0.024"
        />
      </div>
    </template>
  </DocDemo>
</template>
