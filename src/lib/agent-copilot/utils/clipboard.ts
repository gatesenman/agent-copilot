/**
 * 剪贴板工具：优先使用 Clipboard API，被权限策略（如 iframe 预览环境）
 * 阻止时自动降级为隐藏 textarea + execCommand 方案。
 */
export async function copyText(text: string): Promise<boolean> {
  // 首选：现代 Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // NotAllowedError 等：继续走降级方案
    }
  }
  // 降级：隐藏 textarea + execCommand('copy')
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
