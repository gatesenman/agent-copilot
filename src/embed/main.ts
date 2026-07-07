/**
 * 嵌入页入口（/embed.html）
 * 职责：URL 参数 + postMessage 双通道配置，挂载独立的 Copilot 对话应用。
 * 该入口不依赖 demo 站任何代码，可单独构建部署为对外嵌入端点。
 */
import { createApp } from 'vue'
import EmbedApp from './EmbedApp.vue'

createApp(EmbedApp).mount('#embed')
