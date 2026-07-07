<script setup lang="ts">
/**
 * DemoKnobs —— 通用属性控制面板（schema 驱动）
 * 给组件演示统一提供在线属性调节：boolean 开关 / select 下拉 / number 数字 / text 文本。
 * 用法：父组件维护一个 reactive state，传入 controls schema，本组件双向修改 state。
 */
export interface KnobDef {
  /** state 中的键名 */
  key: string
  /** 显示标签（组件 prop 名或中文说明） */
  label: string
  type: 'boolean' | 'select' | 'number' | 'text'
  /** select 选项 */
  options?: { value: string | number | boolean; label: string }[]
  /** number 范围 */
  min?: number
  max?: number
  step?: number
}

const props = defineProps<{
  controls: KnobDef[]
  /** 由父组件传入的响应式状态对象（reactive），本组件直接读写 */
  state: Record<string, unknown>
}>()

function setVal(key: string, v: unknown) {
  props.state[key] = v
}
</script>

<template>
  <div class="knobs" role="group" aria-label="属性控制">
    <span class="knobs__title">属性</span>
    <template v-for="c in controls" :key="c.key">
      <!-- 布尔开关 -->
      <label v-if="c.type === 'boolean'" class="knobs__item knobs__item--bool">
        <input
          type="checkbox"
          :checked="Boolean(state[c.key])"
          @change="setVal(c.key, ($event.target as HTMLInputElement).checked)"
        />
        <code>{{ c.label }}</code>
      </label>

      <!-- 下拉选择 -->
      <label v-else-if="c.type === 'select'" class="knobs__item">
        <code>{{ c.label }}</code>
        <select
          class="knobs__select"
          :value="String(state[c.key])"
          @change="setVal(c.key, (c.options ?? []).find((o) => String(o.value) === ($event.target as HTMLSelectElement).value)?.value)"
        >
          <option v-for="o in c.options" :key="String(o.value)" :value="String(o.value)">{{ o.label }}</option>
        </select>
      </label>

      <!-- 数字 -->
      <label v-else-if="c.type === 'number'" class="knobs__item">
        <code>{{ c.label }}</code>
        <input
          type="number"
          class="knobs__num"
          :value="Number(state[c.key])"
          :min="c.min"
          :max="c.max"
          :step="c.step ?? 1"
          @input="setVal(c.key, Number(($event.target as HTMLInputElement).value))"
        />
      </label>

      <!-- 文本 -->
      <label v-else class="knobs__item">
        <code>{{ c.label }}</code>
        <input
          type="text"
          class="knobs__text"
          :value="String(state[c.key] ?? '')"
          @input="setVal(c.key, ($event.target as HTMLInputElement).value)"
        />
      </label>
    </template>
  </div>
</template>

<style scoped>
.knobs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px dashed var(--ac-border, #d4d4d8);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ac-surface-2, #fafafa) 60%, transparent);
  font-size: 12px;
}
.knobs__title {
  font-weight: 600;
  color: var(--ac-fg-muted, #71717a);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 10px;
}
.knobs__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: var(--ac-fg, #18181b);
}
.knobs__item code {
  font-family: var(--ac-font-mono, ui-monospace, monospace);
  font-size: 11px;
  color: var(--ac-fg-muted, #52525b);
}
.knobs__select,
.knobs__num,
.knobs__text {
  padding: 2px 6px;
  border: 1px solid var(--ac-border, #d4d4d8);
  border-radius: 6px;
  background: var(--ac-surface, #fff);
  color: var(--ac-fg, #18181b);
  font-size: 12px;
}
.knobs__num { width: 72px; }
.knobs__text { width: 140px; }
.knobs__item input[type='checkbox'] { accent-color: var(--ac-primary, #3f6212); }
</style>
