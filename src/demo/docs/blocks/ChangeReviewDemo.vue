<script setup lang="ts">
import { ref } from 'vue'
import { ChangeReviewPanel } from '../../../lib/agent-copilot'
import type { FileChange } from '../../../lib/agent-copilot'
import DocDemo from '../DocDemo.vue'

const initial = (): FileChange[] => [
  {
    id: 'c1',
    path: 'src/lib/validators.ts',
    kind: 'create',
    language: 'typescript',
    additions: 12,
    deletions: 0,
    status: 'pending',
    diff: `@@ -0,0 +1,8 @@
+export function validateEmail(v: string): string | null {
+  if (!v.trim()) return '邮箱不能为空'
+  return null
+}
+
+export function validatePassword(v: string): string | null {
+  if (v.length < 8) return '密码至少 8 位'
+  return null
+}`,
  },
  {
    id: 'c2',
    path: 'src/components/LoginForm.tsx',
    kind: 'modify',
    language: 'tsx',
    additions: 6,
    deletions: 1,
    status: 'pending',
    diff: `@@ -12,4 +12,9 @@
   const [email, setEmail] = useState('')
-  const [password, setPassword] = useState('')
+  const [password, setPassword] = useState('')
+  const [error, setError] = useState<string | null>(null)
+
+  const emailErr = validateEmail(email)
+  if (emailErr) setError(emailErr)`,
  },
]

const changes = ref<FileChange[]>(initial())

function onReview(id: string | 'all', decision: 'accepted' | 'rejected') {
  changes.value = changes.value.map((c) =>
    id === 'all' ? (c.status === 'pending' ? { ...c, status: decision } : c)
    : c.id === id ? { ...c, status: decision } : c,
  )
}
</script>

<template>
  <DocDemo
    title="ChangeReviewPanel 变更审查"
    description="展示 Agent 产出的文件变更 diff，支持逐条或全部接受/拒绝（FILE_CHANGE 事件驱动）。"
    component-name="ChangeReviewPanel"
    usage="confirm_edits 模式的审查界面：Agent 每产出一个文件变更（FILE_CHANGE 事件）就在此累积，用户可展开 diff 逐条接受/拒绝，或一键处理全部 pending。宿主在 @review 回调里把决定回传给后端执行。"
    :props-table="[
      { name: 'changes', type: 'FileChange[]', description: '变更数组：{ id, path, kind: create|modify|delete|rename, diff?, additions, deletions, status }' },
      { name: 'readonly', type: 'boolean', default: 'false', description: '只读展示（历史回放）' },
      { name: 'labels', type: 'Partial<ChangeReviewLabels>', description: '接受/拒绝按钮等文案覆盖' },
      { name: '@review', type: `(id: string | 'all', decision: 'accepted' | 'rejected') => void`, description: '审查决定（id=all 表示批量）' },
    ]"
    :controls="[
      { name: 'readonly', label: '只读', type: 'boolean', default: false },
    ]"
  >
    <template #default="{ values }">
      <div class="ac-root" style="max-width: 560px; display: flex; flex-direction: column; gap: 8px;">
        <ChangeReviewPanel
          :changes="changes"
          :readonly="!!values.readonly"
          @review="onReview"
        />
        <button
          type="button"
          style="align-self: flex-start; padding: 4px 12px; border: 1px solid var(--ac-border, #e2e8f0); border-radius: 7px; background: var(--ac-surface, #fff); font-size: 12px; cursor: pointer;"
          @click="changes = initial()"
        >
          重置演示
        </button>
      </div>
    </template>
  </DocDemo>
</template>
