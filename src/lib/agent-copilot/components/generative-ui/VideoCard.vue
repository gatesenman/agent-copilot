<script setup lang="ts">
defineOptions({ name: 'VideoCard' })

/**
 * VideoCard — 视频播放卡（payload type: 'video'）
 *
 * 场景：Agent 生成/检索的视频内容展示（对标 Gemini 视频回复卡）。
 * 原生 video 控件 + 海报帧 + 标题/说明 + 下载。
 */
import { computed } from 'vue'
import type { StructuredPayload, VideoPayload } from '../../types'
import { useI18n } from '../../i18n'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<VideoPayload>(() => (props.payload.data ?? { src: '' }) as VideoPayload)
const title = computed(() => props.payload.title)

const { t } = useI18n()
</script>

<template>
  <div class="ac-video">
    <div v-if="title" class="ac-video__head">
      <span class="ac-video__title">{{ title }}</span>
      <a
        v-if="data.src"
        class="ac-video__dl"
        :href="data.src"
        download
        :aria-label="t('media.download')"
        :title="t('media.download')"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 2v8m0 0 3-3M8 10 5 7M3 13h10" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </a>
    </div>
    <!-- 用户提供的媒体源，无字幕轨可用 -->
    <!-- eslint-disable-next-line vuejs-accessibility/media-has-caption -->
    <video
      class="ac-video__player"
      :src="data.src"
      :poster="data.poster"
      controls
      preload="metadata"
      :aria-label="title ?? t('media.video')"
    />
    <div v-if="data.caption" class="ac-video__caption">{{ data.caption }}</div>
  </div>
</template>

<style scoped>
.ac-video {
  border: 1px solid var(--ac-border, #e5e7eb);
  border-radius: var(--ac-radius, 10px);
  background: var(--ac-surface, #fff);
  overflow: hidden;
  max-width: 520px;
}
.ac-video__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
}
.ac-video__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-text, #111827);
}
.ac-video__dl {
  display: flex;
  align-items: center;
  color: var(--ac-text-muted, #6b7280);
}
.ac-video__dl:hover { color: var(--ac-text, #111827); }
.ac-video__player {
  display: block;
  width: 100%;
  max-height: 320px;
  background: #000;
}
.ac-video__caption {
  padding: 8px 12px;
  font-size: 11px;
  color: var(--ac-text-muted, #6b7280);
}
</style>
