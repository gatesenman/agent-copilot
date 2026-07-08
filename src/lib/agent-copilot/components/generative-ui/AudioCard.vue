<script setup lang="ts">
/**
 * AudioCard — 音频/语音消息播放卡（payload type: 'audio'）
 *
 * 场景：语音消息气泡、TTS 回复、播客片段（对标 ChatGPT 语音消息 UI）。
 * 特性：播放/暂停、伪波形进度条（点击跳转）、时长、倍速切换、转写文本折叠、下载。
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import type { AudioPayload, StructuredPayload } from '../../types'
import { useI18n } from '../../i18n'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<AudioPayload>(() => (props.payload.data ?? { src: '' }) as AudioPayload)
const title = computed(() => props.payload.title)

const { t } = useI18n()

const audioRef = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(data.value.duration ?? 0)
const rate = ref(1)
const showTranscript = ref(false)

const RATES = [1, 1.5, 2]

/** 伪波形：由 src 字符串确定性生成，保证同一音频形状稳定 */
const bars = computed(() => {
  const src = data.value.src || 'audio'
  const out: number[] = []
  let h = 0
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0
  for (let i = 0; i < 36; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    out.push(0.25 + (h % 1000) / 1350)
  }
  return out
})

const progress = computed(() => (duration.value > 0 ? currentTime.value / duration.value : 0))

function toggle() {
  const el = audioRef.value
  if (!el) return
  if (playing.value) el.pause()
  else void el.play()
}

function onTime() {
  const el = audioRef.value
  if (!el) return
  currentTime.value = el.currentTime
  if (el.duration && Number.isFinite(el.duration)) duration.value = el.duration
}

function seek(e: MouseEvent) {
  const el = audioRef.value
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  if (!el || !duration.value) return
  const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
  el.currentTime = ratio * duration.value
}

function cycleRate() {
  const idx = RATES.indexOf(rate.value)
  rate.value = RATES[(idx + 1) % RATES.length]
  if (audioRef.value) audioRef.value.playbackRate = rate.value
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${String(ss).padStart(2, '0')}`
}

onBeforeUnmount(() => audioRef.value?.pause())
</script>

<template>
  <div class="ac-audio">
    <audio
      ref="audioRef"
      :src="data.src"
      preload="metadata"
      @play="playing = true"
      @pause="playing = false"
      @ended="playing = false; currentTime = 0"
      @timeupdate="onTime"
      @loadedmetadata="onTime"
    />
    <div v-if="title" class="ac-audio__title">{{ title }}</div>
    <div class="ac-audio__row">
      <button
        type="button"
        class="ac-audio__play"
        :aria-label="playing ? t('media.pause') : t('media.play')"
        @click="toggle"
      >
        <svg v-if="!playing" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5-9-5.5Z" /></svg>
        <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z" /></svg>
      </button>

      <div
        class="ac-audio__wave"
        role="slider"
        :aria-label="t('media.audioMessage')"
        :aria-valuemin="0"
        :aria-valuemax="Math.round(duration)"
        :aria-valuenow="Math.round(currentTime)"
        tabindex="0"
        @click="seek"
      >
        <span
          v-for="(b, i) in bars"
          :key="i"
          class="ac-audio__bar"
          :class="{ 'ac-audio__bar--past': i / bars.length <= progress }"
          :style="{ height: `${Math.round(b * 100)}%` }"
        />
      </div>

      <span class="ac-audio__time">{{ fmt(currentTime) }} / {{ fmt(duration) }}</span>

      <button type="button" class="ac-audio__rate" :aria-label="t('media.rateAria')" @click="cycleRate">
        {{ rate }}x
      </button>

      <a
        v-if="data.src"
        class="ac-audio__dl"
        :href="data.src"
        download
        :aria-label="t('media.download')"
        :title="t('media.download')"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 2v8m0 0 3-3M8 10 5 7M3 13h10" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </a>
    </div>

    <div v-if="data.transcript" class="ac-audio__tr">
      <button type="button" class="ac-audio__tr-toggle" @click="showTranscript = !showTranscript">
        {{ showTranscript ? t('media.transcriptHide') : t('media.transcript') }}
      </button>
      <p v-if="showTranscript" class="ac-audio__tr-text">{{ data.transcript }}</p>
    </div>
    <div v-if="data.caption" class="ac-audio__caption">{{ data.caption }}</div>
  </div>
</template>

<style scoped>
.ac-audio {
  border: 1px solid var(--ac-border, #e5e7eb);
  border-radius: var(--ac-radius, 10px);
  background: var(--ac-surface, #fff);
  padding: 10px 12px;
  max-width: 420px;
}
.ac-audio__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-text, #111827);
  margin-bottom: 8px;
}
.ac-audio__row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ac-audio__play {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--ac-primary, #2563eb);
  color: var(--ac-primary-fg, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ac-audio__play:hover { opacity: 0.9; }
.ac-audio__wave {
  flex: 1;
  height: 28px;
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
}
.ac-audio__bar {
  flex: 1;
  min-width: 2px;
  border-radius: 2px;
  background: var(--ac-border, #d1d5db);
  transition: background 0.15s;
}
.ac-audio__bar--past { background: var(--ac-primary, #2563eb); }
.ac-audio__time {
  flex: none;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--ac-text-muted, #6b7280);
}
.ac-audio__rate {
  flex: none;
  border: 1px solid var(--ac-border, #e5e7eb);
  background: transparent;
  color: var(--ac-text-muted, #6b7280);
  border-radius: 6px;
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
}
.ac-audio__rate:hover { color: var(--ac-text, #111827); }
.ac-audio__dl {
  flex: none;
  display: flex;
  align-items: center;
  color: var(--ac-text-muted, #6b7280);
}
.ac-audio__dl:hover { color: var(--ac-text, #111827); }
.ac-audio__tr { margin-top: 8px; }
.ac-audio__tr-toggle {
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  color: var(--ac-primary, #2563eb);
  cursor: pointer;
}
.ac-audio__tr-text {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ac-text-muted, #4b5563);
  background: var(--ac-surface-2, #f9fafb);
  border-radius: 8px;
  padding: 8px 10px;
}
.ac-audio__caption {
  margin-top: 6px;
  font-size: 11px;
  color: var(--ac-text-muted, #6b7280);
}
</style>
