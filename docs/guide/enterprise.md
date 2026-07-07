# 企业组件

围绕企业落地场景的独立组件，均可脱离聊天上下文单独使用。

## 会话与模板

[demo:session-list]

### SessionList — 多会话管理

```vue
<SessionList
  :sessions="[{ id: 's1', title: '方案对比分析', preview: '已生成对比表', updatedAt: Date.now(), pinned: true, unread: 2 }]"
  :active-id="activeId"
  @select="switchSession"
  @create="newSession"
  @rename="renameSession"
  @delete="deleteSession"
  @pin="togglePin"
/>
```

置顶排序、未读角标、行内重命名、搜索过滤。

### PromptLibrary — 提示模板库

```vue
<PromptLibrary
  :templates="[{ id: 't1', title: '合同风险审查', category: '法务', content: '请审查以下合同的{风险类型}风险：' }]"
  @select="(t) => fillInput(t.content)"
/>
```

分类页签 + 搜索 + `{变量}` 占位计数。

## 模型与成本

### ModelSelector — 模型/协议切换

读取 `PROVIDER_PRESETS` 分组展示（模型协议 / Agent 框架 / 互操作协议），`v-model` 绑定 provider id。

### UsageMeter — Token 用量与配额

[demo:usage-meter]

```vue
<UsageMeter
  :prompt-tokens="12400" :completion-tokens="3800"
  :quota="100000" :prompt-price-per-k="0.004" :completion-price-per-k="0.016"
/>
```

配额进度条按 70%/90% 变色，可选费用估算。

### CompareView — 双模型对比

同一问题两个模型并排回答 + 三向投票（左/平/右），支持流式。评测采集直接可用。

## 质量与安全

### FeedbackDialog — 结构化反馈

点踩后弹出：原因多选（内容不准确/答非所问/…）+ 自由文本，`@submit` 回传结构化数据。

### SafetyBanner — 安全拦截横幅

```vue
<SafetyBanner
  level="blocked" policy="PII 检测"
  title="回答已被拦截" detail="检测到输出包含身份证号，已按数据安全策略拦截。"
  appealable @appeal="openAppealFlow"
/>
```

三级：`info` / `warning` / `blocked`。

### SourcePanel — RAG 引用溯源

引用来源列表：相关度评分着色、片段展开、原文跳转。

## 多模态与协作

### FileDropzone — 文件上传

拖拽/点击上传，类型与大小校验，外部驱动进度条，失败重试。

### VoiceWaveform — 语音录制波形

录音中的动态电平条 + 计时 + 取消/发送。电平可由 AudioContext 实测驱动，也可用内置模拟。

### AgentAvatarGroup — 多 Agent 头像组

```vue
<AgentAvatarGroup
  :agents="[
    { id: 'a1', name: '规划', status: 'done' },
    { id: 'a2', name: '检索', status: 'active' },
    { id: 'a3', name: '写作', status: 'thinking' },
  ]"
/>
```

多智能体协作时展示参与者与实时状态（空闲/思考/执行/完成/出错）。
