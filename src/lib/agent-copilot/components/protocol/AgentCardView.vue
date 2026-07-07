<script setup lang="ts">
/**
 * AgentCardView — A2A Agent Card 展示组件
 *
 * A2A 协议规定每个 Agent 在 /.well-known/agent-card.json 发布能力清单。
 * 本组件渲染该清单：名称/描述/技能/输入输出模态/能力开关，
 * 可用于「Agent 目录 / 服务注册中心」类企业界面。
 */
import { computed } from 'vue'

export interface A2AAgentCard {
  name: string
  description?: string
  url?: string
  version?: string
  provider?: { organization?: string; url?: string }
  capabilities?: { streaming?: boolean; pushNotifications?: boolean; stateTransitionHistory?: boolean }
  defaultInputModes?: string[]
  defaultOutputModes?: string[]
  skills?: { id: string; name: string; description?: string; tags?: string[]; examples?: string[] }[]
}

const props = defineProps<{
  card: A2AAgentCard
  /** 连接状态（可选，显示状态点） */
  status?: 'online' | 'offline' | 'unknown'
}>()

const capabilityList = computed(() => {
  const caps = props.card.capabilities ?? {}
  return [
    { label: '流式输出', on: !!caps.streaming },
    { label: '推送通知', on: !!caps.pushNotifications },
    { label: '状态历史', on: !!caps.stateTransitionHistory },
  ]
})
</script>

<template>
  <div class="ac-card ac-agent-card">
    <header class="ac-agent-card__head">
      <div class="ac-agent-card__avatar" aria-hidden="true">{{ card.name.slice(0, 1).toUpperCase() }}</div>
      <div class="ac-agent-card__title-wrap">
        <div class="ac-agent-card__title-row">
          <h3 class="ac-agent-card__name">{{ card.name }}</h3>
          <span
            v-if="status"
            class="ac-agent-card__dot"
            :class="`ac-agent-card__dot--${status}`"
            :title="status === 'online' ? '在线' : status === 'offline' ? '离线' : '未知'"
          />
        </div>
        <p v-if="card.provider?.organization || card.version" class="ac-agent-card__meta">
          <span v-if="card.provider?.organization">{{ card.provider.organization }}</span>
          <span v-if="card.version">v{{ card.version }}</span>
        </p>
      </div>
      <span class="ac-badge">A2A</span>
    </header>

    <p v-if="card.description" class="ac-agent-card__desc">{{ card.description }}</p>

    <div class="ac-agent-card__caps" role="list" aria-label="Agent 能力">
      <span
        v-for="c in capabilityList"
        :key="c.label"
        role="listitem"
        class="ac-agent-card__cap"
        :class="{ 'ac-agent-card__cap--on': c.on }"
      >{{ c.label }}</span>
    </div>

    <div v-if="card.skills?.length" class="ac-agent-card__skills">
      <div v-for="s in card.skills" :key="s.id" class="ac-agent-card__skill">
        <div class="ac-agent-card__skill-name">{{ s.name }}</div>
        <div v-if="s.description" class="ac-agent-card__skill-desc">{{ s.description }}</div>
        <div v-if="s.tags?.length" class="ac-agent-card__tags">
          <span v-for="t in s.tags" :key="t" class="ac-agent-card__tag">{{ t }}</span>
        </div>
      </div>
    </div>

    <footer v-if="card.defaultInputModes?.length || card.defaultOutputModes?.length" class="ac-agent-card__io">
      <span v-if="card.defaultInputModes?.length">输入：{{ card.defaultInputModes.join(', ') }}</span>
      <span v-if="card.defaultOutputModes?.length">输出：{{ card.defaultOutputModes.join(', ') }}</span>
    </footer>
  </div>
</template>

<style scoped>
.ac-agent-card { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.ac-agent-card__head { display: flex; align-items: flex-start; gap: 10px; }
.ac-agent-card__avatar {
  width: 38px; height: 38px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px; background: var(--ac-primary); color: var(--ac-primary-fg);
  font-weight: 700; font-size: 1rem;
}
.ac-agent-card__title-wrap { flex: 1; min-width: 0; }
.ac-agent-card__title-row { display: flex; align-items: center; gap: 6px; }
.ac-agent-card__name { margin: 0; font-size: 0.95rem; font-weight: 700; }
.ac-agent-card__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ac-muted); }
.ac-agent-card__dot--online { background: var(--ac-success); }
.ac-agent-card__dot--offline { background: var(--ac-danger); }
.ac-agent-card__meta { margin: 2px 0 0; font-size: 0.76rem; color: var(--ac-muted); display: flex; gap: 8px; }
.ac-agent-card__desc { margin: 0; font-size: 0.84rem; color: var(--ac-fg); line-height: 1.5; }
.ac-agent-card__caps { display: flex; flex-wrap: wrap; gap: 6px; }
.ac-agent-card__cap {
  font-size: 0.72rem; padding: 2px 8px; border-radius: 999px;
  border: 1px solid var(--ac-border); color: var(--ac-muted);
  text-decoration: line-through;
}
.ac-agent-card__cap--on {
  color: var(--ac-success); border-color: var(--ac-success);
  text-decoration: none;
  background: color-mix(in srgb, var(--ac-success) 8%, transparent);
}
.ac-agent-card__skills { display: flex; flex-direction: column; gap: 8px; }
.ac-agent-card__skill {
  padding: 8px 10px; border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.7); background: var(--ac-surface);
}
.ac-agent-card__skill-name { font-weight: 600; font-size: 0.82rem; }
.ac-agent-card__skill-desc { font-size: 0.78rem; color: var(--ac-muted); margin-top: 2px; line-height: 1.45; }
.ac-agent-card__tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.ac-agent-card__tag {
  font-size: 0.7rem; padding: 1px 7px; border-radius: 999px;
  background: var(--ac-bg); border: 1px solid var(--ac-border); color: var(--ac-muted);
}
.ac-agent-card__io {
  display: flex; gap: 14px; font-size: 0.74rem; color: var(--ac-muted);
  padding-top: 8px; border-top: 1px solid var(--ac-border);
}
</style>
