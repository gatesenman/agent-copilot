<script setup lang="ts">
/**
 * OmniWorkbenchPanel — 全能助手「工作台+」页签。
 * 工作区全域组件：FilePanel / BrowserPanel / McpServerPanel
 * + 聚合大组件内嵌演示：CopilotChat / CopilotShell / AgentWorkspace。
 */
import { ref } from 'vue'
import FilePanel from '../../lib/agent-copilot/components/workspace/FilePanel.vue'
import BrowserPanel from '../../lib/agent-copilot/components/workspace/BrowserPanel.vue'
import AgentWorkspace from '../../lib/agent-copilot/components/workspace/AgentWorkspace.vue'
import McpServerPanel from '../../lib/agent-copilot/components/protocol/McpServerPanel.vue'
import CopilotChat from '../../lib/agent-copilot/components/chat/CopilotChat.vue'
import CopilotShell from '../../lib/agent-copilot/components/shell/CopilotShell.vue'
import AgentCopilot from '../../lib/agent-copilot/components/shell/AgentCopilot.vue'
import { useCopilot } from '../../lib/agent-copilot/composables/useCopilot'
import type { WorkspaceFile } from '../../lib/agent-copilot/types'

const store = useCopilot()

const FILES: WorkspaceFile[] = [
  {
    path: 'src', kind: 'dir', children: [
      {
        path: 'src/utils', kind: 'dir', children: [
          { path: 'src/utils/debounce.ts', kind: 'file', language: 'typescript', content: `export function debounce(fn: () => void, wait = 300) {\n  let timer: number | null = null\n  return () => {\n    if (timer) clearTimeout(timer)\n    timer = window.setTimeout(fn, wait)\n  }\n}` },
        ],
      },
      { path: 'src/pages', kind: 'dir', children: [{ path: 'src/pages/dashboard.vue', kind: 'file', language: 'vue', content: '<template>\n  <h1>Dashboard</h1>\n</template>' }] },
    ],
  },
  { path: 'README.md', kind: 'file', language: 'markdown', content: '# 全能助手演示工程\n\n知识 / 代码 / 数据 三域聚合。' },
]
const selectedPath = ref('src/utils/debounce.ts')

const MCP_TOOLS = [
  { name: 'search_knowledge', description: '检索企业知识库', inputSchema: { type: 'object', properties: { query: { type: 'string', description: '检索词' } }, required: ['query'] } },
  { name: 'run_sql', description: '执行只读 SQL 查询', inputSchema: { type: 'object', properties: { sql: { type: 'string', description: 'SELECT 语句' } }, required: ['sql'] } },
]
const MCP_RESOURCES = [
  { uri: 'kb://policies/travel', name: '差旅制度', mimeType: 'application/pdf' },
]
const MCP_PROMPTS = [
  { name: 'weekly_report', description: '生成周报模板' },
]

/** 聚合大组件按需展开（默认折叠,避免同屏多套消息流干扰） */
const showChat = ref(false)
const showShell = ref(false)
const showWorkspace = ref(false)
const showAllInOne = ref(false)
</script>

<template>
  <div class="owb">
    <p class="owb__intro">工作区全域：文件树 / 浏览器预览 / MCP 服务器面板,及三个聚合大组件的内嵌形态（共享当前会话）。</p>

    <section class="owb__sec" data-comp="FilePanel（文件树 + 代码预览）">
      <FilePanel
        :files="FILES"
        :selected-path="selectedPath"
        title="项目文件"
        style="height: 260px"
        @select="(f: WorkspaceFile) => (selectedPath = f.path)"
      />
    </section>

    <section class="owb__sec" data-comp="BrowserPanel（内嵌预览 / 截图模式）">
      <BrowserPanel display-url="https://preview.example.com/dashboard" style="height: 200px">
        <div class="owb__browser-demo">
          <strong>Dashboard 预览</strong>
          <span>Agent 部署后的实时页面快照（演示内容）</span>
        </div>
      </BrowserPanel>
    </section>

    <section class="owb__sec" data-comp="McpServerPanel（MCP 工具 / 资源 / 提示模板）">
      <McpServerPanel server-name="enterprise-mcp" :tools="MCP_TOOLS" :resources="MCP_RESOURCES" :prompts="MCP_PROMPTS" />
    </section>

    <section class="owb__sec" data-comp="CopilotChat（独立完整对话组件,共享当前会话）">
      <button type="button" class="owb__toggle" :aria-expanded="showChat" @click="showChat = !showChat">
        {{ showChat ? '收起 CopilotChat' : '展开 CopilotChat 内嵌演示' }}
      </button>
      <div v-if="showChat" class="owb__embed" style="height: 380px">
        <CopilotChat subtitle="与主面共享同一 useCopilot 会话" />
      </div>
    </section>

    <section class="owb__sec" data-comp="CopilotShell（会话边栏 + 对话的工作台壳）">
      <button type="button" class="owb__toggle" :aria-expanded="showShell" @click="showShell = !showShell">
        {{ showShell ? '收起 CopilotShell' : '展开 CopilotShell 内嵌演示' }}
      </button>
      <div v-if="showShell" class="owb__embed" style="height: 420px">
        <CopilotShell title="工作台壳" subtitle="会话管理 + 对话" />
      </div>
    </section>

    <section class="owb__sec" data-comp="AgentWorkspace(对话 + 工作区面板的双栏布局)">
      <button type="button" class="owb__toggle" :aria-expanded="showWorkspace" @click="showWorkspace = !showWorkspace">
        {{ showWorkspace ? '收起 AgentWorkspace' : '展开 AgentWorkspace 内嵌演示' }}
      </button>
      <div v-if="showWorkspace" class="owb__embed" style="height: 420px">
        <AgentWorkspace />
      </div>
    </section>

    <section class="owb__sec" data-comp="AgentCopilot（一体化聚合大组件,自带 Provider 独立会话）">
      <button type="button" class="owb__toggle" :aria-expanded="showAllInOne" @click="showAllInOne = !showAllInOne">
        {{ showAllInOne ? '收起 AgentCopilot' : '展开 AgentCopilot 内嵌演示（独立会话）' }}
      </button>
      <div v-if="showAllInOne" class="owb__embed">
        <AgentCopilot :config="{ ...store.config, welcomeScreen: undefined }" title="一体化助手" subtitle="独立 Provider 会话" height="420px" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.owb { display: flex; flex-direction: column; gap: 14px; padding: 10px; }
.owb__intro { margin: 0; font-size: 12px; color: var(--ac-muted, #64748b); }
.owb__sec {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 8px 8px;
  border: 1px dashed color-mix(in srgb, var(--ac-primary, #2563eb) 25%, transparent);
  border-radius: 10px;
}
.owb__sec::before {
  content: attr(data-comp);
  position: absolute;
  top: -1px;
  left: 8px;
  font-size: 10px;
  font-weight: 650;
  color: var(--ac-primary, #2563eb);
  background: color-mix(in srgb, var(--ac-primary, #2563eb) 8%, var(--ac-bg, #fff));
  border: 1px solid color-mix(in srgb, var(--ac-primary, #2563eb) 30%, transparent);
  border-top: none;
  border-radius: 0 0 6px 6px;
  padding: 1px 8px;
  max-width: 92%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.owb__toggle {
  align-self: flex-start;
  border: 1px solid var(--ac-border, #e2e8f0);
  background: var(--ac-surface, #f8fafc);
  color: var(--ac-fg, #0f172a);
  font-size: 12px;
  border-radius: 7px;
  padding: 5px 12px;
  cursor: pointer;
}
.owb__toggle:hover { border-color: var(--ac-primary, #2563eb); }
.owb__embed {
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 10px;
  overflow: hidden;
  min-height: 0;
}
.owb__browser-demo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 13px;
  color: var(--ac-muted, #64748b);
}
</style>
