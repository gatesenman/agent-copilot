<script setup lang="ts">
defineOptions({ name: 'FeedbackDialog' })

/**
 * FeedbackDialog —— 结构化反馈弹窗
 * 点踩后收集细化原因（企业质量回流）：分类多选 + 自由文本。
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from '../../i18n'
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
    reasons: undefined,
    title: undefined,
    labels: () => ({}),
    showComment: true,
  },
)

const { t } = useI18n()

const titleText = computed(() => props.title ?? t('feedback.title'))
const reasonList = computed(
  () =>
    props.reasons ?? [
      t('feedback.reasonInaccurate'),
      t('feedback.reasonIrrelevant'),
      t('feedback.reasonOutdated'),
      t('feedback.reasonFormat'),
      t('feedback.reasonIncomplete'),
      t('feedback.reasonUnsafe'),
    ],
)

const emit = defineEmits<{
  /** 用户提交反馈（选中原因 + 自由文本）；提交后自动关闭 */
  (e: 'submit', data: { reasons: string[]; comment: string }): void
  /** 关闭请求（v-model:open）：点击遮罩/关闭/取消按钮、Escape、提交后触发 */
  (e: 'update:open', open: boolean): void
}>()

const selected = ref<Set<string>>(new Set())
const comment = ref('')
const dialogRef = ref<HTMLElement | null>(null)

/** 统一关闭出口（v-model:open 协议） */
function close() {
  emit('update:open', false)
}

// 焦点圈定 + Escape 关闭 + 关闭后焦点还原
useFocusTrap(dialogRef, {
  active: () => props.open,
  onEscape: close,
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
  close()
}

defineExpose({
  /** 程序化关闭对话框 */
  close,
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ac-fbd__overlay" role="presentation" @click.self="close()">
      <div ref="dialogRef" class="ac-fbd" role="dialog" aria-modal="true" :aria-label="titleText">
        <header class="ac-fbd__head">
          <h3 class="ac-fbd__title">{{ titleText }}</h3>
          <button type="button" class="ac-fbd__close" :aria-label="t('common.close')" @click="close()">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="ac-fbd__reasons" role="group" :aria-label="t('feedback.reasonsAria')">
          <button
            v-for="r in reasonList"
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
          :placeholder="labels.commentPlaceholder ?? t('feedback.commentPlaceholder')"
          :aria-label="t('feedback.commentAria')"
        />

        <footer class="ac-fbd__foot">
          <button type="button" class="ac-fbd__btn" @click="close()">{{ labels.cancel ?? t('common.cancel') }}</button>
          <button
            type="button"
            class="ac-fbd__btn ac-fbd__btn--primary"
            :disabled="selected.size === 0 && !comment.trim()"
            @click="submit"
          >
            {{ labels.submit ?? t('feedback.submit') }}
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
