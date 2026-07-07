<script setup lang="ts">
/**
 * SessionList —— 会话列表（企业级多会话管理）
 * 纯展示组件：数据与操作由外部传入，支持置顶、重命名、删除、搜索。
 */
import { computed, ref } from 'vue'

export interface SessionItem {
  id: string
  title: string
  /** 最近一条消息摘要 */
  preview?: string
  updatedAt?: number
  pinned?: boolean
  /** 未读数 */
  unread?: number
}

const props = withDefaults(
  defineProps<{
    sessions: SessionItem[]
    activeId?: string
    /** 显示搜索框 */
    searchable?: boolean
    /** 显示新建按钮 */
    creatable?: boolean
  }>(),
  { searchable: true, creatable: true },
)

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'create'): void
  (e: 'rename', id: string, title: string): void
  (e: 'delete', id: string): void
  (e: 'pin', id: string, pinned: boolean): void
}>()

const query = ref('')
const renamingId = ref<string | null>(null)
const renameText = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = q
    ? props.sessions.filter((s) => s.title.toLowerCase().includes(q) || s.preview?.toLowerCase().includes(q))
    : props.sessions
  // 置顶优先，其余按更新时间倒序
  return [...list].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  })
})

function timeText(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function startRename(s: SessionItem) {
  renamingId.value = s.id
  renameText.value = s.title
}

function commitRename() {
  if (renamingId.value && renameText.value.trim()) {
    emit('rename', renamingId.value, renameText.value.trim())
  }
  renamingId.value = null
}
</script>

<template>
  <div class="ac-sessions">
    <div class="ac-sessions__top">
      <input
        v-if="searchable"
        v-model="query"
        type="search"
        class="ac-sessions__search"
        placeholder="搜索会话…"
        aria-label="搜索会话"
      />
      <button v-if="creatable" type="button" class="ac-sessions__new" aria-label="新建会话" @click="emit('create')">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <ul class="ac-sessions__list" role="listbox" aria-label="会话列表">
      <li v-for="s in filtered" :key="s.id">
        <div
          class="ac-sessions__item"
          :class="{ 'ac-sessions__item--active': s.id === activeId }"
          role="option"
          :aria-selected="s.id === activeId"
          tabindex="0"
          @click="emit('select', s.id)"
          @keydown.enter="emit('select', s.id)"
        >
          <div class="ac-sessions__main">
            <template v-if="renamingId === s.id">
              <input
                v-model="renameText"
                class="ac-sessions__rename"
                aria-label="重命名会话"
                @click.stop
                @keydown.enter.stop="commitRename"
                @keydown.esc.stop="renamingId = null"
                @blur="commitRename"
              />
            </template>
            <template v-else>
              <div class="ac-sessions__title-row">
                <svg v-if="s.pinned" class="ac-sessions__pin" viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true">
                  <path d="M9.5 1.5 14.5 6.5 12 7l-2 4-1.5-1.5L4 14l-2-2 4.5-4.5L5 6l4-2 .5-2.5Z" />
                </svg>
                <span class="ac-sessions__title">{{ s.title }}</span>
                <span v-if="s.unread" class="ac-sessions__unread" :aria-label="`${s.unread} 条未读`">{{ s.unread > 99 ? '99+' : s.unread }}</span>
              </div>
              <p v-if="s.preview" class="ac-sessions__preview">{{ s.preview }}</p>
            </template>
          </div>
          <div class="ac-sessions__side">
            <time class="ac-sessions__time">{{ timeText(s.updatedAt) }}</time>
            <div class="ac-sessions__actions">
              <button type="button" class="ac-sessions__act" :aria-label="s.pinned ? '取消置顶' : '置顶'" :title="s.pinned ? '取消置顶' : '置顶'" @click.stop="emit('pin', s.id, !s.pinned)">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                  <path d="M9.5 1.5 14.5 6.5 12 7l-2 4-1.5-1.5L4 14l-2-2 4.5-4.5L5 6l4-2 .5-2.5Z" stroke-linejoin="round" />
                </svg>
              </button>
              <button type="button" class="ac-sessions__act" aria-label="重命名" title="重命名" @click.stop="startRename(s)">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                  <path d="m11 2 3 3-8 8-4 1 1-4 8-8Z" stroke-linejoin="round" />
                </svg>
              </button>
              <button type="button" class="ac-sessions__act ac-sessions__act--danger" aria-label="删除会话" title="删除" @click.stop="emit('delete', s.id)">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                  <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </li>
      <li v-if="filtered.length === 0" class="ac-sessions__empty">暂无会话</li>
    </ul>
  </div>
</template>

<style scoped>
.ac-sessions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  font-family: var(--ac-font-sans, inherit);
}
.ac-sessions__top { display: flex; gap: 6px; }
.ac-sessions__search {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.82rem;
}
.ac-sessions__search:focus { outline: 2px solid var(--ac-primary); outline-offset: -1px; }
.ac-sessions__new {
  flex-shrink: 0;
  width: 30px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ac-sessions__list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ac-sessions__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: calc(var(--ac-radius) * 0.8);
  cursor: pointer;
  border: 1px solid transparent;
}
.ac-sessions__item:hover { background: var(--ac-surface); }
.ac-sessions__item--active { background: var(--ac-surface); border-color: var(--ac-primary); }
.ac-sessions__main { flex: 1; min-width: 0; }
.ac-sessions__title-row { display: flex; align-items: center; gap: 5px; }
.ac-sessions__pin { color: var(--ac-primary); flex-shrink: 0; }
.ac-sessions__title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ac-fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-sessions__unread {
  flex-shrink: 0;
  min-width: 17px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
  font-size: 0.68rem;
  line-height: 17px;
  text-align: center;
}
.ac-sessions__preview {
  margin: 2px 0 0;
  font-size: 0.76rem;
  color: var(--ac-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-sessions__rename {
  width: 100%;
  padding: 3px 6px;
  border: 1px solid var(--ac-primary);
  border-radius: 5px;
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.84rem;
}
.ac-sessions__side { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.ac-sessions__time { font-size: 0.7rem; color: var(--ac-muted); }
.ac-sessions__actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.ac-sessions__item:hover .ac-sessions__actions,
.ac-sessions__item:focus-within .ac-sessions__actions { opacity: 1; }
.ac-sessions__act {
  border: none;
  background: transparent;
  color: var(--ac-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
}
.ac-sessions__act:hover { color: var(--ac-fg); background: var(--ac-border); }
.ac-sessions__act--danger:hover { color: var(--ac-danger); }
.ac-sessions__empty { padding: 20px 0; text-align: center; color: var(--ac-muted); font-size: 0.82rem; }
</style>
