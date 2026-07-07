/**
 * Agent Copilot 气泡嵌入脚本（对标 Dify embed.min.js / Intercom widget）
 *
 * 用法（任意网站两行接入）：
 *   <script>
 *     window.agentCopilotConfig = {
 *       baseUrl: 'https://your-copilot-host',   // 必填：embed.html 所在站点
 *       title: 'AI 助手',                        // 可选：窗口标题
 *       theme: 'auto',                           // 可选：light | dark | auto
 *       brand: '0f6b54',                         // 可选：品牌色（hex，无 #）
 *       placeholder: '', initialMessage: '',     // 可选：输入占位 / 欢迎语
 *       endpoint: '',                            // 可选：自有后端 SSE 端点（http 模式）
 *       position: 'right',                       // 可选：气泡位置 right | left
 *       zIndex: 2147483000,                      // 可选
 *       config: {},                              // 可选：postMessage 注入的敏感配置（如 apiKey）
 *       onMessage: function (msg) {},            // 可选：消息回调 { role, content }
 *     }
 *   </script>
 *   <script src="https://your-copilot-host/embed.js" defer></script>
 *
 * 运行时 API：window.AgentCopilotEmbed.open() / .close() / .toggle() / .destroy()
 */
;(function () {
  'use strict'
  if (window.AgentCopilotEmbed) return // 防重复注入

  var cfg = window.agentCopilotConfig || {}
  var baseUrl = (cfg.baseUrl || '').replace(/\/+$/, '')
  if (!baseUrl) {
    // 未显式配置时，回退到 embed.js 自身所在 origin（对标 Dify：脚本与嵌入页同站部署）
    var self = document.currentScript || document.querySelector('script[src*="embed.js"]')
    try {
      baseUrl = self && self.src ? new URL(self.src, location.href).origin : location.origin
    } catch (err) {
      baseUrl = location.origin
    }
  }

  var Z = cfg.zIndex || 2147483000
  var POS = cfg.position === 'left' ? 'left' : 'right'
  var BRAND = '#' + String(cfg.brand || '0f6b54').replace(/^#/, '')

  // ---- 嵌入页 URL（敏感项走 postMessage，不入 URL）----
  var qs = new URLSearchParams({ layout: 'bubble' })
  if (cfg.title) qs.set('title', cfg.title)
  if (cfg.subtitle) qs.set('subtitle', cfg.subtitle)
  if (cfg.theme) qs.set('theme', cfg.theme)
  if (cfg.brand) qs.set('brand', String(cfg.brand).replace(/^#/, ''))
  if (cfg.placeholder) qs.set('placeholder', cfg.placeholder)
  if (cfg.initialMessage) qs.set('initialMessage', cfg.initialMessage)
  if (cfg.endpoint) qs.set('endpoint', cfg.endpoint)
  var iframeSrc = baseUrl + '/embed.html?' + qs.toString()

  // ---- 样式 ----
  var style = document.createElement('style')
  style.textContent =
    '.acw-btn{position:fixed;bottom:20px;' + POS + ':20px;width:52px;height:52px;border:none;border-radius:50%;' +
    'background:' + BRAND + ';color:#fff;cursor:pointer;z-index:' + Z + ';display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.22);transition:transform .15s ease}' +
    '.acw-btn:hover{transform:scale(1.06)}' +
    '.acw-btn svg{width:24px;height:24px;pointer-events:none}' +
    '.acw-frame{position:fixed;bottom:84px;' + POS + ':20px;width:400px;height:min(640px,calc(100vh - 110px));' +
    'border:none;border-radius:14px;box-shadow:0 12px 48px rgba(0,0,0,.24);z-index:' + Z + ';background:#fff;' +
    'opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .18s ease,transform .18s ease}' +
    '.acw-frame.acw-open{opacity:1;pointer-events:auto;transform:translateY(0)}' +
    '@media(max-width:520px){.acw-frame{width:calc(100vw - 24px);' + POS + ':12px;bottom:78px;height:calc(100vh - 96px)}}'
  document.head.appendChild(style)

  // ---- 悬浮按钮（内联 SVG 字体图标）----
  var ICON_CHAT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M18 6 6 18M6 6l12 12"/></svg>'

  var btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'acw-btn'
  btn.setAttribute('aria-label', '打开 AI 助手')
  btn.innerHTML = ICON_CHAT

  var frame = document.createElement('iframe')
  frame.className = 'acw-frame'
  frame.src = iframeSrc
  frame.title = cfg.title || 'AI 助手'
  frame.allow = 'clipboard-write'

  var opened = false
  var childReady = false

  function postToChild(payload) {
    if (frame.contentWindow) frame.contentWindow.postMessage(payload, baseUrl)
  }

  function setOpen(v) {
    opened = v
    frame.classList.toggle('acw-open', v)
    btn.innerHTML = v ? ICON_CLOSE : ICON_CHAT
    btn.setAttribute('aria-label', v ? '收起 AI 助手' : '打开 AI 助手')
  }

  btn.addEventListener('click', function () { setOpen(!opened) })

  window.addEventListener('message', function (e) {
    if (e.origin !== baseUrl && baseUrl.indexOf(e.origin) !== 0) return
    var d = e.data || {}
    if (d.type === 'ac:ready') {
      childReady = true
      // 敏感配置（apiKey / headers 等）在此注入，避免出现在 URL
      if (cfg.config && typeof cfg.config === 'object') postToChild({ type: 'ac:config', config: cfg.config })
    } else if (d.type === 'ac:close') {
      setOpen(false)
    } else if (d.type === 'ac:message' && typeof cfg.onMessage === 'function') {
      try { cfg.onMessage({ role: d.role, content: d.content }) } catch (err) { console.error(err) }
    }
  })

  function mount() {
    document.body.appendChild(frame)
    document.body.appendChild(btn)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount)
  else mount()

  window.AgentCopilotEmbed = {
    open: function () { setOpen(true) },
    close: function () { setOpen(false) },
    toggle: function () { setOpen(!opened) },
    isOpen: function () { return opened },
    isReady: function () { return childReady },
    destroy: function () {
      btn.remove(); frame.remove(); style.remove()
      delete window.AgentCopilotEmbed
    },
  }
})()
