<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../i18n'
import type { PlanPayload, StructuredPayload } from '../../types'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<PlanPayload>(() => (props.payload.data ?? { steps: [] }) as PlanPayload)
const title = computed(() => props.payload.title)

const { t } = useI18n()

const STATUS_LABEL = computed<Record<string, string>>(() => ({
  todo: t('planCard.todo'),
  doing: t('planCard.doing'),
  done: t('planCard.done'),
  skipped: t('planCard.skipped'),
}))
</script>

<template>
  <div class="ac-plan-card">
    <div v-if="title" class="ac-plan-card__title">{{ title }}</div>
    <ol class="ac-plan-card__steps">
      <li
        v-for="(step, i) in data.steps"
        :key="i"
        class="ac-plan-card__step"
        :data-status="step.status ?? 'todo'"
      >
        <span class="ac-plan-card__marker" aria-hidden="true">
          <template v-if="step.status === 'done'">&#10003;</template>
          <template v-else>{{ i + 1 }}</template>
        </span>
        <div class="ac-plan-card__body">
          <div class="ac-plan-card__head">
            <span class="ac-plan-card__step-title">{{ step.title }}</span>
            <span class="ac-plan-card__badge">{{ STATUS_LABEL[step.status ?? 'todo'] }}</span>
          </div>
          <p v-if="step.description" class="ac-plan-card__desc">{{ step.description }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.ac-plan-card {
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  overflow: hidden;
  background: var(--ac-surface);
}
.ac-plan-card__title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-fg);
  border-bottom: 1px solid var(--ac-border);
}
.ac-plan-card__steps {
  margin: 0;
  padding: 8px 12px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ac-plan-card__step {
  position: relative;
  display: flex;
  gap: 10px;
  padding-bottom: 12px;
}
.ac-plan-card__step:last-child {
  padding-bottom: 0;
}
/* 连接线 */
.ac-plan-card__step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 20px;
  bottom: 0;
  width: 1.5px;
  background: var(--ac-border);
}
.ac-plan-card__marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  border: 1.5px solid var(--ac-border);
  background: var(--ac-surface);
  color: var(--ac-muted);
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  z-index: 1;
}
.ac-plan-card__step[data-status='done'] .ac-plan-card__marker {
  background: var(--ac-success, #16a34a);
  border-color: var(--ac-success, #16a34a);
  color: #fff;
}
.ac-plan-card__step[data-status='doing'] .ac-plan-card__marker {
  border-color: var(--ac-primary);
  color: var(--ac-primary);
}
.ac-plan-card__step[data-status='skipped'] .ac-plan-card__marker {
  opacity: 0.5;
}
.ac-plan-card__body {
  flex: 1;
  min-width: 0;
}
.ac-plan-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ac-plan-card__step-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-fg);
}
.ac-plan-card__step[data-status='skipped'] .ac-plan-card__step-title {
  text-decoration: line-through;
  opacity: 0.6;
}
.ac-plan-card__badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid var(--ac-border);
  color: var(--ac-muted);
  flex-shrink: 0;
}
.ac-plan-card__step[data-status='doing'] .ac-plan-card__badge {
  border-color: var(--ac-primary);
  color: var(--ac-primary);
}
.ac-plan-card__step[data-status='done'] .ac-plan-card__badge {
  border-color: var(--ac-success, #16a34a);
  color: var(--ac-success, #16a34a);
}
.ac-plan-card__desc {
  margin: 3px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--ac-muted);
}
</style>
