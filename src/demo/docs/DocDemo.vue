<script setup lang="ts">
/**
 * 文档内嵌演示容器 — 实时预览 + 属性编辑器 + 代码生成。
 *
 * 控件由 schema 驱动：boolean → 开关，select → 下拉，text → 输入框，
 * number → 数字输入。改动即时反映到预览，同时生成对应 props 代码。
 */
import { computed, reactive, ref } from 'vue'
import { copyText } from '../../lib/agent-copilot/utils/clipboard'

export interface DemoControl {
  /** 绑定的 prop 名 */
  name: string
  label: string
  type: 'boolean' | 'select' | 'text' | 'number'
  options?: { label: string; value: string }[]
  default?: unknown
}

/** 属性表行（完整 API 文档，含不可在线编辑的复杂 props） */
export interface PropRow {
  name: string
  type: string
  default?: string
  description: string
}

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    /** 属性控件 schema */
    controls?: DemoControl[]
    /** 生成代码的组件名（如 "ModeSelector"） */
    componentName?: string
    /** 用法指导（何时用、怎么接、注意点） */
    usage?: string
    /** 完整属性表（含复杂 props / 事件 / 插槽说明） */
    propsTable?: PropRow[]
  }>(),
  { controls: () => [], propsTable: () => [] },
)

const apiOpen = ref(false)

/** 当前控件值（响应式，透传给默认 slot） */
const values = reactive<Record<string, unknown>>(
  Object.fromEntries(props.controls.map((c) => [c.name, c.default])),
)

const showCode = computed(() => !!props.componentName)

/** 生成使用代码 */
const code = computed(() => {
  if (!props.componentName) return ''
  const attrs = props.controls
    .map((c) => {
      const v = values[c.name]
      if (typeof v === 'boolean') return v ? `  ${kebab(c.name)}` : null
      if (v === undefined || v === '' || v === null) return null
      if (typeof v === 'number') return `  :${kebab(c.name)}="${v}"`
      return `  ${kebab(c.name)}="${v}"`
    })
    .filter(Boolean)
    .join('\n')
  const tag = attrs
    ? `<${props.componentName}\n${attrs}\n/>`
    : `<${props.componentName} />`
  return `import { ${props.componentName} } from 'agent-copilot'\n\n${tag}`
})

function kebab(s: string) {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

async function copyCode() {
  await copyText(code.value)
}
</script>

<template>
  <section class="dd" :aria-label="`${title} 示例`">
    <header class="dd__head">
      <h4 class="dd__title">{{ title }}</h4>
      <p v-if="description" class="dd__desc">{{ description }}</p>
      <p v-if="usage" class="dd__usage">{{ usage }}</p>
    </header>

    <div class="dd__stage">
      <!-- 预览区：slot 拿到当前控件值 -->
      <div class="dd__preview">
        <slot :values="values" />
      </div>

      <!-- 属性编辑器 -->
      <aside v-if="controls.length" class="dd__controls" aria-label="属性编辑">
        <p class="dd__controls-label">属性</p>
        <label v-for="c in controls" :key="c.name" class="dd__control">
          <span class="dd__control-name">{{ c.label }}</span>

          <button
            v-if="c.type === 'boolean'"
            type="button"
            class="dd__toggle"
            :class="{ 'dd__toggle--on': !!values[c.name] }"
            role="switch"
            :aria-checked="!!values[c.name]"
            @click="values[c.name] = !values[c.name]"
          >
            <span class="dd__toggle-dot" />
          </button>

          <select
            v-else-if="c.type === 'select'"
            v-model="values[c.name]"
            class="dd__select"
          >
            <option v-for="o in c.options" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>

          <input
            v-else-if="c.type === 'number'"
            v-model.number="values[c.name]"
            type="number"
            class="dd__input"
          />

          <input
            v-else
            v-model="values[c.name]"
            type="text"
            class="dd__input"
          />
        </label>
      </aside>
    </div>

    <!-- 生成代码 -->
    <div v-if="showCode" class="dd__code">
      <div class="dd__code-head">
        <span>使用代码</span>
        <button type="button" class="dd__copy" @click="copyCode">复制</button>
      </div>
      <pre class="dd__code-body"><code>{{ code }}</code></pre>
    </div>

    <!-- 属性 API 表（折叠） -->
    <div v-if="propsTable.length" class="dd__api">
      <button type="button" class="dd__api-head" :aria-expanded="apiOpen" @click="apiOpen = !apiOpen">
        <span>属性 API（{{ propsTable.length }}）</span>
        <span class="dd__api-arrow" :class="{ 'dd__api-arrow--open': apiOpen }" aria-hidden="true" />
      </button>
      <div v-if="apiOpen" class="dd__api-body">
        <table class="dd__api-table">
          <thead>
            <tr><th>属性</th><th>类型</th><th>默认值</th><th>说明</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in propsTable" :key="row.name">
              <td><code>{{ row.name }}</code></td>
              <td><code class="dd__api-type">{{ row.type }}</code></td>
              <td><code v-if="row.default">{{ row.default }}</code><span v-else>—</span></td>
              <td>{{ row.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dd {
  margin: 20px 0 28px;
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  background: var(--ac-surface, #fff);
}
.dd__head {
  padding: 14px 18px 10px;
  border-bottom: 1px dashed var(--ac-border, #e2e8f0);
}
.dd__title { margin: 0; font-size: 14px; font-weight: 700; color: var(--ac-fg, #111827); }
.dd__desc { margin: 4px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--ac-muted, #64748b); }

.dd__stage { display: flex; min-height: 120px; }
.dd__preview {
  flex: 1;
  min-width: 0;
  padding: 18px;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dd__controls {
  width: 200px;
  flex-shrink: 0;
  padding: 14px;
  border-left: 1px dashed var(--ac-border, #e2e8f0);
  background: color-mix(in srgb, var(--ac-bg, #f8fafc) 60%, transparent);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dd__controls-label {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ac-muted, #94a3b8);
}
.dd__control { display: flex; flex-direction: column; gap: 4px; }
.dd__control-name { font-size: 12px; color: var(--ac-fg, #334155); }
.dd__toggle {
  position: relative;
  width: 34px;
  height: 19px;
  border: none;
  border-radius: 999px;
  background: var(--ac-border, #cbd5e1);
  cursor: pointer;
  transition: background 0.15s;
}
.dd__toggle--on { background: var(--ac-primary, #2563eb); }
.dd__toggle-dot {
  position: absolute;
  top: 2.5px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
}
.dd__toggle--on .dd__toggle-dot { transform: translateX(14px); }
.dd__select, .dd__input {
  padding: 5px 8px;
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 7px;
  background: var(--ac-surface, #fff);
  color: var(--ac-fg, #111827);
  font-size: 12.5px;
}

.dd__code { border-top: 1px dashed var(--ac-border, #e2e8f0); }
.dd__code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 14px;
  font-size: 11.5px;
  color: var(--ac-muted, #94a3b8);
  background: color-mix(in srgb, var(--ac-bg, #f8fafc) 70%, transparent);
}
.dd__copy {
  border: none;
  background: none;
  color: var(--ac-primary, #2563eb);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
.dd__code-body {
  margin: 0;
  padding: 12px 16px;
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ac-fg, #334155);
  background: color-mix(in srgb, var(--ac-bg, #f8fafc) 40%, transparent);
  overflow-x: auto;
  white-space: pre;
}

/* 用法指导 */
.dd__usage {
  margin: 8px 0 0;
  padding: 8px 12px;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--ac-fg, #334155);
  background: color-mix(in srgb, var(--ac-primary, #2563eb) 5%, transparent);
  border-left: 3px solid var(--ac-primary, #2563eb);
  border-radius: 0 6px 6px 0;
}

/* 属性 API 折叠表 */
.dd__api { border-top: 1px dashed var(--ac-border, #e2e8f0); }
.dd__api-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 14px;
  border: none;
  background: none;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ac-muted, #64748b);
  cursor: pointer;
}
.dd__api-arrow {
  width: 6px;
  height: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.15s;
}
.dd__api-arrow--open { transform: rotate(-135deg); }
.dd__api-body { padding: 0 14px 14px; overflow-x: auto; }
.dd__api-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.dd__api-table th {
  text-align: left;
  padding: 6px 10px;
  color: var(--ac-muted, #94a3b8);
  font-weight: 600;
  border-bottom: 1px solid var(--ac-border, #e2e8f0);
  white-space: nowrap;
}
.dd__api-table td {
  padding: 6px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--ac-border, #e2e8f0) 55%, transparent);
  color: var(--ac-fg, #334155);
  line-height: 1.55;
  vertical-align: top;
}
.dd__api-table code {
  font-size: 11.5px;
  background: color-mix(in srgb, var(--ac-bg, #f8fafc) 80%, transparent);
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
}
.dd__api-type { color: var(--ac-primary, #2563eb); white-space: normal !important; }

@media (max-width: 640px) {
  .dd__stage { flex-direction: column; }
  .dd__controls { width: auto; border-left: none; border-top: 1px dashed var(--ac-border, #e2e8f0); }
}
</style>
