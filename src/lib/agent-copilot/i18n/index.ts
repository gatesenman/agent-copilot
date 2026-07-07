/**
 * i18n — 组件库多语言体系（默认中英文，可注册扩展语言）。
 *
 * 分层设计（低 → 高优先级）：
 *   1. 语言包（zh-CN / en-US 内置，registerLocale 可扩展）
 *   2. config.labels 用户覆盖（保持向后兼容，始终最高优先）
 *
 * 组件消费方式：
 *   const { t, locale } = useI18n()  →  t('chat.send')
 * 旧组件继续读 store.labels.send 也能拿到本地化文案（labels 随 locale 派生）。
 */
import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'

// ============ 语言包类型 ============

export type LocaleCode = 'zh-CN' | 'en-US' | (string & {})

/** 完整消息字典（扁平 key，点号分域） */
export interface LocaleMessages {
  [key: string]: string
}

// ============ 内置语言包 ============

export const zhCN: LocaleMessages = {
  // ---- 聊天核心 ----
  'chat.inputPlaceholder': '输入消息…',
  'chat.send': '发送',
  'chat.stop': '停止',
  'chat.retry': '重试',
  'chat.clear': '清空会话',
  'chat.copy': '复制',
  'chat.copied': '已复制',
  'chat.regenerate': '重新生成',
  'chat.thinking': '思考中…',
  'chat.emptyTitle': '有什么可以帮你？',
  'chat.emptySubtitle': '输入问题或点击下方建议开始对话',
  'chat.errorPrefix': '出错了',
  'chat.suggestionsTitle': '试试这样问',
  'chat.attachFile': '添加附件',
  'chat.feedbackUp': '有帮助',
  'chat.feedbackDown': '没帮助',
  'chat.edit': '编辑',
  'chat.editAndResend': '编辑并重发',
  'chat.cancel': '取消',
  'chat.save': '保存',
  'chat.queued': '已排队',
  'chat.cancelQueued': '取消排队',
  'chat.voice': '语音输入',
  'chat.deepThinking': '深度思考',
  'chat.newSession': '新会话',
  'chat.branchPrev': '上一版本',
  'chat.branchNext': '下一版本',

  // ---- 审批 / 中断 ----
  'hitl.approve': '批准执行',
  'hitl.reject': '拒绝',
  'hitl.approvalPending': '待审批',
  'hitl.interruptLocked': '请先处理上方待确认事项',

  // ---- Markdown 渲染 ----
  'md.copy': '复制',
  'md.copied': '已复制',
  'md.copyTable': '复制表格',
  'md.csv': 'CSV',
  'md.wrap': '折行',
  'md.download': '下载',
  'md.expandAll': '展开全部 {n} 行',
  'md.toc': '目录',
  'md.imagePreview': '图片预览',

  // ---- 文件面板 ----
  'files.filter': '筛选文件…',
  'files.clearFilter': '清除筛选',
  'files.noMatch': '无匹配文件',
  'files.empty': '暂无文件',
  'files.lines': '{n} 行',
  'files.copyContent': '复制内容',
  'files.selectFile': '选择文件查看内容',
  'files.dirs': '{n} 个目录',
  'files.files': '{n} 个文件',

  // ---- 终端 / 工作台 ----
  'terminal.placeholder': '输入命令…',
  'terminal.clear': '清空终端',
  'workspace.plan': '计划',
  'workspace.files': '文件',
  'workspace.terminal': '终端',
  'workspace.browser': '浏览器',
  'workspace.changes': '变更',
  'workspace.tasks': '任务',

  // ---- 模式 / 模型 / 会话 ----
  'mode.label': '模式',
  'model.label': '模型',
  'session.newChat': '新会话',
  'session.delete': '删除会话',
  'session.empty': '暂无会话',
  'session.search': '搜索会话…',
  'session.list': '会话列表',
  'session.unread': '{n} 条未读',
  'session.pin': '置顶',
  'session.unpin': '取消置顶',
  'session.rename': '重命名',

  // ---- 通用 ----
  'common.confirm': '确认',
  'common.cancel': '取消',
  'common.close': '关闭',
  'common.expand': '展开',
  'common.collapse': '收起',
  'common.loading': '加载中…',
  'common.viewAll': '查看全部',
}

export const enUS: LocaleMessages = {
  'chat.inputPlaceholder': 'Type a message…',
  'chat.send': 'Send',
  'chat.stop': 'Stop',
  'chat.retry': 'Retry',
  'chat.clear': 'Clear chat',
  'chat.copy': 'Copy',
  'chat.copied': 'Copied',
  'chat.regenerate': 'Regenerate',
  'chat.thinking': 'Thinking…',
  'chat.emptyTitle': 'How can I help you?',
  'chat.emptySubtitle': 'Ask a question or pick a suggestion below',
  'chat.errorPrefix': 'Something went wrong',
  'chat.suggestionsTitle': 'Try asking',
  'chat.attachFile': 'Attach file',
  'chat.feedbackUp': 'Helpful',
  'chat.feedbackDown': 'Not helpful',
  'chat.edit': 'Edit',
  'chat.editAndResend': 'Edit & resend',
  'chat.cancel': 'Cancel',
  'chat.save': 'Save',
  'chat.queued': 'Queued',
  'chat.cancelQueued': 'Cancel queued',
  'chat.voice': 'Voice input',
  'chat.deepThinking': 'Deep thinking',
  'chat.newSession': 'New chat',
  'chat.branchPrev': 'Previous version',
  'chat.branchNext': 'Next version',

  'hitl.approve': 'Approve',
  'hitl.reject': 'Reject',
  'hitl.approvalPending': 'Pending approval',
  'hitl.interruptLocked': 'Resolve the pending confirmation above first',

  'md.copy': 'Copy',
  'md.copied': 'Copied',
  'md.copyTable': 'Copy table',
  'md.csv': 'CSV',
  'md.wrap': 'Wrap',
  'md.download': 'Download',
  'md.expandAll': 'Expand all {n} lines',
  'md.toc': 'Table of contents',
  'md.imagePreview': 'Image preview',

  'files.filter': 'Filter files…',
  'files.clearFilter': 'Clear filter',
  'files.noMatch': 'No matching files',
  'files.empty': 'No files',
  'files.lines': '{n} lines',
  'files.copyContent': 'Copy content',
  'files.selectFile': 'Select a file to view its content',
  'files.dirs': '{n} dirs',
  'files.files': '{n} files',

  'terminal.placeholder': 'Type a command…',
  'terminal.clear': 'Clear terminal',
  'workspace.plan': 'Plan',
  'workspace.files': 'Files',
  'workspace.terminal': 'Terminal',
  'workspace.browser': 'Browser',
  'workspace.changes': 'Changes',
  'workspace.tasks': 'Tasks',

  'mode.label': 'Mode',
  'model.label': 'Model',
  'session.newChat': 'New chat',
  'session.delete': 'Delete chat',
  'session.empty': 'No chats yet',
  'session.search': 'Search chats…',
  'session.list': 'Chat list',
  'session.unread': '{n} unread',
  'session.pin': 'Pin',
  'session.unpin': 'Unpin',
  'session.rename': 'Rename',

  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.expand': 'Expand',
  'common.collapse': 'Collapse',
  'common.loading': 'Loading…',
  'common.viewAll': 'View all',
}

// ============ 语言包注册表 ============

const registry = new Map<string, LocaleMessages>([
  ['zh-CN', zhCN],
  ['en-US', enUS],
])

/** 注册自定义语言包（可部分覆盖：未提供的 key 回退 en-US → zh-CN） */
export function registerLocale(code: string, messages: LocaleMessages) {
  registry.set(code, { ...registry.get(code), ...messages })
}

/** 归一化 locale：'zh' → 'zh-CN'，'en' → 'en-US'，其余原样 */
export function normalizeLocale(code?: string): LocaleCode {
  if (!code) return 'zh-CN'
  if (code === 'zh' || code.toLowerCase().startsWith('zh-')) return registry.has(code) && code !== 'zh' ? code : 'zh-CN'
  if (code === 'en' || code.toLowerCase().startsWith('en-')) return registry.has(code) && code !== 'en' ? code : 'en-US'
  return registry.has(code) ? code : 'zh-CN'
}

// ============ 翻译函数 ============

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string

/** 创建翻译函数：语言包缺失 key 时回退 zh-CN，再退 key 本身 */
export function createT(locale: Ref<LocaleCode> | ComputedRef<LocaleCode>): TranslateFn {
  return (key, params) => {
    const pack = registry.get(locale.value) ?? zhCN
    let msg = pack[key] ?? zhCN[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) msg = msg.replaceAll(`{${k}}`, String(v))
    }
    return msg
  }
}

// ============ Provide / Inject ============

export interface I18nContext {
  locale: Ref<LocaleCode> | ComputedRef<LocaleCode>
  t: TranslateFn
}

/** Symbol.for 规避 HMR 重新求值导致的 inject 失配（与 COPILOT_KEY 同策略） */
export const I18N_KEY: InjectionKey<I18nContext> = Symbol.for('agent-copilot:i18n')

export function provideI18n(locale: Ref<LocaleCode> | ComputedRef<LocaleCode>): I18nContext {
  const ctx: I18nContext = { locale, t: createT(locale) }
  provide(I18N_KEY, ctx)
  return ctx
}

/** 组件内获取翻译函数；无 Provider 时独立回退到 zh-CN（组件单独使用场景） */
export function useI18n(): I18nContext {
  const injected = inject(I18N_KEY, null)
  if (injected) return injected
  const fallback = ref<LocaleCode>('zh-CN')
  return { locale: fallback, t: createT(fallback) }
}

/** 根据 locale 生成 LabelsConfig 形状的旧版文案对象（向后兼容 store.labels） */
export function labelsFromLocale(t: TranslateFn) {
  return {
    inputPlaceholder: t('chat.inputPlaceholder'),
    send: t('chat.send'),
    stop: t('chat.stop'),
    retry: t('chat.retry'),
    clear: t('chat.clear'),
    copy: t('chat.copy'),
    copied: t('chat.copied'),
    regenerate: t('chat.regenerate'),
    thinking: t('chat.thinking'),
    approve: t('hitl.approve'),
    reject: t('hitl.reject'),
    approvalPending: t('hitl.approvalPending'),
    interruptLocked: t('hitl.interruptLocked'),
    emptyTitle: t('chat.emptyTitle'),
    emptySubtitle: t('chat.emptySubtitle'),
    errorPrefix: t('chat.errorPrefix'),
    suggestionsTitle: t('chat.suggestionsTitle'),
    attachFile: t('chat.attachFile'),
    feedbackUp: t('chat.feedbackUp'),
    feedbackDown: t('chat.feedbackDown'),
  }
}
