<script setup lang="ts">
/** 会话管理演示：搜索/新建/置顶/重命名/删除 */
import { ref } from 'vue'
import SessionList from '../../../lib/agent-copilot/components/general/SessionList.vue'
import type { SessionItem } from '../../../lib/agent-copilot'
import DocDemo from '../DocDemo.vue'

const sessions = ref<SessionItem[]>([
  { id: 's1', title: '差旅报销咨询', updatedAt: Date.now() - 3600_000, pinned: true },
  { id: 's2', title: '季度风险分析', updatedAt: Date.now() - 86400_000 },
  { id: 's3', title: '合同条款比对', updatedAt: Date.now() - 172800_000 },
])
const activeId = ref('s1')
</script>

<template>
  <DocDemo
    title="会话管理"
    description="受控组件：会话数据与操作全部由宿主管理，组件只负责展示与交互。"
    component-name="SessionList"
    usage="多会话侧栏（工作台左栏）。完全受控：sessions/activeId 由宿主持有，组件通过事件回调请求变更（选中/新建/重命名/删除/置顶），宿主决定是否落库。支持搜索过滤与置顶分组。"
    :props-table="[
      { name: 'sessions', type: 'SessionItem[]', description: '会话数组：{ id, title, updatedAt, pinned? }' },
      { name: 'activeId', type: 'string', description: '当前选中会话 id' },
      { name: 'searchable', type: 'boolean', default: 'true', description: '显示搜索框' },
      { name: 'creatable', type: 'boolean', default: 'true', description: '显示新建按钮' },
      { name: '@select / @create / @rename / @delete / @pin', type: 'function', description: '全部操作事件（宿主实现）' },
    ]"
    :controls="[
      { name: 'searchable', label: '搜索框', type: 'boolean', default: true },
      { name: 'creatable', label: '新建按钮', type: 'boolean', default: true },
    ]"
  >
    <template #default="{ values }">
      <div class="demo-session ac-root">
        <SessionList
          :sessions="sessions"
          :active-id="activeId"
          :searchable="!!values.searchable"
          :creatable="!!values.creatable"
          @select="(id: string) => (activeId = id)"
          @create="sessions.unshift({ id: `s_${Date.now()}`, title: '新会话', updatedAt: Date.now() })"
          @rename="(id: string, title: string) => { const s = sessions.find((x) => x.id === id); if (s) s.title = title }"
          @delete="(id: string) => (sessions = sessions.filter((s) => s.id !== id))"
          @pin="(id: string, pinned: boolean) => { const s = sessions.find((x) => x.id === id); if (s) s.pinned = pinned }"
        />
      </div>
    </template>
  </DocDemo>
</template>

<style scoped>
.demo-session { max-width: 340px; }
</style>
