<template>
  <div class="ac-card ac-diffcard ac-slide-up">
    <div class="ac-diffcard__head">
      <span class="ac-diffcard__file">{{ data.filename || payload.title || 'diff' }}</span>
      <span class="ac-diffcard__stat">
        <span class="ac-diffcard__add">+{{ additions }}</span>
        <span class="ac-diffcard__del">-{{ deletions }}</span>
      </span>
    </div>
    <div class="ac-diffcard__body ac-scroll">
      <table class="ac-diffcard__table">
        <tbody>
          <tr v-for="(line, i) in data.lines" :key="i" :class="`is-${line.type}`">
            <td class="ac-diffcard__no">{{ line.type === 'add' ? '' : line.oldNo ?? '' }}</td>
            <td class="ac-diffcard__no">{{ line.type === 'del' ? '' : line.newNo ?? '' }}</td>
            <td class="ac-diffcard__sign">{{ sign(line.type) }}</td>
            <td class="ac-diffcard__code">{{ line.text || ' ' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
/** DiffCard — diff 载荷：行级增删视图（Code Agent） */
import { computed } from 'vue'
import type { DiffPayload, StructuredPayload } from '../../types'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<DiffPayload>(() => (props.payload.data ?? { lines: [] }) as DiffPayload)

const additions = computed(() => data.value.additions ?? data.value.lines.filter((l) => l.type === 'add').length)
const deletions = computed(() => data.value.deletions ?? data.value.lines.filter((l) => l.type === 'del').length)

function sign(type: string): string {
  return type === 'add' ? '+' : type === 'del' ? '-' : type === 'hunk' ? '@' : ' '
}
</script>

<style scoped>
.ac-diffcard { margin: 6px 0; overflow: hidden; }
.ac-diffcard__head {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 12px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
  font-size: 0.85em;
}
.ac-diffcard__file { font-weight: 600; font-family: ui-monospace, Menlo, Consolas, monospace; }
.ac-diffcard__stat { margin-left: auto; display: flex; gap: 8px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.9em; }
.ac-diffcard__add { color: var(--ac-success); font-weight: 600; }
.ac-diffcard__del { color: var(--ac-danger); font-weight: 600; }
.ac-diffcard__body { overflow-x: auto; }
.ac-diffcard__table { border-collapse: collapse; width: 100%; font-size: 0.84em; font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
.ac-diffcard__no {
  user-select: none; text-align: right; padding: 0 8px; width: 1%;
  color: var(--ac-muted); border-right: 1px solid var(--ac-border);
  vertical-align: top; line-height: 1.65; font-size: 0.92em;
}
.ac-diffcard__sign { user-select: none; width: 1%; padding: 0 6px; line-height: 1.65; }
.ac-diffcard__code { padding: 0 10px 0 2px; white-space: pre; line-height: 1.65; }
tr.is-add { background: color-mix(in srgb, var(--ac-success) 10%, var(--ac-bg)); }
tr.is-add .ac-diffcard__sign { color: var(--ac-success); font-weight: 700; }
tr.is-del { background: color-mix(in srgb, var(--ac-danger) 8%, var(--ac-bg)); }
tr.is-del .ac-diffcard__sign { color: var(--ac-danger); font-weight: 700; }
tr.is-del .ac-diffcard__code { opacity: 0.75; }
tr.is-hunk { background: var(--ac-surface); }
tr.is-hunk .ac-diffcard__code,
tr.is-hunk .ac-diffcard__sign { color: var(--ac-muted); font-style: italic; }
</style>
