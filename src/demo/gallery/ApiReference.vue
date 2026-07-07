<script setup lang="ts">
/**
 * ApiReferencePane —— 全组件 API 速查面板。
 * 数据源 component-api.ts（从库源码 defineProps/defineEmits 提取），
 * 支持关键字过滤 + 按域分组折叠，每个组件展示 brief / 适用时机 / Props / 事件 / 插槽。
 */
import { computed, ref } from 'vue'
import { COMPONENT_API_GROUPS, type ComponentApi } from './component-api'

const query = ref('')
const expandedGroups = ref<Set<string>>(new Set(COMPONENT_API_GROUPS.map((g) => g.id)))
const expandedComps = ref<Set<string>>(new Set())

function matchComp(c: ComponentApi, q: string): boolean {
  if (!q) return true
  const hay = `${c.name} ${c.brief} ${c.when} ${c.props.map((p) => p.name + ' ' + p.desc).join(' ')}`.toLowerCase()
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))
}

const filteredGroups = computed(() =>
  COMPONENT_API_GROUPS
    .map((g) => ({ ...g, components: g.components.filter((c) => matchComp(c, query.value)) }))
    .filter((g) => g.components.length > 0),
)

const totalCount = computed(() => COMPONENT_API_GROUPS.reduce((n, g) => n + g.components.length, 0))
const shownCount = computed(() => filteredGroups.value.reduce((n, g) => n + g.components.length, 0))

function toggleGroup(id: string) {
  const s = new Set(expandedGroups.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedGroups.value = s
}
function toggleComp(name: string) {
  const s = new Set(expandedComps.value)
  if (s.has(name)) s.delete(name)
  else s.add(name)
  expandedComps.value = s
}
/** 搜索时自动展开全部命中组件 */
const isCompOpen = (name: string) => (query.value ? true : expandedComps.value.has(name))
</script>

<template>
  <div class="apir">
    <div class="apir__bar">
      <input
        v-model="query"
        type="search"
        class="apir__search"
        placeholder="搜索组件 / 属性 / 说明…（如 approval、streaming、files）"
        aria-label="搜索组件 API"
      />
      <span class="apir__count">{{ shownCount }} / {{ totalCount }} 组件</span>
    </div>

    <div v-for="g in filteredGroups" :key="g.id" class="apir__group">
      <button type="button" class="apir__ghead" :aria-expanded="expandedGroups.has(g.id)" @click="toggleGroup(g.id)">
        <span class="apir__chev" :class="{ open: expandedGroups.has(g.id) }" aria-hidden="true">▸</span>
        {{ g.label }}
        <span class="apir__gcount">{{ g.components.length }}</span>
      </button>

      <div v-if="expandedGroups.has(g.id)" class="apir__glist">
        <div v-for="c in g.components" :key="c.name" class="apir__comp">
          <button type="button" class="apir__chead" :aria-expanded="isCompOpen(c.name)" @click="toggleComp(c.name)">
            <code class="apir__cname">{{ c.name }}</code>
            <span class="apir__cbrief">{{ c.brief }}</span>
            <span class="apir__cmeta">
              {{ c.props.length }}P<template v-if="c.events?.length"> · {{ c.events.length }}E</template><template v-if="c.slots?.length"> · {{ c.slots.length }}S</template>
            </span>
          </button>

          <div v-if="isCompOpen(c.name)" class="apir__cbody">
            <p class="apir__when"><strong>何时用：</strong>{{ c.when }}</p>

            <h4 class="apir__h">Props</h4>
            <div class="apir__twrap">
              <table class="apir__table">
                <thead><tr><th>名称</th><th>类型</th><th>默认</th><th>说明</th></tr></thead>
                <tbody>
                  <tr v-for="p in c.props" :key="p.name">
                    <td><code>{{ p.name }}</code></td>
                    <td><code class="apir__type">{{ p.type }}</code></td>
                    <td><code v-if="p.default">{{ p.default }}</code><span v-else class="apir__dash">—</span></td>
                    <td>{{ p.desc }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <template v-if="c.events?.length">
              <h4 class="apir__h">事件</h4>
              <div class="apir__twrap">
                <table class="apir__table">
                  <thead><tr><th>名称</th><th>载荷</th><th>说明</th></tr></thead>
                  <tbody>
                    <tr v-for="e in c.events" :key="e.name">
                      <td><code>{{ e.name }}</code></td>
                      <td><code class="apir__type">{{ e.payload || '—' }}</code></td>
                      <td>{{ e.desc }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>

            <template v-if="c.slots?.length">
              <h4 class="apir__h">插槽</h4>
              <div class="apir__twrap">
                <table class="apir__table">
                  <thead><tr><th>名称</th><th>说明</th></tr></thead>
                  <tbody>
                    <tr v-for="s in c.slots" :key="s.name">
                      <td><code>{{ s.name }}</code></td>
                      <td>{{ s.desc }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <p v-if="filteredGroups.length === 0" class="apir__empty">没有匹配「{{ query }}」的组件。</p>
  </div>
</template>

<style scoped>
.apir { display: flex; flex-direction: column; gap: 10px; }
.apir__bar { display: flex; align-items: center; gap: 12px; }
.apir__search {
  flex: 1;
  max-width: 460px;
  padding: 8px 12px;
  border: 1px solid var(--ac-border, #e2e2df);
  border-radius: 8px;
  background: var(--ac-surface, #fff);
  color: var(--ac-text, #1a1a18);
  font-size: 13px;
}
.apir__search:focus { outline: 2px solid var(--ac-primary, #4666e5); outline-offset: 1px; }
.apir__count { font-size: 12px; opacity: 0.6; white-space: nowrap; }

.apir__group {
  border: 1px solid var(--ac-border, #e2e2df);
  border-radius: 10px;
  overflow: hidden;
  background: var(--ac-surface, #fff);
}
.apir__ghead {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: var(--ac-surface-2, #fafaf8);
  color: var(--ac-text, #1a1a18);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}
.apir__ghead:hover { background: var(--ac-hover, #f1f1ee); }
.apir__chev { font-size: 11px; opacity: 0.6; transition: transform 0.15s; }
.apir__chev.open { transform: rotate(90deg); }
.apir__gcount {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 500;
  opacity: 0.55;
  background: var(--ac-hover, #ececea);
  border-radius: 99px;
  padding: 1px 8px;
}
.apir__glist { display: flex; flex-direction: column; }

.apir__comp { border-top: 1px solid var(--ac-border-soft, #ececea); }
.apir__chead {
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
  padding: 9px 14px;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--ac-text, #1a1a18);
}
.apir__chead:hover { background: var(--ac-hover, #f7f7f5); }
.apir__cname {
  font-size: 12.5px;
  font-weight: 600;
  background: var(--ac-code-bg, #efefec);
  padding: 1px 7px;
  border-radius: 5px;
  white-space: nowrap;
}
.apir__cbrief { font-size: 12.5px; opacity: 0.75; flex: 1; min-width: 0; }
.apir__cmeta { font-size: 11px; opacity: 0.5; white-space: nowrap; }
.apir__cbody { padding: 2px 14px 14px; }
.apir__when { margin: 6px 0 2px; font-size: 12.5px; line-height: 1.55; opacity: 0.85; }
.apir__h { margin: 12px 0 6px; font-size: 12px; font-weight: 700; opacity: 0.7; }
.apir__twrap { overflow-x: auto; }
.apir__table { width: 100%; border-collapse: collapse; font-size: 12px; line-height: 1.5; }
.apir__table th {
  text-align: left;
  padding: 4px 12px 4px 0;
  border-bottom: 1px solid var(--ac-border, #e2e2df);
  font-weight: 600;
  opacity: 0.55;
  white-space: nowrap;
}
.apir__table td {
  padding: 6px 12px 6px 0;
  border-bottom: 1px solid var(--ac-border-soft, #f0f0ee);
  vertical-align: top;
}
.apir__table code {
  font-size: 11.5px;
  background: var(--ac-code-bg, #efefec);
  padding: 1px 5px;
  border-radius: 4px;
}
.apir__type { white-space: pre-wrap; word-break: break-word; }
.apir__dash { opacity: 0.4; }
.apir__empty { font-size: 13px; opacity: 0.6; padding: 12px 4px; }
</style>
