<template>
  <div class="ac-card ac-tl" role="group" :aria-label="payload.title || t('gencard.timelineRegion')">
    <div v-if="payload.title" class="ac-tl__title">{{ payload.title }}</div>
    <ol class="ac-tl__list">
      <li v-for="(ev, i) in data.events ?? []" :key="i" class="ac-tl__event" :data-tone="ev.tone ?? 'info'">
        <time class="ac-tl__time">{{ ev.time }}</time>
        <div class="ac-tl__body">
          <strong>{{ ev.title }}</strong>
          <p v-if="ev.description">{{ ev.description }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
/** timeline_events 载荷 → 垂直事件时间线 */
import { computed } from 'vue'
import { useI18n } from '../../i18n'
import type { StructuredPayload, TimelineEventsPayload } from '../../types'

const { t } = useI18n()

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed(() => (props.payload.data ?? {}) as TimelineEventsPayload)
</script>

<style scoped>
.ac-tl { padding: 12px 14px; }
.ac-tl__title { font-weight: 600; font-size: 0.88em; margin-bottom: 10px; }
.ac-tl__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.ac-tl__event {
  display: flex;
  gap: 12px;
  position: relative;
  padding: 0 0 14px 18px;
  font-size: 0.84rem;
}
.ac-tl__event:last-child { padding-bottom: 0; }
.ac-tl__event::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ac-primary);
  z-index: 1;
}
.ac-tl__event::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 14px;
  bottom: 0;
  width: 1px;
  background: var(--ac-border);
}
.ac-tl__event:last-child::after { display: none; }
.ac-tl__event[data-tone='success']::before { background: var(--ac-success); }
.ac-tl__event[data-tone='warning']::before { background: var(--ac-warning); }
.ac-tl__event[data-tone='danger']::before { background: var(--ac-danger); }
.ac-tl__time { color: var(--ac-muted); font-size: 0.76rem; flex-shrink: 0; width: 84px; padding-top: 1px; }
.ac-tl__body { min-width: 0; }
.ac-tl__body p { margin: 2px 0 0; color: var(--ac-muted); }
</style>
