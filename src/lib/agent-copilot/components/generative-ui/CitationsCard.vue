<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../i18n'
import type { CitationsPayload, StructuredPayload } from '../../types'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<CitationsPayload>(() => (props.payload.data ?? { items: [] }) as CitationsPayload)
const title = computed(() => props.payload.title)

const { t } = useI18n()
</script>

<template>
  <div class="ac-citations-card" role="group" :aria-label="title || t('gencard.citations')">
    <div class="ac-citations-card__title">{{ title || t('gencard.citations') }}</div>
    <ol class="ac-citations-card__list">
      <li v-for="(item, i) in data.items" :key="i" class="ac-citations-card__item">
        <div class="ac-citations-card__head">
          <span class="ac-citations-card__index">{{ i + 1 }}</span>
          <a
            v-if="item.url"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="ac-citations-card__link"
          >{{ item.title }}</a>
          <span v-else class="ac-citations-card__name">{{ item.title }}</span>
          <span v-if="item.score !== undefined" class="ac-citations-card__score">
            {{ Math.round(item.score * 100) }}%
          </span>
        </div>
        <p v-if="item.snippet" class="ac-citations-card__snippet">{{ item.snippet }}</p>
        <span v-if="item.source" class="ac-citations-card__source">{{ item.source }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.ac-citations-card {
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  overflow: hidden;
  background: var(--ac-surface);
}
.ac-citations-card__title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-fg);
  border-bottom: 1px solid var(--ac-border);
}
.ac-citations-card__list {
  margin: 0;
  padding: 4px 0;
  list-style: none;
}
.ac-citations-card__item {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ac-citations-card__item + .ac-citations-card__item {
  border-top: 1px solid var(--ac-border);
}
.ac-citations-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ac-citations-card__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ac-primary-soft, rgba(37, 99, 235, 0.1));
  color: var(--ac-primary);
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.ac-citations-card__link {
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-primary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-citations-card__link:hover {
  text-decoration: underline;
}
.ac-citations-card__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-fg);
}
.ac-citations-card__score {
  margin-left: auto;
  font-size: 10px;
  color: var(--ac-muted);
  flex-shrink: 0;
}
.ac-citations-card__snippet {
  margin: 0;
  padding-left: 26px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--ac-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ac-citations-card__source {
  padding-left: 26px;
  font-size: 10px;
  color: var(--ac-muted);
}
</style>
