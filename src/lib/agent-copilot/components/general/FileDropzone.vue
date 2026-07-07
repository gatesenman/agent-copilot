<script setup lang="ts">
/**
 * FileDropzone —— 文件拖拽上传
 * 支持拖入/点击选择、类型与大小校验、上传进度展示（进度由外部驱动）。
 */
import { computed, ref } from 'vue'

export interface UploadingFile {
  id: string
  name: string
  size: number
  /** 0-100；100 表示完成 */
  progress: number
  error?: string
}

const props = withDefaults(
  defineProps<{
    /** 已选文件（含进度），由外部管理 */
    files?: UploadingFile[]
    /** accept 属性（如 ".pdf,.docx,image/*"） */
    accept?: string
    /** 单文件大小上限（MB） */
    maxSizeMb?: number
    /** 最多文件数 */
    maxFiles?: number
    disabled?: boolean
    /** 文案覆盖 */
    labels?: { dropHint?: string; clickPick?: string }
  }>(),
  { files: () => [], maxSizeMb: 20, maxFiles: 10, labels: () => ({}) },
)

const emit = defineEmits<{
  (e: 'add', files: File[]): void
  (e: 'remove', id: string): void
  (e: 'reject', reason: string): void
}>()

const dragging = ref(false)
const inputRef = ref<HTMLInputElement>()

const canAdd = computed(() => !props.disabled && props.files.length < props.maxFiles)

function pick(list: FileList | null) {
  if (!list || !canAdd.value) return
  const ok: File[] = []
  for (const f of Array.from(list)) {
    if (props.files.length + ok.length >= props.maxFiles) {
      emit('reject', `最多上传 ${props.maxFiles} 个文件`)
      break
    }
    if (f.size > props.maxSizeMb * 1024 * 1024) {
      emit('reject', `「${f.name}」超过 ${props.maxSizeMb}MB 上限`)
      continue
    }
    ok.push(f)
  }
  if (ok.length) emit('add', ok)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  pick(e.dataTransfer?.files ?? null)
}

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.ceil(bytes / 1024)}KB`
}
</script>

<template>
  <div class="ac-drop">
    <div
      class="ac-drop__zone"
      :class="{ 'ac-drop__zone--drag': dragging, 'ac-drop__zone--disabled': !canAdd }"
      role="button"
      tabindex="0"
      aria-label="拖拽或点击上传文件"
      @click="canAdd && inputRef?.click()"
      @keydown.enter="canAdd && inputRef?.click()"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M12 16V4m0 0 4 4m-4-4L8 8" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke-linecap="round" />
      </svg>
      <p class="ac-drop__hint">{{ labels.dropHint ?? '拖拽文件到此处，或' }}<span class="ac-drop__link">{{ labels.clickPick ?? '点击选择' }}</span></p>
      <p class="ac-drop__sub">单个文件不超过 {{ maxSizeMb }}MB，最多 {{ maxFiles }} 个</p>
      <input ref="inputRef" type="file" class="ac-drop__input" multiple :accept="accept" :disabled="!canAdd" @change="pick(($event.target as HTMLInputElement).files); ($event.target as HTMLInputElement).value = ''" />
    </div>

    <ul v-if="files.length" class="ac-drop__list" aria-label="上传文件列表">
      <li v-for="f in files" :key="f.id" class="ac-drop__file">
        <svg class="ac-drop__file-icon" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
          <path d="M4 1.5h5L13 5.5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" stroke-linejoin="round" />
          <path d="M9 1.5v4h4" stroke-linejoin="round" />
        </svg>
        <div class="ac-drop__file-main">
          <div class="ac-drop__file-row">
            <span class="ac-drop__file-name">{{ f.name }}</span>
            <span class="ac-drop__file-size">{{ fmtSize(f.size) }}</span>
          </div>
          <div v-if="f.error" class="ac-drop__file-err" role="alert">{{ f.error }}</div>
          <div v-else-if="f.progress < 100" class="ac-drop__file-bar" role="progressbar" :aria-valuenow="f.progress" aria-valuemin="0" aria-valuemax="100">
            <div class="ac-drop__file-fill" :style="{ width: `${f.progress}%` }" />
          </div>
        </div>
        <span v-if="f.progress >= 100 && !f.error" class="ac-drop__done" aria-label="上传完成">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="var(--ac-success)" stroke-width="1.8" aria-hidden="true"><path d="m3 8.5 3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
        <button type="button" class="ac-drop__rm" :aria-label="`移除 ${f.name}`" @click="emit('remove', f.id)">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" /></svg>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ac-drop { display: flex; flex-direction: column; gap: 8px; font-family: var(--ac-font-sans, inherit); }
.ac-drop__zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 22px 16px;
  border: 1.5px dashed var(--ac-border);
  border-radius: var(--ac-radius);
  color: var(--ac-muted);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}
.ac-drop__zone--drag { border-color: var(--ac-primary); background: color-mix(in srgb, var(--ac-primary) 5%, var(--ac-bg)); }
.ac-drop__zone--disabled { opacity: 0.55; cursor: not-allowed; }
.ac-drop__zone:hover:not(.ac-drop__zone--disabled) { border-color: var(--ac-primary); }
.ac-drop__hint { margin: 0; font-size: 0.84rem; color: var(--ac-fg); }
.ac-drop__link { color: var(--ac-primary); margin-left: 2px; }
.ac-drop__sub { margin: 0; font-size: 0.72rem; }
.ac-drop__input { display: none; }
.ac-drop__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.ac-drop__file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-surface);
}
.ac-drop__file-icon { color: var(--ac-muted); flex-shrink: 0; }
.ac-drop__file-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ac-drop__file-row { display: flex; align-items: baseline; gap: 8px; }
.ac-drop__file-name { font-size: 0.8rem; color: var(--ac-fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-drop__file-size { font-size: 0.7rem; color: var(--ac-muted); flex-shrink: 0; }
.ac-drop__file-err { font-size: 0.72rem; color: var(--ac-danger); }
.ac-drop__file-bar { height: 3px; border-radius: 999px; background: var(--ac-border); overflow: hidden; }
.ac-drop__file-fill { height: 100%; background: var(--ac-primary); border-radius: 999px; transition: width 0.2s; }
.ac-drop__done { display: flex; flex-shrink: 0; }
.ac-drop__rm { border: none; background: transparent; color: var(--ac-muted); cursor: pointer; padding: 3px; display: flex; flex-shrink: 0; }
.ac-drop__rm:hover { color: var(--ac-danger); }
</style>
