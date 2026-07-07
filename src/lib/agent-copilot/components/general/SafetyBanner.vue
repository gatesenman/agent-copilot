<script setup lang="ts">
/**
 * SafetyBanner —— 安全拦截/合规提示横幅
 * 内容审核命中、敏感数据检测、权限不足等企业安全场景的统一提示。
 */
withDefaults(
  defineProps<{
    /** 严重级别 */
    level?: 'info' | 'warning' | 'blocked'
    title?: string
    /** 详细说明 */
    detail?: string
    /** 命中的策略名（如 "PII 检测"、"内容安全"） */
    policy?: string
    /** 可申诉/申请豁免 */
    appealable?: boolean
  }>(),
  { level: 'warning' },
)

const emit = defineEmits<{
  (e: 'appeal'): void
  (e: 'dismiss'): void
}>()

const LEVEL_META = {
  info: { label: '提示', icon: 'i' },
  warning: { label: '警告', icon: '!' },
  blocked: { label: '已拦截', icon: 'x' },
} as const
</script>

<template>
  <div class="ac-safety" :class="`ac-safety--${level}`" role="alert">
    <span class="ac-safety__icon" aria-hidden="true">
      <svg v-if="level === 'blocked'" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M3.5 3.5 12.5 12.5" />
      </svg>
      <svg v-else viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6">
        <path d="M8 1.5 15 14H1L8 1.5Z" stroke-linejoin="round" />
        <path d="M8 6v4M8 12.2v.3" stroke-linecap="round" />
      </svg>
    </span>
    <div class="ac-safety__body">
      <p class="ac-safety__title">
        {{ title ?? LEVEL_META[level].label }}
        <span v-if="policy" class="ac-safety__policy">{{ policy }}</span>
      </p>
      <p v-if="detail" class="ac-safety__detail">{{ detail }}</p>
    </div>
    <div class="ac-safety__actions">
      <button v-if="appealable" type="button" class="ac-safety__btn" @click="emit('appeal')">申诉</button>
      <button type="button" class="ac-safety__x" aria-label="关闭提示" @click="emit('dismiss')">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ac-safety {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--ac-radius);
  border: 1px solid;
  font-family: var(--ac-font-sans, inherit);
  font-size: 0.84rem;
}
.ac-safety--info { border-color: var(--ac-border); background: var(--ac-surface); color: var(--ac-fg); }
.ac-safety--info .ac-safety__icon { color: var(--ac-primary); }
.ac-safety--warning {
  border-color: color-mix(in srgb, var(--ac-warning) 45%, transparent);
  background: color-mix(in srgb, var(--ac-warning) 8%, var(--ac-bg));
  color: var(--ac-fg);
}
.ac-safety--warning .ac-safety__icon { color: var(--ac-warning); }
.ac-safety--blocked {
  border-color: color-mix(in srgb, var(--ac-danger) 45%, transparent);
  background: color-mix(in srgb, var(--ac-danger) 8%, var(--ac-bg));
  color: var(--ac-fg);
}
.ac-safety--blocked .ac-safety__icon { color: var(--ac-danger); }
.ac-safety__icon { flex-shrink: 0; display: flex; margin-top: 1px; }
.ac-safety__body { flex: 1; min-width: 0; }
.ac-safety__title { margin: 0; font-weight: 700; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ac-safety__policy {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
  color: var(--ac-muted);
}
.ac-safety__detail { margin: 3px 0 0; color: var(--ac-muted); font-size: 0.8rem; line-height: 1.5; }
.ac-safety__actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.ac-safety__btn {
  padding: 3px 12px;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.76rem;
  cursor: pointer;
}
.ac-safety__btn:hover { border-color: var(--ac-primary); color: var(--ac-primary); }
.ac-safety__x { border: none; background: transparent; color: var(--ac-muted); cursor: pointer; padding: 3px; display: flex; }
.ac-safety__x:hover { color: var(--ac-fg); }
</style>
