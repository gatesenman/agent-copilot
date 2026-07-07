<script setup lang="ts">
/**
 * Markdown 增强渲染演示：
 * KaTeX 公式 / Mermaid 图表 / GitHub 警告块 / 任务列表 / 脚注 / diff 代码 / 表格复制 / 折叠块。
 */
import MarkdownText from '../../lib/agent-copilot/components/chat/MarkdownText.vue'

const SAMPLE = `## Markdown 增强渲染

> [!NOTE]
> 本组件支持 GitHub 风格警告块：NOTE / TIP / IMPORTANT / WARNING / CAUTION。

> [!WARNING]
> 流式渲染时，不完整的公式与 Mermaid 图会安全降级为原文，流结束后再渲染。

### 数学公式（KaTeX）

行内公式 $E = mc^2$，块级公式：

$$
\\hat{y} = \\mathrm{softmax}\\left(\\frac{QK^\\top}{\\sqrt{d_k}}\\right)V
$$

### 流程图（Mermaid）

\`\`\`mermaid
graph LR
  A[用户输入] --> B{意图识别}
  B -->|查询| C[知识检索]
  B -->|操作| D[工具调用]
  C --> E[生成回答]
  D --> E
\`\`\`

### 任务列表与脚注

- [x] 支持 GFM 任务列表
- [x] 支持脚注引用[^1]
- [ ] 待办事项渲染为禁用复选框

[^1]: 脚注内容显示在文档底部，带返回链接。

### 高亮标记与外部链接

结论：==本季度核心指标全部达标==，详细数据见 [Vercel 官方文档](https://vercel.com/docs "外链自动加安全属性与图标")。

### 语法高亮代码块（带行号）

\`\`\`typescript title="retry.ts" showLineNumbers
// 指数退避重试
export async function withRetry<T>(fn: () => Promise<T>, max = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn() }
    catch (err) {
      if (i >= max) throw err
      await new Promise(r => setTimeout(r, 2 ** i * 500))
    }
  }
}
\`\`\`

### diff 代码块（带文件名）

\`\`\`diff title="useCopilot.ts"
  function sendMessage(content: string) {
-   if (status === 'running') return
+   if (status === 'running') return enqueue(content)
    dispatch(content)
  }
\`\`\`

### 表格（悬停显示复制按钮）

| 方案 | 等级 | 成本 | 周期 |
| ---- | ---- | ---- | ---- |
| 方案 Alpha | A | ¥86万 | 30 天 |
| 方案 Beta | A | ¥89万 | 25 天 |
| 方案 Gamma | B | ¥82万 | 40 天 |

### 折叠块

<details>
<summary>点击查看完整评审细则</summary>

评审委员会由 5 名以上专家组成，技术分占 60%，成本分占 40%。

</details>
`
</script>

<template>
  <section class="md-show">
    <h2>MarkdownText — 企业级 Markdown 渲染</h2>
    <p class="g-desc">
      聊天气泡内的所有助手回复均使用此渲染器。以下为一次性渲染的完整能力样例
      （公式 / 流程图 / 警告块 / 任务列表 / 脚注 / ==高亮标记== / 外链安全属性 /
      语法高亮 + 行号 / diff / 表格 / 折叠块 / 标题锚点）。
    </p>
    <div class="md-show__body">
      <MarkdownText :content="SAMPLE" />
    </div>
  </section>
</template>

<style scoped>
.md-show h2 { font-size: 17px; margin: 0 0 6px; }
.g-desc {
  color: var(--ac-muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 12px;
}
.md-show__body {
  border: 1px solid var(--ac-border);
  border-radius: 12px;
  padding: 20px 24px;
  background: var(--ac-bg);
}
</style>
