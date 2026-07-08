/**
 * 组件 API 约定守护测试
 *
 * 扫描 components/ 下全部 SFC 源码，机械断言以下规范，防止回归：
 * 1. 每个组件必须有 defineOptions({ name }) 且 name 与文件名一致
 * 2. 模板中用了 <slot> 的组件必须有 defineSlots 类型声明
 * 3. defineEmits 必须使用类型签名（禁止运行时数组/对象写法）
 * 4. 对话框/弹层组件（Teleport + open prop）必须走 v-model:open 协议
 *    （有 update:open emit），禁止裸 close 事件作为唯一关闭出口
 * 5. props 必须使用类型声明 defineProps<...>()（禁止运行时对象写法）
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMPONENTS_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../components')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.vue')) out.push(p)
  }
  return out
}

const files = walk(COMPONENTS_ROOT)
const sources = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]))

/** 提取 template 部分（避免 script 中的字符串误报 <slot>） */
function templateOf(src: string): string {
  const m = src.match(/<template>[\s\S]*<\/template>/)
  return m ? m[0] : ''
}

describe('组件 API 约定守护', () => {
  it('扫描到全部组件（>= 60 个）', () => {
    expect(files.length).toBeGreaterThanOrEqual(60)
  })

  it('1. 全部组件有 defineOptions({ name }) 且与文件名一致', () => {
    const bad: string[] = []
    for (const [f, src] of sources) {
      const expected = basename(f, '.vue')
      const m = src.match(/defineOptions\(\s*\{\s*name:\s*'([^']+)'/)
      if (!m || m[1] !== expected) bad.push(`${basename(f)} -> ${m?.[1] ?? '缺失'}`)
    }
    expect(bad, `defineOptions 缺失或与文件名不一致: ${bad.join(', ')}`).toEqual([])
  })

  it('2. 模板含 <slot> 的组件必须声明 defineSlots', () => {
    const bad: string[] = []
    for (const [f, src] of sources) {
      if (/<slot[\s/>]/.test(templateOf(src)) && !src.includes('defineSlots<')) bad.push(basename(f))
    }
    expect(bad, `缺 defineSlots: ${bad.join(', ')}`).toEqual([])
  })

  it('3. defineEmits 必须使用类型签名', () => {
    const bad: string[] = []
    for (const [f, src] of sources) {
      // 运行时写法：defineEmits([...]) 或 defineEmits({...})
      if (/defineEmits\(\s*[[{]/.test(src)) bad.push(basename(f))
    }
    expect(bad, `emits 使用了运行时写法: ${bad.join(', ')}`).toEqual([])
  })

  it('4. Teleport 弹层组件必须走 v-model:open 协议', () => {
    const bad: string[] = []
    for (const [f, src] of sources) {
      const isOverlay = src.includes('<Teleport') && /\bopen\??:\s*boolean/.test(src)
      if (!isOverlay) continue
      if (!src.includes("'update:open'")) bad.push(basename(f))
    }
    expect(bad, `弹层组件缺 update:open: ${bad.join(', ')}`).toEqual([])
  })

  it('5. defineProps 必须使用类型声明', () => {
    const bad: string[] = []
    for (const [f, src] of sources) {
      if (!src.includes('defineProps')) continue
      // 运行时写法：defineProps({ 或 defineProps([
      if (/defineProps\(\s*[[{]/.test(src)) bad.push(basename(f))
    }
    expect(bad, `props 使用了运行时写法: ${bad.join(', ')}`).toEqual([])
  })
})
