<script setup lang="ts">
/**
 * PanelContainer —— 右侧面板多页签容器。
 *
 * 页签由 panels 数组驱动，每个 panel 的内容用具名 slot（slot 名 = panel.id）填充。
 * 支持 badge（如变更计数）、受控/非受控 activeId。
 */
import { computed, ref } from 'vue'

export interface PanelTab {
  id: string
  label: string
  /** 徽标数（0 或 undefined 不显示） */
  badge?: number
  /** 徽标色调 */
  badgeTone?: 'default' | 'warning' | 'danger'
}

const props = withDefaults(
  defineProps<{
    panels: PanelTab[]
    /** 受控激活页签 */
    activeId?: string
    /** 高度 */
    height?: string
  }>(),
  { activeId: undefined, height: '100%' },
)

const emit = defineEmits<{
  (e: 'update:activeId', id: string): void
}>()

const inner = ref(props.panels[0]?.id ?? '')
const current = computed(() => {
  const id = props.activeId ?? inner.value
  // 面板集合动态变化（如宿主勾选开关）后，激活 id 可能已不存在 → 回退到第一个
  return props.panels.some((p) => p.id === id) ? id : (props.panels[0]?.id ?? '')
})

function activate(id: string) {
  inner.value = id
  emit('update:activeId', id)
}
</script>

<template>
  <div class="ac-panels" :style="{ height }">
    <!-- 单面板：不渲染 tabs，改为简洁标题头 -->
    <div v-if="panels.length === 1" class="ac-panels__single-head">
      <span class="ac-panels__single-title">{{ panels[0].label }}</span>
      <span
        v-if="panels[0].badge"
        class="ac-panels__badge"
        :class="`ac-panels__badge--${panels[0].badgeTone ?? 'default'}`"
      >{{ panels[0].badge }}</span>
    </div>
    <div v-else class="ac-panels__tabs" role="tablist">
      <button
        v-for="p in panels"
        :key="p.id"
        type="button"
        role="tab"
        class="ac-panels__tab"
        :aria-selected="current === p.id"
        :class="{ 'ac-panels__tab--active': current === p.id }"
        @click="activate(p.id)"
      >
        {{ p.label }}
        <span
          v-if="p.badge"
          class="ac-panels__badge"
          :class="`ac-panels__badge--${p.badgeTone ?? 'default'}`"
        >{{ p.badge }}</span>
      </button>
    </div>
    <div class="ac-panels__body">
      <template v-for="p in panels" :key="p.id">
        <div v-show="current === p.id" class="ac-panels__pane" role="tabpanel">
          <slot :name="p.id" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ac-panels { display: flex; flex-direction: column; overflow: hidden; }
.ac-panels__tabs {
  display: flex;
  gap: 2px;
  padding: 0 8px;
  border-bottom: 1px solid var(--ac-border);
  background: var(--ac-surface);
  overflow-x: auto;
}
.ac-panels__tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--ac-muted);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
}
.ac-panels__tab:hover { color: var(--ac-fg); }
.ac-panels__single-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 13px 8px;
  border-bottom: 1px solid var(--ac-border);
  background: var(--ac-surface);
}
.ac-panels__single-title {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ac-muted);
  letter-spacing: 0.03em;
}
.ac-panels__tab--active { color: var(--ac-primary); border-bottom-color: var(--ac-primary); font-weight: 600; }
.ac-panels__badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--ac-border);
  color: var(--ac-fg);
  font-size: 0.66rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.ac-panels__badge--warning { background: color-mix(in srgb, var(--ac-warning) 22%, transparent); color: var(--ac-warning); }
.ac-panels__badge--danger { background: color-mix(in srgb, var(--ac-danger) 18%, transparent); color: var(--ac-danger); }
.ac-panels__body { flex: 1; min-height: 0; overflow: hidden; }
.ac-panels__pane {
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  /* 槽内容与面板边缘的呼吸间距；宿主可用 --ac-panel-pad: 0 恢复贴边（如终端类面板） */
  padding: var(--ac-panel-pad, 10px 12px);
}
</style>
