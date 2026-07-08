<script setup lang="ts">
defineOptions({ name: 'CopilotDevtools' })

/**
 * CopilotDevtools — 开发者事件检查器（对标 CopilotKit Dev Console）
 *
 * 折叠悬浮面板：实时事件流水（类型/耗时/载荷 JSON）+ 生效配置快照。
 * 仅在 config.debug 或 DEV 构建下渲染，生产构建（非 debug）自动消失。
 */
import { computed, ref } from 'vue'
import { useCopilot } from '../../composables/useCopilot'

const store = useCopilot()
const open = ref(false)
const tab = ref<'events' | 'config'>('events')
const expandedSeq = ref<number | null>(null)
const filter = ref('')

const visible = computed(() => Boolean(store.config.debug) || Boolean(import.meta.env?.DEV))

const filtered = computed(() => {
  const list = store.eventLog.value
  if (!filter.value.trim()) return list
  const q = filter.value.trim().toUpperCase()
  return list.filter((e) => e.type.toUpperCase().includes(q))
})

/** 配置快照：函数/组件等不可序列化项标注类型名 */
const configSnapshot = computed(() => {
  try {
    return JSON.stringify(store.config, (_k, v) => {
      if (typeof v === 'function') return '[Function]'
      if (v && typeof v === 'object' && '__v_isVNode' in (v as object)) return '[VNode]'
      return v
    }, 2)
  } catch {
    return '{ /* 配置含循环引用，无法序列化 */ }'
  }
})

function payloadJson(data: unknown): string {
  try { return JSON.stringify(data, null, 2) ?? 'null' } catch { return String(data) }
}

function toggleRow(seq: number) {
  expandedSeq.value = expandedSeq.value === seq ? null : seq
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${d.toLocaleTimeString('zh-CN', { hour12: false })}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function clearLog() {
  store.eventLog.value = []
  expandedSeq.value = null
}

/** 事件类型 → 色彩语义 */
function typeTone(type: string): string {
  if (type === 'RUN_ERROR') return 'err'
  if (type === 'CONNECTION_RETRY') return 'warn'
  if (type.startsWith('TOOL_')) return 'tool'
  if (type.startsWith('RUN_')) return 'run'
  return 'text'
}
</script>

<template>
  <div v-if="visible" class="cdt" :data-open="open">
    <button type="button" class="cdt__fab" :aria-expanded="open" aria-controls="cdt-panel" @click="open = !open">
      <span aria-hidden="true">{{ open ? '×' : '⚙' }}</span>
      <span class="cdt__fab-label">{{ open ? '关闭' : 'DevTools' }}</span>
      <span v-if="!open && store.eventLog.value.length" class="cdt__badge">{{ store.eventLog.value.length }}</span>
    </button>

    <section v-if="open" id="cdt-panel" class="cdt__panel" aria-label="Copilot DevTools">
      <header class="cdt__head">
        <div class="cdt__tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="tab === 'events'" class="cdt__tab" :data-active="tab === 'events'" @click="tab = 'events'">
            事件流水 ({{ store.eventLog.value.length }})
          </button>
          <button type="button" role="tab" :aria-selected="tab === 'config'" class="cdt__tab" :data-active="tab === 'config'" @click="tab = 'config'">
            生效配置
          </button>
        </div>
        <button v-if="tab === 'events'" type="button" class="cdt__clear" @click="clearLog">清空</button>
      </header>

      <div v-if="tab === 'events'" class="cdt__body">
        <input v-model="filter" type="search" class="cdt__filter" placeholder="按事件类型过滤（如 TOOL / RUN_ERROR）" aria-label="过滤事件类型" />
        <p v-if="filtered.length === 0" class="cdt__empty">
          {{ store.eventLog.value.length === 0 ? '暂无事件 —— 发起一次对话后这里会实时滚动' : '无匹配事件' }}
        </p>
        <ul v-else class="cdt__list" role="list">
          <li v-for="e in filtered" :key="e.seq" class="cdt__row">
            <button type="button" class="cdt__row-head" :aria-expanded="expandedSeq === e.seq" @click="toggleRow(e.seq)">
              <span class="cdt__seq">#{{ e.seq }}</span>
              <span class="cdt__type" :data-tone="typeTone(e.type)">{{ e.type }}</span>
              <span class="cdt__time">{{ fmtTime(e.timestamp) }}</span>
            </button>
            <pre v-if="expandedSeq === e.seq" class="cdt__json">{{ payloadJson(e.data) }}</pre>
          </li>
        </ul>
      </div>

      <div v-else class="cdt__body">
        <pre class="cdt__json cdt__json--config">{{ configSnapshot }}</pre>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cdt {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  font-family: var(--copilot-font-mono, ui-monospace, monospace);
}
.cdt__fab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--copilot-border, #333);
  border-radius: 999px;
  background: var(--copilot-surface, #1a1a1e);
  color: var(--copilot-text, #e5e5e5);
  font-size: 12px;
  cursor: pointer;
}
.cdt__badge {
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--copilot-primary, #3b82f6);
  color: #fff;
  font-size: 10px;
  text-align: center;
}
.cdt__panel {
  width: min(440px, calc(100vw - 32px));
  max-height: min(480px, 70vh);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--copilot-border, #333);
  border-radius: 12px;
  background: var(--copilot-surface, #141417);
  color: var(--copilot-text, #e5e5e5);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}
.cdt__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--copilot-border, #2a2a2e);
}
.cdt__tabs { display: flex; gap: 4px; }
.cdt__tab {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--copilot-text-muted, #999);
  font-size: 12px;
  cursor: pointer;
}
.cdt__tab[data-active='true'] {
  background: var(--copilot-primary-soft, rgba(59, 130, 246, 0.15));
  color: var(--copilot-primary, #60a5fa);
}
.cdt__clear {
  padding: 3px 10px;
  border: 1px solid var(--copilot-border, #333);
  border-radius: 6px;
  background: transparent;
  color: var(--copilot-text-muted, #999);
  font-size: 11px;
  cursor: pointer;
}
.cdt__body { display: flex; flex-direction: column; gap: 6px; padding: 8px; overflow-y: auto; }
.cdt__filter {
  padding: 6px 10px;
  border: 1px solid var(--copilot-border, #2a2a2e);
  border-radius: 6px;
  background: var(--copilot-bg, #0e0e10);
  color: inherit;
  font-size: 12px;
}
.cdt__empty { margin: 12px 4px; font-size: 12px; color: var(--copilot-text-muted, #888); }
.cdt__list { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.cdt__row-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.cdt__row-head:hover { background: rgba(255, 255, 255, 0.05); }
.cdt__seq { flex-shrink: 0; width: 42px; color: var(--copilot-text-muted, #666); font-size: 11px; }
.cdt__type { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cdt__type[data-tone='err'] { color: var(--copilot-danger, #f87171); }
.cdt__type[data-tone='warn'] { color: var(--copilot-warning, #fbbf24); }
.cdt__type[data-tone='tool'] { color: var(--copilot-success, #4ade80); }
.cdt__type[data-tone='run'] { color: var(--copilot-primary, #60a5fa); }
.cdt__time { flex-shrink: 0; color: var(--copilot-text-muted, #666); font-size: 11px; }
.cdt__json {
  margin: 0 0 4px 48px;
  padding: 8px;
  border-radius: 6px;
  background: var(--copilot-bg, #0e0e10);
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
.cdt__json--config { margin: 0; max-height: none; }
</style>
