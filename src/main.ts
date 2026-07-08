import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { createCopilot, defineCopilotConfig } from './lib/agent-copilot'

/**
 * 标准集成样板：应用级默认配置（第 3 层）。
 * 演示站全部 CopilotProvider / AgentCopilot 实例自动继承以下默认值，
 * 各页面 config prop 仅传实例差异（agentType / model / persistence 等）。
 */
createApp(App)
  .use(createCopilot(defineCopilotConfig({
    locale: 'zh-CN',
    theme: 'auto',
    showTimestamps: true,
    debug: false,
  })))
  .mount('#app')
