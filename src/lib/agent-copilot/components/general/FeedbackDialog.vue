<script setup lang="ts">
/**
 * FeedbackDialog —— 结构化反馈弹窗
 * 点踩后收集细化原因（企业质量回流）：分类多选 + 自由文本。
 */
import { ref, watch } from 'vue'
import { useFocusTrap } from '../../composables/useFocusTrap'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** 反馈原因选项 */
    reasons?: string[]
    title?: string
    /** 文案覆盖 */
    labels?: {
      commentPlaceholder?: string
      cancel?: string
      submit?: string
    }
    /** 是否显示自由文本框 */
    showComment?: boolean
  }>(),
  {
    reasons: () => ['内容不准确', '答非所问', '信息过时', '格式混乱', '回答不完整', '存在安全风险'],
    title: '告诉我们哪里可以改进',
    labels: () => ({}),
    showComment: true,
  },
)

const emit = defineEmits<{
  (e: 'submit', data: { reasons: string[]; comment: string }): void
  (e: 'close'): void
}>()

const selected = ref<Set<string>>(new Set())
const comment = ref('')
const dialogRef = ref<HTMLElement | null>(null)

// 焦点圈定 + Escape 关闭 + 关闭后焦点还原
useFocusTrap(dialogRef, {
  active: () => props.open,
  onEscape: () => emit('close'),
})

watch(
  () => props.open,
  (v) => {
    if (v) {
      selected.value = new Set()
      comment.value = ''
    }
  },
)

function toggle(r: string) {
  const next = new Set(selected.value)
  if (next.has(r)) next.delete(r)
  else next.add(r)
  selected.value = next
}

function submit() {
  emit('submit', { reasons: [...selected.value], comment: comment.value.trim() })
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ac-fbd__overlay" role="presentation" @click.self="emit('close')">
      <div ref="dialogRef" class="ac-fbd" role="dialog" aria-modal="true" :aria-label="title">
        <header class="ac-fbd__head">
          <h3 class="ac-fbd__title">{{ title }}</h3>
          <button type="button" class="ac-fbd__close" aria-label="关闭" @click="emit('close')">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="ac-fbd__reasons" role="group" aria-label="反馈原因">
          <button
            v-for="r in reasons"
            :key="r"
            type="button"
            class="ac-fbd__reason"
            :class="{ 'ac-fbd__reason--on': selected.has(r) }"
            :aria-pressed="selected.has(r)"
            @click="toggle(r)"
          >
            {{ r }}
          </button>
        </div>

        <textarea
          v-if="showComment"
          v-model="comment"
          class="ac-fbd__comment"
          rows="3"
          :placeholder="labels.commentPlaceholder ?? '补充说明（可选）…'"
          aria-label="补充说明"
        />

        <footer class="ac-fbd__foot">
          <button type="button" class="ac-fbd__btn" @click="emit('close')">{{ labels.cancel ?? '取消' }}</button>
          <button
            type="button"
            class="ac-fbd__btn ac-fbd__btn--primary"
            :disabled="selected.size === 0 && !comment.trim()"
            @click="submit"
          >
            {{ labels.submit ?? '提交反馈' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ac-fbd__overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}
.ac-fbd {
  width: 100%;
  max-width: 420px;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--ac-font-sans, inherit);
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.2);
}
.ac-fbd__head { display: flex; align-items: center; justify-content: space-between; }
.ac-fbd__title { margin: 0; font-size: 0.95rem; color: var(--ac-fg); }
.ac-fbd__close { border: none; background: transparent; color: var(--ac-muted); cursor: pointer; padding: 4px; display: flex; }
.ac-fbd__close:hover { color: var(--ac-fg); }
.ac-fbd__reasons { display: flex; flex-wrap: wrap; gap: 6px; }
.ac-fbd__reason {
  padding: 4px 12px;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.78rem;
  cursor: pointer;
}
.ac-fbd__reason--on { background: var(--ac-primary); border-color: var(--ac-primary); color: var(--ac-primary-fg); }
.ac-fbd__comment {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-surface);
  color: var(--ac-fg);
  font-size: 0.84rem;
  font-family: inherit;
  resize: vertical;
}
.ac-fbd__comment:focus { outline: 2px solid var(--ac-primary); outline-offset: -1px; }
.ac-fbd__foot { display: flex; justify-content: flex-end; gap: 8px; }
.ac-fbd__btn {
  padding: 6px 16px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.82rem;
  cursor: pointer;
}
.ac-fbd__btn--primary { background: var(--ac-primary); border-color: var(--ac-primary); color: var(--ac-primary-fg); }
.ac-fbd__btn:disabled { opacity: 0.5; cursor: default; }
</style>
