<script setup lang="ts">
defineOptions({ name: 'BrowserPanel' })

defineSlots<{
  /** 默认插槽：完全自定义内容区（优先级高于 screenshot / src 模式） */
  default(): unknown
}>()

/**
 * BrowserPanel —— 浏览器预览面板：地址栏 + iframe / 截图 / 自定义内容。
 *
 * 三种内容模式（按优先级）：
 * 1. default slot —— 完全自定义渲染
 * 2. screenshot —— 展示截图（Agent 浏览网页的快照）
 * 3. src —— iframe 实时加载
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from '../../i18n'

const props = withDefaults(
  defineProps<{
    /** iframe 地址 */
    src?: string
    /** 截图 URL（优先于 iframe） */
    screenshot?: string
    /** 地址栏显示的 URL（默认取 src） */
    displayUrl?: string
    /** 地址栏可编辑 */
    editable?: boolean
    /** 高度 */
    height?: string
    /** 空状态文案 */
    emptyText?: string
    /** 页面标题（截图模式下显示） */
    pageTitle?: string
  }>(),
  {
    src: undefined,
    screenshot: undefined,
    displayUrl: undefined,
    editable: false,
    height: '320px',
    emptyText: undefined,
    pageTitle: undefined,
  },
)

const emit = defineEmits<{
  (e: 'navigate', url: string): void
  (e: 'refresh'): void
}>()

const { t } = useI18n()
const emptyTextResolved = computed(() => props.emptyText ?? t('browser.empty'))

const urlInput = ref(props.displayUrl ?? props.src ?? '')
watch(
  () => props.displayUrl ?? props.src,
  (v) => { urlInput.value = v ?? '' },
)

function submitUrl() {
  const url = urlInput.value.trim()
  if (url) emit('navigate', url)
}
</script>

<template>
  <div class="ac-browser" :style="{ height }">
    <div class="ac-browser__bar">
      <button type="button" class="ac-browser__btn" :aria-label="t('browser.refresh')" @click="emit('refresh')">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 1.5v3h-3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <form class="ac-browser__url-wrap" @submit.prevent="submitUrl">
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="ac-browser__lock">
          <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
        </svg>
        <input
          v-model="urlInput"
          class="ac-browser__url"
          :readonly="!editable"
          :aria-label="t('browser.urlAria')"
          spellcheck="false"
        />
      </form>
    </div>
    <div class="ac-browser__body">
      <slot>
        <template v-if="screenshot">
          <figure class="ac-browser__shot">
            <img :src="screenshot" :alt="pageTitle ?? t('browser.screenshotAlt')" />
            <figcaption v-if="pageTitle">{{ pageTitle }}</figcaption>
          </figure>
        </template>
        <iframe
          v-else-if="src"
          :src="src"
          class="ac-browser__frame"
          :title="pageTitle ?? t('browser.previewTitle')"
          sandbox="allow-scripts allow-same-origin"
        />
        <div v-else class="ac-browser__empty">{{ emptyTextResolved }}</div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.ac-browser {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-bg);
}
.ac-browser__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
}
.ac-browser__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ac-muted);
  cursor: pointer;
}
.ac-browser__btn:hover { background: color-mix(in srgb, var(--ac-primary) 8%, transparent); color: var(--ac-fg); }
.ac-browser__url-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
}
.ac-browser__lock { color: var(--ac-success); flex-shrink: 0; }
.ac-browser__url {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--ac-fg);
  font-size: 0.76rem;
  outline: none;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
.ac-browser__body { flex: 1; overflow: auto; display: flex; flex-direction: column; }
.ac-browser__frame { flex: 1; width: 100%; border: none; }
.ac-browser__shot { margin: 0; padding: 10px; }
.ac-browser__shot img { width: 100%; border-radius: 6px; border: 1px solid var(--ac-border); display: block; }
.ac-browser__shot figcaption { margin-top: 6px; font-size: 0.76rem; color: var(--ac-muted); text-align: center; }
.ac-browser__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ac-muted);
  font-size: 0.82rem;
}
</style>
