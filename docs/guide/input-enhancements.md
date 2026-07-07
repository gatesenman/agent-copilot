# 输入增强

[demo:input-toolbar]

企业级输入体验：斜杠命令、@ 提及、# 引用、上下文附着、消息队列与消息分支。

## 斜杠命令（/）

在输入框键入 `/` 弹出命令面板。通过 `config.commands` 注册：

```ts
const config: CopilotConfig = {
  commands: [
    {
      name: 'summarize',
      description: '总结当前会话',
      icon: 'S',
      mode: 'send',                    // 立即发送
      template: '请总结上面的对话要点',
    },
    {
      name: 'translate',
      description: '翻译为指定语言',
      hint: '<语言>',
      mode: 'template',                // 填入输入框待编辑
      template: '请把以下内容翻译为{语言}：',
    },
    {
      name: 'clear',
      description: '清空会话',
      mode: 'action',                  // 立即执行，不发消息
      handler: () => store.clearChat(),
    },
  ],
}
```

| mode | 行为 |
| --- | --- |
| `template` | 选中后把 `template` 填入输入框，用户可继续编辑 |
| `send` | 立即以 `template` 为内容发送 |
| `action` | 执行 `handler`，不产生消息 |

## @ 提及与 # 引用

`@` 提及人员/Agent/实体，`#` 引用文档/数据集。两者共用一套候选面板，数据源支持异步搜索：

```ts
const config: CopilotConfig = {
  mentionProvider: async (query) => {
    const users = await searchUsers(query)
    return users.map((u) => ({
      id: u.id, label: u.name, type: 'person',
      description: u.dept, data: u,
    }))
  },
  referenceProvider: (query) =>
    docs
      .filter((d) => d.title.includes(query))
      .map((d) => ({ id: d.id, label: d.title, type: 'doc', data: d })),
}
```

选中候选后：

1. 输入框插入 `@名称` / `#标题` 文本；
2. 该项作为 **ContextItem** 附着到输入框上方的 Chips 区域；
3. 发送时随消息进入 `RunInput.contextItems`，Agent 端可获取完整 `data`。

## 上下文附着（ContextChips）

除提及/引用外，也可通过 API 手动附着上下文：

```ts
const store = useCopilot()
store.attachContext({
  id: 'order-42', source: 'manual',
  label: '订单 #42', type: 'order', data: order,
})
```

用户消息气泡会显示附着的上下文标签，运行输入中通过 `contextItems` 传给 Agent。

## 消息队列（运行中排队发送）

默认运行中输入框禁止发送。开启队列后，运行中发送的消息进入队列，当前轮结束后自动逐条发出：

```ts
const config: CopilotConfig = {
  queue: { enabled: true, maxSize: 5 },
}
```

- 排队消息显示在输入框上方，可单条取消；
- 用户点击「停止」会同时清空队列；
- `store.queuedMessages` / `store.cancelQueued(id)` 可编程控制。

## 消息分支（编辑重发 / 重新生成）

「编辑重发」和「重新生成」不再丢弃旧回答，而是形成 **分支版本**：

- 锚点消息的元信息行出现 `‹ 2/3 ›` 分支切换器；
- 切换分支会替换锚点之后的所有消息；
- `store.branches` / `store.switchBranch(anchorId, index)` 可编程控制。
