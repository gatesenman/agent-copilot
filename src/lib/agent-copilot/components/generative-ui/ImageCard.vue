<script setup lang="ts">
import { computed } from 'vue'
import type { ImagePayload, StructuredPayload } from '../../types'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<ImagePayload>(() => (props.payload.data ?? { src: '' }) as ImagePayload)
const title = computed(() => props.payload.title)

const alt = computed(() => data.value.alt ?? data.value.caption ?? title.value ?? '生成图像')
</script>

<template>
  <div class="ac-image-card">
    <div v-if="title" class="ac-image-card__title">{{ title }}</div>
    <img
      :src="data.src"
      :alt="alt"
      :width="data.width"
      :height="data.height"
      class="ac-image-card__img"
      loading="lazy"
    />
    <div v-if="data.caption || data.prompt" class="ac-image-card__meta">
      <p v-if="data.caption" class="ac-image-card__caption">{{ data.caption }}</p>
      <p v-if="data.prompt" class="ac-image-card__prompt">
        <span class="ac-image-card__prompt-label">Prompt</span>{{ data.prompt }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.ac-image-card {
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  overflow: hidden;
  background: var(--ac-surface);
}
.ac-image-card__title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-fg);
  border-bottom: 1px solid var(--ac-border);
}
.ac-image-card__img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 360px;
  object-fit: contain;
  background: var(--ac-bg);
}
.ac-image-card__meta {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--ac-border);
}
.ac-image-card__caption {
  margin: 0;
  font-size: 12px;
  color: var(--ac-fg);
}
.ac-image-card__prompt {
  margin: 0;
  font-size: 11px;
  color: var(--ac-muted);
  line-height: 1.5;
}
.ac-image-card__prompt-label {
  display: inline-block;
  margin-right: 6px;
  padding: 0 5px;
  border: 1px solid var(--ac-border);
  border-radius: 4px;
  font-size: 10px;
  color: var(--ac-muted);
}
</style>
