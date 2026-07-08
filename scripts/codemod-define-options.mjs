/**
 * codemod：为 agent-copilot 全部 SFC 注入 defineOptions({ name })。
 * - 名称取 PascalCase 文件名（与 index.ts 导出名一致）
 * - 已有 defineOptions 的跳过
 * - 插入位置：<script setup> 开标签后、首个 import 之前
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

const ROOT = new URL('../src/lib/agent-copilot/components', import.meta.url).pathname

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.vue')) out.push(p)
  }
  return out
}

let changed = 0
let skipped = 0
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8')
  if (src.includes('defineOptions(')) { skipped++; continue }
  const name = basename(file, '.vue')
  // 匹配 <script setup ...> 开标签行
  const m = src.match(/<script\s+setup[^>]*>/)
  if (!m) { console.error('no script setup:', file); continue }
  const insertAt = src.indexOf(m[0]) + m[0].length
  const injected = `${src.slice(0, insertAt)}\ndefineOptions({ name: '${name}' })\n${src.slice(insertAt)}`
  writeFileSync(file, injected)
  changed++
}
console.log(`defineOptions codemod: changed=${changed} skipped=${skipped}`)
