<template>
  <section class="bp" aria-label="演示数据">
    <div class="bp__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="bp__tab"
        :data-active="active === tab.key"
        :aria-selected="active === tab.key"
        @click="active = tab.key"
      >
        {{ tab.label }}
        <span class="bp__count">{{ tab.count }}</span>
      </button>
    </div>

    <div class="bp__body">
      <!-- 工作项 -->
      <template v-if="active === 'wi'">
        <article v-for="wi in db.workItems" :key="wi.id" class="bp__card">
          <header class="bp__card-head">
            <code class="bp__id">{{ wi.id }}</code>
            <span class="bp__status" :data-status="wi.status">{{ wi.status }}</span>
          </header>
          <h4 class="bp__title">{{ wi.title }}</h4>
          <dl class="bp__meta">
            <div><dt>类别</dt><dd>{{ wi.category }}（{{ wi.priority }}）</dd></div>
            <div><dt>说明</dt><dd>{{ wi.description }}</dd></div>
            <div v-if="wi.amount"><dt>金额</dt><dd>¥{{ wi.amount.toLocaleString('zh-CN') }}</dd></div>
            <div><dt>发起人</dt><dd>{{ wi.requester }}（{{ wi.department }}）</dd></div>
            <div><dt>截止日期</dt><dd>{{ wi.dueDate }}</dd></div>
          </dl>
        </article>
      </template>

      <!-- 审批流 -->
      <template v-else-if="active === 'af'">
        <p v-if="db.approvalFlows.length === 0" class="bp__empty">
          暂无审批流。试试对助手说：&ldquo;帮 WI-2024-003 创建审批流&rdquo;
        </p>
        <article v-for="af in db.approvalFlows" :key="af.id" class="bp__card">
          <header class="bp__card-head">
            <code class="bp__id">{{ af.id }}</code>
            <span class="bp__status" :data-status="af.status">{{ af.status }}</span>
          </header>
          <h4 class="bp__title">{{ af.title }}</h4>
          <dl class="bp__meta">
            <div><dt>关联工作项</dt><dd><code>{{ af.workItemId }}</code></dd></div>
            <div><dt>审批层级</dt><dd>{{ af.currentStep }} / {{ af.approvers.length }} 级</dd></div>
            <div><dt>截止日期</dt><dd>{{ af.deadline }}</dd></div>
          </dl>
        </article>
      </template>

      <!-- 团队成员 -->
      <template v-else-if="active === 'mb'">
        <article v-for="m in db.members" :key="m.id" class="bp__card">
          <header class="bp__card-head">
            <code class="bp__id">{{ m.id }}</code>
            <span class="bp__status" :data-status="m.available ? '已批准' : '已驳回'">
              {{ m.available ? '可用' : '不可用' }}
            </span>
          </header>
          <h4 class="bp__title">{{ m.name }} · {{ m.role }}</h4>
          <dl class="bp__meta">
            <div><dt>部门</dt><dd>{{ m.department }}</dd></div>
            <div><dt>评分</dt><dd>{{ m.rating }} / 5</dd></div>
            <div><dt>当前负载</dt><dd>{{ m.workload }}%</dd></div>
            <div><dt>技能</dt><dd>{{ m.skills.join('、') }}</dd></div>
          </dl>
        </article>
      </template>

      <!-- 审计日志 -->
      <template v-else>
        <p v-if="db.auditLog.length === 0" class="bp__empty">暂无审计记录，与助手交互后产生。</p>
        <ul class="bp__audit">
          <li v-for="rec in db.auditLog" :key="rec.id">
            <span class="bp__audit-time">{{ rec.timestamp }}</span>
            <span><strong>{{ rec.action }}</strong> · {{ rec.target }} — {{ rec.detail }}</span>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * BusinessPanel — 左侧演示数据面板（通用协作域）
 * 展示内存数据库的实时状态；Agent 执行工具修改数据后此处立即响应更新。
 */
import { computed, ref } from 'vue'
import { db } from '../mock/demo-data'

const active = ref<'wi' | 'af' | 'mb' | 'audit'>('wi')

const tabs = computed(() => [
  { key: 'wi' as const, label: '工作项', count: db.workItems.length },
  { key: 'af' as const, label: '审批流', count: db.approvalFlows.length },
  { key: 'mb' as const, label: '团队', count: db.members.length },
  { key: 'audit' as const, label: '审计', count: db.auditLog.length },
])
</script>

<style scoped>
.bp {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  overflow: hidden;
}
.bp__tabs {
  display: flex;
  border-bottom: 1px solid var(--app-border);
  overflow-x: auto;
  flex-shrink: 0;
}
.bp__tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--app-muted);
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}
.bp__tab[data-active='true'] {
  color: var(--app-primary);
  border-bottom-color: var(--app-primary);
  font-weight: 600;
}
.bp__count {
  background: var(--app-bg);
  border-radius: 999px;
  padding: 0 6px;
  font-size: 11px;
}
.bp__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bp__card {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 10px 12px;
}
.bp__card--new {
  border-color: var(--app-primary);
}
.bp__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.bp__id {
  font-size: 12px;
  color: var(--app-muted);
  background: var(--app-bg);
  padding: 1px 6px;
  border-radius: 4px;
}
.bp__status {
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--app-bg);
  color: var(--app-muted);
  white-space: nowrap;
}
.bp__status[data-status='已批准'],
.bp__status[data-status='已完成'],
.bp__status[data-status='已通过'],
.bp__status[data-status='执行中'] {
  background: #e6f2ee;
  color: var(--app-primary);
}
.bp__status[data-status='审批中'],
.bp__status[data-status='进行中'],
.bp__status[data-status='已提交'] {
  background: #fef3c7;
  color: var(--app-warn);
}
.bp__status[data-status='已驳回'],
.bp__status[data-status='已拒绝'] {
  background: #fee2e2;
  color: var(--app-danger);
}
.bp__title {
  margin: 6px 0 8px;
  font-size: 13.5px;
  font-weight: 600;
}
.bp__meta {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12.5px;
}
.bp__meta div {
  display: flex;
  gap: 8px;
}
.bp__meta dt {
  color: var(--app-muted);
  flex-shrink: 0;
  width: 60px;
}
.bp__meta dd {
  margin: 0;
  word-break: break-all;
}
.bp__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 8px;
}
.bp__table th,
.bp__table td {
  border: 1px solid var(--app-border);
  padding: 4px 6px;
  text-align: left;
  white-space: nowrap;
}
.bp__table th {
  background: var(--app-bg);
  font-weight: 500;
}
.bp__empty {
  color: var(--app-muted);
  font-size: 13px;
  text-align: center;
  padding: 24px 12px;
  margin: 0;
}
.bp__audit {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12.5px;
}
.bp__audit li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
}
.bp__audit-time {
  color: var(--app-muted);
  font-size: 11.5px;
}
</style>
