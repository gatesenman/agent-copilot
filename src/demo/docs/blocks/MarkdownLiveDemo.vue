<script setup lang="ts">
/** Markdown 渲染演示：可编辑源文本实时预览公式/警告块/代码 */
import { ref } from 'vue'
import MarkdownText from '../../../lib/agent-copilot/components/chat/MarkdownText.vue'
import DocDemo from '../DocDemo.vue'

const source = ref(`## 渲染能力
质能方程 $$E = mc^2$$ 内联渲染。

> [!TIP]
> 支持 GitHub 风格警告块。

\`\`\`ts
const answer: number = 42
\`\`\`

- [x] 任务列表
- [ ] 待办项`)
</script>

<template>
  <DocDemo
    title="Markdown 渲染"
    description="左侧编辑源文本，右侧实时渲染。支持 KaTeX 公式、Mermaid、警告块、任务列表。"
    component-name="MarkdownText"
    usage="消息气泡内部的 Markdown 渲染器，CopilotChat 自动使用。单独引入可渲染任意 Markdown（文档预览、评论渲染）。流式期间置 streaming=true 会跳过 Mermaid 编译避免闪烁，结束后再完整渲染。"
    :props-table="[
      { name: 'content', type: 'string', description: 'Markdown 源文本' },
      { name: 'streaming', type: 'boolean', default: 'false', description: '流式中（跳过 Mermaid、防抖 KaTeX）' },
    ]"
    :controls="[
      { name: 'streaming', label: '流式态（跳过 Mermaid）', type: 'boolean', default: false },
    ]"
  >
    <template #default="{ values }">
      <div class="demo-md">
        <textarea v-model="source" class="demo-md__src" rows="10" aria-label="Markdown 源文本" />
        <div class="demo-md__preview ac-root">
          <MarkdownText :content="source" :streaming="!!values.streaming" />
        </div>
      </div>
    </template>
  </DocDemo>
</template>

<style scoped>
.demo-md { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.demo-md__src {
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 12.5px;
  line-height: 1.55;
  padding: 10px;
  border: 1px solid var(--ac-border, #e4e7ec);
  border-radius: 8px;
  background: var(--ac-surface, #fff);
  color: var(--ac-fg, #101828);
  resize: vertical;
}
.demo-md__preview { min-width: 0; overflow-x: auto; }
@media (max-width: 720px) {
  .demo-md { grid-template-columns: 1fr; }
}
</style>
