<script setup lang="ts">
/**
 * McpServerPanel — MCP 服务器浏览器
 *
 * 展示一个 MCP 服务器的 tools / resources / prompts 三类清单，
 * 支持传入 McpClient 实例在线加载，或直接传静态数据（演示/离线）。
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '../../i18n'
import type { McpClient, McpPrompt, McpResource, McpTool } from '../../protocols/mcp'

const props = defineProps<{
    /** 文案覆盖 */
    labels?: { connect?: string; loading?: string; noTools?: string; noResources?: string; noPrompts?: string; required?: string }
  /** 在线模式：传入已 connect 的 McpClient */
  client?: McpClient
  /** 静态模式：直接传数据 */
  tools?: McpTool[]
  resources?: McpResource[]
  prompts?: McpPrompt[]
  /** 服务器显示名 */
  serverName?: string
}>()

const emit = defineEmits<{
  /** 点击「作为工具接入」时通知宿主把 tools 桥接为 actions */
  (e: 'bridge'): void
}>()

const { t: tr } = useI18n()

const activeTab = ref<'tools' | 'resources' | 'prompts'>('tools')
const loading = ref(false)
const error = ref<string | null>(null)
const loadedTools = ref<McpTool[]>(props.tools ?? [])
const loadedResources = ref<McpResource[]>(props.resources ?? [])
const loadedPrompts = ref<McpPrompt[]>(props.prompts ?? [])

onMounted(async () => {
  if (!props.client) return
  loading.value = true
  try {
    const [t, r, p] = await Promise.allSettled([
      props.client.listTools(),
      props.client.listResources(),
      props.client.listPrompts(),
    ])
    if (t.status === 'fulfilled') loadedTools.value = t.value
    if (r.status === 'fulfilled') loadedResources.value = r.value
    if (p.status === 'fulfilled') loadedPrompts.value = p.value
  } catch (e) {
    error.value = e instanceof Error ? e.message : tr('mcp.loadError')
  } finally {
    loading.value = false
  }
})

const TABS = computed(() => [
  { id: 'tools' as const, label: tr('mcp.tabTools') },
  { id: 'resources' as const, label: tr('mcp.tabResources') },
  { id: 'prompts' as const, label: tr('mcp.tabPrompts') },
])

function countOf(tab: 'tools' | 'resources' | 'prompts'): number {
  return tab === 'tools' ? loadedTools.value.length
    : tab === 'resources' ? loadedResources.value.length
    : loadedPrompts.value.length
}
</script>

<template>
  <div class="ac-card ac-mcp">
    <header class="ac-mcp__head">
      <div class="ac-mcp__title-wrap">
        <h3 class="ac-mcp__title">{{ serverName ?? client?.serverInfo?.name ?? tr('mcp.defaultName') }}</h3>
        <span class="ac-badge">MCP</span>
      </div>
      <button v-if="loadedTools.length" type="button" class="ac-btn ac-btn--sm" @click="emit('bridge')">
        {{ tr('mcp.asTools') }}
      </button>
    </header>

    <nav class="ac-mcp__tabs" role="tablist" :aria-label="tr('mcp.tabsAria')">
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        role="tab"
        class="ac-mcp__tab"
        :aria-selected="activeTab === t.id"
        :class="{ 'ac-mcp__tab--active': activeTab === t.id }"
        @click="activeTab = t.id"
      >
        {{ t.label }}<span class="ac-mcp__count">{{ countOf(t.id) }}</span>
      </button>
    </nav>

    <div v-if="loading" class="ac-mcp__empty">{{ labels?.loading ?? tr('common.loading') }}</div>
    <div v-else-if="error" class="ac-mcp__empty ac-mcp__empty--error">{{ error }}</div>

    <!-- 工具 -->
    <ul v-else-if="activeTab === 'tools'" class="ac-mcp__list" role="tabpanel">
      <li v-if="loadedTools.length === 0" class="ac-mcp__empty">{{ labels?.noTools ?? tr('mcp.noTools') }}</li>
      <li v-for="t in loadedTools" :key="t.name" class="ac-mcp__item">
        <div class="ac-mcp__item-head">
          <code class="ac-mcp__item-name">{{ t.name }}</code>
          <span class="ac-mcp__item-kind">function</span>
        </div>
        <p v-if="t.description" class="ac-mcp__item-desc">{{ t.description }}</p>
        <div v-if="t.inputSchema?.properties" class="ac-mcp__params">
          <span
            v-for="(schema, name) in t.inputSchema.properties"
            :key="String(name)"
            class="ac-mcp__param"
            :title="schema.description"
          >
            {{ name }}<em>{{ schema.type }}</em>
          </span>
        </div>
      </li>
    </ul>

    <!-- 资源 -->
    <ul v-else-if="activeTab === 'resources'" class="ac-mcp__list" role="tabpanel">
      <li v-if="loadedResources.length === 0" class="ac-mcp__empty">{{ labels?.noResources ?? tr('mcp.noResources') }}</li>
      <li v-for="r in loadedResources" :key="r.uri" class="ac-mcp__item">
        <div class="ac-mcp__item-head">
          <code class="ac-mcp__item-name">{{ r.name ?? r.uri }}</code>
          <span v-if="r.mimeType" class="ac-mcp__item-kind">{{ r.mimeType }}</span>
        </div>
        <p class="ac-mcp__item-desc">{{ r.description ?? r.uri }}</p>
      </li>
    </ul>

    <!-- 提示模板 -->
    <ul v-else class="ac-mcp__list" role="tabpanel">
      <li v-if="loadedPrompts.length === 0" class="ac-mcp__empty">{{ labels?.noPrompts ?? tr('mcp.noPrompts') }}</li>
      <li v-for="p in loadedPrompts" :key="p.name" class="ac-mcp__item">
        <div class="ac-mcp__item-head">
          <code class="ac-mcp__item-name">{{ p.name }}</code>
        </div>
        <p v-if="p.description" class="ac-mcp__item-desc">{{ p.description }}</p>
        <div v-if="p.arguments?.length" class="ac-mcp__params">
          <span v-for="a in p.arguments" :key="a.name" class="ac-mcp__param" :title="a.description">
            {{ a.name }}<em v-if="a.required">{{ labels?.required ?? tr('mcp.required') }}</em>
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ac-mcp { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.ac-mcp__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ac-mcp__title-wrap { display: flex; align-items: center; gap: 8px; }
.ac-mcp__title { margin: 0; font-size: 0.92rem; font-weight: 700; }
.ac-mcp__tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--ac-border); }
.ac-mcp__tab {
  padding: 6px 12px; border: none; background: transparent; cursor: pointer;
  font-size: 0.8rem; color: var(--ac-muted);
  border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.ac-mcp__tab--active { color: var(--ac-primary); border-bottom-color: var(--ac-primary); font-weight: 600; }
.ac-mcp__count {
  margin-left: 5px; font-size: 0.7rem; padding: 0 6px; border-radius: 999px;
  background: var(--ac-surface); border: 1px solid var(--ac-border);
}
.ac-mcp__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.ac-mcp__item { padding: 8px 10px; border: 1px solid var(--ac-border); border-radius: calc(var(--ac-radius) * 0.7); background: var(--ac-surface); }
.ac-mcp__item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ac-mcp__item-name { font-size: 0.8rem; font-weight: 600; color: var(--ac-primary); }
.ac-mcp__item-kind { font-size: 0.68rem; color: var(--ac-muted); }
.ac-mcp__item-desc { margin: 3px 0 0; font-size: 0.76rem; color: var(--ac-muted); line-height: 1.45; }
.ac-mcp__params { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.ac-mcp__param {
  font-size: 0.7rem; padding: 1px 7px; border-radius: 999px;
  background: var(--ac-bg); border: 1px solid var(--ac-border);
  font-family: ui-monospace, monospace;
}
.ac-mcp__param em { font-style: normal; color: var(--ac-muted); margin-left: 4px; }
.ac-mcp__empty { padding: 16px; text-align: center; color: var(--ac-muted); font-size: 0.8rem; list-style: none; }
.ac-mcp__empty--error { color: var(--ac-danger); }
</style>
