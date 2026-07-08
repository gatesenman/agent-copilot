# 可靠性与可观测（Reliability & Observability)

对标 CopilotKit / assistant-ui / Vercel AI SDK 的工程化能力层:中间件管道、断线自动重连、运行遥测、会话导出/导入、DevTools 事件检查器。

## 中间件管道(middleware)

两类中间件,按数组顺序依次执行:

| 类型 | 时机 | 签名 | 典型用途 |
| --- | --- | --- | --- |
| `message` | 发送前 | `(input: RunInput) => RunInput \| Promise<RunInput>` | PII 脱敏、注入租户上下文、内容审计 |
| `event` | 接收时 | `(event: AgentEvent) => AgentEvent \| null` | 过滤内部事件、文本改写、敏感词遮蔽 |

```ts
import { redactPatterns, dropEventTypes, mapTextDelta } from '@your-org/agent-copilot'

const config = defineCopilotConfig({
  middleware: {
    // 发送前:手机号/邮箱脱敏
    message: [redactPatterns([/\b1[3-9]\d{9}\b/g, /\S+@\S+\.\S+/g], '***')],
    // 接收时:丢弃自定义诊断事件 + 输出文本过滤
    event: [dropEventTypes(['CUSTOM']), mapTextDelta((t) => t.replaceAll('内部代号', '产品'))],
  },
})
```

- `event` 中间件返回 `null` 表示丢弃该事件(RUN_STARTED / RUN_FINISHED / RUN_ERROR 为保护事件,不可丢弃)。
- 自定义中间件就是纯函数,可直接单测。

## 断线自动重连(network.reconnect)

仅在**连接建立阶段**(任何内容事件产出之前)自动重试;流中途断开不自动重放——已消费的增量无法安全去重,交由消息级 retry 处理。

```ts
const config = defineCopilotConfig({
  network: {
    reconnect: { enabled: true, retries: 3, baseDelayMs: 1000 },
  },
})
```

- 可重试条件:网络错误(fetch TypeError)/ 429 / 5xx;Abort 不重试。
- 退避策略:`baseDelayMs * 2^(attempt-1)`,上限 30s。
- 每次重试广播 `CONNECTION_RETRY` 事件(`{ attempt, maxRetries, delayMs, reason }`),UI 可提示"重连中"。

## 运行遥测(callbacks.onTelemetry)

每次运行结束(成功/失败/中断/取消)回调一次:

```ts
const config = defineCopilotConfig({
  callbacks: {
    onTelemetry(t) {
      // t: { runId, outcome, durationMs, ttftMs, eventCount, toolCallCount, outputChars, usage, charsPerSecond }
      analytics.track('copilot_run', t)
    },
  },
})
```

| 指标 | 含义 |
| --- | --- |
| `ttftMs` | 首 token 延迟(Time To First Token) |
| `durationMs` | 运行总时长 |
| `charsPerSecond` | 首 token 后的输出速率 |
| `outcome` | `finished` / `error` / `interrupted` / `cancelled` |
| `usage` | 后端上报的 token 用量(有则携带) |

## 会话导出 / 导入

```ts
import { exportSession, importSessionJson } from '@your-org/agent-copilot'

// 导出:markdown(阅读/分享)或 json(备份/迁移)
exportSession(store.messages.value, { format: 'markdown', title: '客服会话' })

// 导入:JSON 文本 → 校验后恢复消息(坏条目跳过并提示)
const result = importSessionJson(fileText)
if (result.ok) store.messages.value = result.messages
```

## DevTools 事件检查器

```vue
<CopilotProvider :config="config">
  <AgentCopilot />
  <CopilotDevtools />   <!-- debug 或 DEV 构建下渲染,生产静默 -->
</CopilotProvider>
```

- 实时事件流水(类型着色、相对时间、载荷展开),环形缓冲上限 200 条。
- 配置快照:当前生效配置(五层合并结果)一键查看。
- 仅在 `config.debug === true` 或 Vite DEV 构建下记录与渲染,零生产开销。

## 单元测试

库自带 vitest 单测(`src/lib/agent-copilot/__tests__/`),覆盖五层配置合并、16 种协议适配器帧解析、中间件管道、重连策略、导出/导入与 i18n 词条完整性:

```bash
pnpm test        # 单跑一次
pnpm test:watch  # 监听模式
```
