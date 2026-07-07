import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
// 真实 Node Agent 后端（/api/agent/*，SSE 协议与 HttpAgentRuntime 对齐）
import { agentBackendPlugin } from './server/agent-backend.mjs'

export default defineConfig({
  plugins: [vue(), agentBackendPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 演示代码以“agent-copilot 包”形式书写；将其映射到库源码，
      // 避免 Vite 依赖扫描把它当成缺失的 npm 包（曾导致启动报错）
      'agent-copilot': fileURLToPath(new URL('./src/lib/agent-copilot/index.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    // 预声明全部重依赖，防止运行中途“optimized dependencies changed. reloading”
    // ——中途再优化会让页面同时加载两份 vue chunk，引发 renderSlot 空指针
    include: ['vue', 'vue-router', 'marked', 'katex', 'mermaid'],
  },
  server: {
    host: true,
    port: 3000,
  },
})
