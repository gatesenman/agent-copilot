<template>
  <div class="ac-card ac-codecard ac-slide-up">
    <div class="ac-codecard__head">
      <span class="ac-codecard__file">{{ data.filename || payload.title || data.language }}</span>
      <span class="ac-codecard__lang">{{ data.language }}</span>
      <button type="button" class="ac-codecard__copy" @click="copy">{{ copied ? '已复制' : '复制' }}</button>
    </div>
    <div class="ac-codecard__body ac-scroll">
      <table class="ac-codecard__table">
        <tbody>
          <tr
            v-for="(line, i) in lines"
            :key="i"
            :class="{ 'is-highlight': highlightSet.has(i + 1) }"
          >
            <td v-if="data.showLineNumbers !== false" class="ac-codecard__no">{{ i + 1 }}</td>
            <td class="ac-codecard__code"><span v-html="line || '&nbsp;'"></span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="data.caption" class="ac-codecard__caption">{{ data.caption }}</div>
  </div>
</template>

<script setup lang="ts">
/** CodeBlockCard — code 载荷：语法高亮 + 行号 + 复制（Code Agent） */
import { computed, ref } from 'vue'
import type { CodePayload, StructuredPayload } from '../../types'
import { highlightCode } from './highlight'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<CodePayload>(() => (props.payload.data ?? { language: 'text', code: '' }) as CodePayload)

const lines = computed(() => highlightCode(data.value.code ?? '', data.value.language).split('\n'))
const highlightSet = computed(() => new Set(data.value.highlightLines ?? []))

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(data.value.code ?? '')
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch { /* 剪贴板不可用 */ }
}
</script>

<style scoped>
.ac-codecard { margin: 6px 0; overflow: hidden; }
.ac-codecard__head {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
  font-size: 0.85em;
}
.ac-codecard__file { font-weight: 600; font-family: ui-monospace, Menlo, Consolas, monospace; }
.ac-codecard__lang { color: var(--ac-muted); font-size: 0.9em; }
.ac-codecard__copy {
  margin-left: auto;
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
  color: var(--ac-muted);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 0.9em;
  cursor: pointer;
}
.ac-codecard__copy:hover { color: var(--ac-fg); }
.ac-codecard__body { overflow-x: auto; background: var(--ac-code-bg, #0e1412); }
.ac-codecard__table { border-collapse: collapse; width: 100%; font-size: 0.85em; }
.ac-codecard__no {
  user-select: none;
  text-align: right;
  padding: 0 10px;
  width: 1%;
  color: #4a5a54;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  border-right: 1px solid #1e2b26;
  vertical-align: top;
}
.ac-codecard__code {
  padding: 0 12px;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  white-space: pre;
  color: #d7e4df;
  line-height: 1.6;
}
tr.is-highlight td { background: rgba(52, 211, 166, 0.09); }
.ac-codecard__caption {
  padding: 6px 12px;
  font-size: 0.82em;
  color: var(--ac-muted);
  border-top: 1px solid var(--ac-border);
}
.ac-codecard__code :deep(.tok-keyword) { color: #7cd7b8; }
.ac-codecard__code :deep(.tok-string) { color: #e8c67a; }
.ac-codecard__code :deep(.tok-number) { color: #d09bde; }
.ac-codecard__code :deep(.tok-comment) { color: #5c6f68; font-style: italic; }
.ac-codecard__code :deep(.tok-type) { color: #8ec2e8; }
</style>
