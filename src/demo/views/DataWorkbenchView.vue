<script setup lang="ts">
/**
 * 解决方案 · Data Agent —— 数据分析助手端到端演示。
 * 真实模型驱动：指标卡 / SQL 结果 / 图表 / 增强表格按意图自动渲染。
 */
import AgentDemoPane from '../gallery/AgentDemoPane.vue'
import { dataAgentActions, dataAgentConfig } from '../gallery/agent-demos'
</script>

<template>
  <div class="dw-root">
    <header class="dw-head">
      <div>
        <h2 class="dw-title">Data Agent — 数据分析助手</h2>
        <p class="dw-desc">
          自然语言查数：模型按意图自动调用 show_metrics / run_sql / show_chart / show_table 渲染结构化结果卡
        </p>
      </div>
      <span class="dw-badge">解决方案演示</span>
    </header>

    <ul class="dw-tips">
      <li>「本季度运营指标怎么样？」→ 指标卡（同比/环比）</li>
      <li>「查一下逾期未完成的工作项」→ SQL 结果卡（可复制语句）</li>
      <li>「画个部门费用对比图」→ 图表卡（柱状/折线/饼图）</li>
      <li>「把成员按评分排个表」→ 增强表格（排序/筛选）</li>
    </ul>

    <div class="dw-body">
      <AgentDemoPane :config="dataAgentConfig" :actions="dataAgentActions" height="100%" />
    </div>
  </div>
</template>

<style scoped>
.dw-root {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  min-height: 0;
}
.dw-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.dw-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--ac-fg);
}
.dw-desc {
  margin: 0;
  font-size: 13px;
  color: var(--ac-muted);
  line-height: 1.6;
}
.dw-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, #0f6b54 10%, transparent);
  color: #0f6b54;
  font-size: 12px;
  font-weight: 600;
}
.dw-tips {
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ac-muted);
  columns: 2;
}
.dw-body { flex: 1; min-height: 0; }
</style>
