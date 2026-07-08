<template>
  <div class="ac-card ac-termcard ac-slide-up">
    <div class="ac-termcard__head">
      <span class="ac-termcard__dot" aria-hidden="true"></span>
      <span class="ac-termcard__dot" aria-hidden="true"></span>
      <span class="ac-termcard__dot" aria-hidden="true"></span>
      <span class="ac-termcard__title">{{ payload.title || data.cwd || 'terminal' }}</span>
      <span
        v-if="data.exitCode !== undefined"
        class="ac-termcard__exit"
        :class="data.exitCode === 0 ? 'is-ok' : 'is-err'"
      >exit {{ data.exitCode }}</span>
    </div>
    <div class="ac-termcard__body ac-scroll">
      <div v-for="(line, i) in data.lines" :key="i" class="ac-termcard__line" :class="`is-${line.kind}`">
        <span v-if="line.kind === 'cmd'" class="ac-termcard__prompt">$</span>
        <span class="ac-termcard__text">{{ line.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'TerminalCard' })

/** TerminalCard — terminal 载荷：命令行输出（Code Agent） */
import { computed } from 'vue'
import type { StructuredPayload, TerminalPayload } from '../../types'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<TerminalPayload>(() => (props.payload.data ?? { lines: [] }) as TerminalPayload)
</script>

<style scoped>
.ac-termcard { margin: 6px 0; overflow: hidden; }
.ac-termcard__head {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  background: #1a2420;
  border-bottom: 1px solid #253530;
}
.ac-termcard__dot { width: 10px; height: 10px; border-radius: 50%; background: #34483f; }
.ac-termcard__title {
  margin-left: 6px; font-size: 0.8em; color: #93a29c;
  font-family: ui-monospace, Menlo, Consolas, monospace;
}
.ac-termcard__exit { margin-left: auto; font-size: 0.78em; font-family: ui-monospace, Menlo, Consolas, monospace; }
.ac-termcard__exit.is-ok { color: #34d3a6; }
.ac-termcard__exit.is-err { color: #f87171; }
.ac-termcard__body {
  background: #0e1412; padding: 10px 12px;
  max-height: 320px; overflow: auto;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.84em; line-height: 1.6;
}
.ac-termcard__line { display: flex; gap: 8px; white-space: pre-wrap; word-break: break-all; }
.ac-termcard__prompt { color: #34d3a6; flex: none; user-select: none; }
.ac-termcard__line.is-cmd .ac-termcard__text { color: #e8eeec; font-weight: 600; }
.ac-termcard__line.is-out .ac-termcard__text { color: #93a29c; }
.ac-termcard__line.is-err .ac-termcard__text { color: #f87171; }
</style>
