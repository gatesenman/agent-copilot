<script setup lang="ts">
/**
 * 文档站：左侧章节菜单 + 右侧内容渲染。
 * 文档源为 docs/ 下的 markdown 文件（?raw 导入），单一事实来源。
 */
import { computed, ref, watch } from 'vue'
import MarkdownText from '../../lib/agent-copilot/components/chat/MarkdownText.vue'
import { DEMO_BLOCKS, splitDocContent } from '../docs/demo-blocks'
import guide from '../../../docs/COMPONENT_GUIDE.md?raw'
import inputDoc from '../../../docs/guide/input-enhancements.md?raw'
import markdownDoc from '../../../docs/guide/markdown.md?raw'
import protocolsDoc from '../../../docs/guide/protocols.md?raw'
import enterpriseDoc from '../../../docs/guide/enterprise.md?raw'
import agenticDoc from '../../../docs/guide/agentic.md?raw'
import integrationDoc from '../../../docs/guide/integration.md?raw'
import themingDoc from '../../../docs/guide/theming.md?raw'
import i18nDoc from '../../../docs/guide/i18n.md?raw'

interface DocSection {
  id: string
  label: string
  group: string
  content: string
}

const SECTIONS: DocSection[] = [
  { id: 'overview', label: '组件总览与快速开始', group: '入门', content: guide },
  { id: 'input', label: '输入增强（/ @ # 队列 分支）', group: '核心能力', content: inputDoc },
  { id: 'markdown', label: 'Markdown 渲染', group: '核心能力', content: markdownDoc },
  { id: 'agentic', label: 'Agentic 工作台', group: '核心能力', content: agenticDoc },
  { id: 'theming', label: '主题定制（Tokens / 预设）', group: '核心能力', content: themingDoc },
  { id: 'i18n', label: '多语言（中英内置）', group: '核心能力', content: i18nDoc },
  { id: 'integration', label: '集成方式（SDK / 嵌入 / WC）', group: '集成', content: integrationDoc },
  { id: 'protocols', label: 'AI 协议接入（32 种）', group: '集成', content: protocolsDoc },
  { id: 'enterprise', label: '企业组件', group: '集成', content: enterpriseDoc },
]

const groups = computed(() => {
  const map = new Map<string, DocSection[]>()
  for (const s of SECTIONS) {
    if (!map.has(s.group)) map.set(s.group, [])
    map.get(s.group)!.push(s)
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }))
})

const activeId = ref(SECTIONS[0].id)
const active = computed(() => SECTIONS.find((s) => s.id === activeId.value) ?? SECTIONS[0])

/** 内容按 [demo:name] 标记切分为 markdown 片段与内嵌演示 */
const fragments = computed(() => splitDocContent(active.value.content))

/** 从当前文档提取 h2 作为页内目录 */
const toc = computed(() => {
  const out: { text: string; anchor: string }[] = []
  for (const m of active.value.content.matchAll(/^##\s+(.+)$/gm)) {
    out.push({ text: m[1].trim(), anchor: m[1].trim() })
  }
  return out
})

const contentEl = ref<HTMLElement>()

watch(activeId, () => {
  contentEl.value?.scrollTo({ top: 0 })
})

function jumpTo(anchorText: string) {
  if (!contentEl.value) return
  const headings = contentEl.value.querySelectorAll('h2')
  for (const h of headings) {
    if (h.textContent?.trim().startsWith(anchorText.replace(/\s*\(.*\)$/, '').slice(0, 8))) {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
  }
}
</script>

<template>
  <div class="docs">
    <!-- 左侧菜单 -->
    <nav class="docs__nav" aria-label="文档章节">
      <div v-for="g in groups" :key="g.label" class="docs__group">
        <p class="docs__group-label">{{ g.label }}</p>
        <button
          v-for="s in g.items"
          :key="s.id"
          type="button"
          class="docs__link"
          :class="{ 'docs__link--active': s.id === activeId }"
          :aria-current="s.id === activeId ? 'page' : undefined"
          @click="activeId = s.id"
        >
          {{ s.label }}
        </button>
      </div>
    </nav>

    <!-- 右侧内容 -->
    <div ref="contentEl" class="docs__content">
      <article class="docs__article">
        <template v-for="(frag, i) in fragments" :key="`${activeId}-${i}`">
          <MarkdownText v-if="frag.kind === 'md'" :content="frag.content" />
          <component :is="DEMO_BLOCKS[frag.name]" v-else class="docs__demo" />
        </template>
      </article>
    </div>

    <!-- 页内目录（宽屏显示） -->
    <aside v-if="toc.length > 1" class="docs__toc" aria-label="本页目录">
      <p class="docs__toc-label">本页目录</p>
      <button
        v-for="t in toc"
        :key="t.anchor"
        type="button"
        class="docs__toc-link"
        @click="jumpTo(t.anchor)"
      >
        {{ t.text }}
      </button>
    </aside>
  </div>
</template>

<style scoped>
.docs {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--ac-bg);
}

/* 左侧菜单 */
.docs__nav {
  width: 232px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--ac-border);
  background: var(--ac-surface);
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.docs__group { display: flex; flex-direction: column; gap: 2px; }
.docs__group-label {
  margin: 0 0 4px;
  padding: 0 10px;
  font-size: 11px;
  color: var(--ac-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.docs__link {
  text-align: left;
  border: none;
  background: transparent;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--ac-fg);
  cursor: pointer;
  line-height: 1.4;
}
.docs__link:hover { background: var(--ac-bg); }
.docs__link--active {
  background: var(--ac-primary-soft, rgba(29, 78, 216, 0.08));
  color: var(--ac-primary);
  font-weight: 600;
}

/* 内容区 */
.docs__content { flex: 1; min-width: 0; overflow-y: auto; }
.docs__article {
  max-width: 780px;
  margin: 0 auto;
  padding: 32px 28px 90px;
}
.docs__article :deep(h1) { font-size: 25px; margin: 0 0 14px; }
.docs__article :deep(h2) {
  font-size: 19px;
  margin: 34px 0 12px;
  padding-top: 18px;
  border-top: 1px solid var(--ac-border);
}
.docs__article :deep(h3) { font-size: 15.5px; margin: 22px 0 8px; }
.docs__article :deep(p), .docs__article :deep(li) { line-height: 1.65; font-size: 14px; }
.docs__article :deep(table) { width: 100%; font-size: 13px; }
.docs__article :deep(pre) { font-size: 12.5px; }

/* 页内目录 */
.docs__toc {
  width: 190px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 32px 14px;
  border-left: 1px solid var(--ac-border);
  display: none;
  flex-direction: column;
  gap: 2px;
}
.docs__toc-label {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--ac-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.docs__toc-link {
  text-align: left;
  border: none;
  background: transparent;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--ac-muted);
  cursor: pointer;
  line-height: 1.4;
}
.docs__toc-link:hover { color: var(--ac-primary); background: var(--ac-surface); }

@media (min-width: 1200px) {
  .docs__toc { display: flex; }
}
@media (max-width: 760px) {
  .docs__nav { width: 170px; }
  .docs__article { padding: 20px 16px 60px; }
}
</style>
