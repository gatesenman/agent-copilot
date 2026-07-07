<script setup lang="ts">
/**
 * WorkspaceSeeder —— Agentic 工作台示意的数据种子。
 * 在 CopilotProvider 内挂载后向 store 注入静态演示状态
 * （计划 / 任务 / 变更 / 终端 / 一条带思考块的消息），
 * 不发起任何模型调用，用于纯示意展示。渲染为空。
 */
import { onMounted } from 'vue'
import { useCopilot } from '../../lib/agent-copilot/composables/useCopilot'

const store = useCopilot()

onMounted(() => {
  if (store.messages.value.length > 0) return // 避免热更新重复注入

  store.messages.value.push(
    {
      id: 'seed_u1',
      role: 'user',
      content: '给登录表单添加校验和错误处理，并跑一遍测试',
      createdAt: Date.now() - 60_000,
    },
    {
      id: 'seed_a1',
      role: 'assistant',
      content:
        '我已完成登录表单校验的改造：新增 `validators.ts` 校验工具，`LoginForm.tsx` 接入邮箱格式与密码长度校验，'
        + '错误信息内联展示。单元测试 2 个全部通过。右侧面板可以查看计划、任务、文件变更与终端输出。',
      createdAt: Date.now() - 20_000,
      thinking:
        '用户需要表单校验。计划：1) 阅读现有 LoginForm 结构；2) 抽出可复用的 validators；'
        + '3) 接入错误提示；4) 补测试并运行。校验规则采用 email 正则 + 密码至少 8 位。',
      thinkingDuration: 3800,
    },
  )

  store.plan.value = {
    id: 'seed_plan',
    title: '登录表单校验改造',
    status: 'approved',
    steps: [
      { id: 'p1', title: '阅读 LoginForm.tsx 现有结构', status: 'done' },
      { id: 'p2', title: '新建 validators.ts（邮箱/密码规则）', status: 'done' },
      { id: 'p3', title: '接入内联错误提示', status: 'done' },
      { id: 'p4', title: '补充单元测试并运行', status: 'done' },
    ],
  }

  store.tasks.value = [
    { id: 't1', title: '阅读现有代码', status: 'done' },
    { id: 't2', title: '实现校验工具', status: 'done' },
    { id: 't3', title: '接入表单错误提示', status: 'done' },
    { id: 't4', title: '运行测试', status: 'active' },
  ]

  store.fileChanges.value = [
    {
      id: 'c1', path: 'src/lib/validators.ts', kind: 'create', status: 'pending',
      additions: 15, deletions: 0,
      diff: '+ export const isEmail = (v: string) => /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v)\n+ export const minLen = (n: number) => (v: string) => v.length >= n',
    },
    {
      id: 'c2', path: 'src/components/LoginForm.tsx', kind: 'modify', status: 'pending',
      additions: 12, deletions: 2,
      diff: '- const handleSubmit = () => onSubmit(values)\n+ const errors = validate(values)\n+ if (Object.keys(errors).length) { setErrors(errors); return }\n+ onSubmit(values)',
    },
  ]

  store.terminal.value = [
    { id: 'te1', kind: 'cmd', text: 'pnpm test -- validators', timestamp: Date.now() - 15_000 },
    { id: 'te2', kind: 'out', text: 'PASS src/lib/validators.test.ts', timestamp: Date.now() - 13_000 },
    { id: 'te3', kind: 'out', text: 'Tests: 2 passed, 2 total · Time: 0.84s', timestamp: Date.now() - 12_500 },
    { id: 'te4', kind: 'info', text: 'exit 0', timestamp: Date.now() - 12_000 },
  ]
})
</script>

<template>
  <span hidden aria-hidden="true" />
</template>
