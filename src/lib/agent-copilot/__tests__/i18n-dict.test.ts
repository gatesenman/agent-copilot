/**
 * i18n 词条完整性：zh/en 键一一对应、插值参数一致。
 */
import { describe, expect, it } from 'vitest'
import { zhCN, enUS } from '../i18n'

function interpolationParams(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
}

describe('i18n 词条完整性', () => {
  it('zh 与 en 键集合一致', () => {
    const zhKeys = Object.keys(zhCN).sort()
    const enKeys = Object.keys(enUS).sort()
    const missingInEn = zhKeys.filter((k) => !enKeys.includes(k))
    const missingInZh = enKeys.filter((k) => !zhKeys.includes(k))
    expect(missingInEn, `en 缺少词条: ${missingInEn.join(', ')}`).toHaveLength(0)
    expect(missingInZh, `zh 缺少词条: ${missingInZh.join(', ')}`).toHaveLength(0)
  })

  it('插值参数双语一致', () => {
    const mismatches: string[] = []
    for (const key of Object.keys(zhCN)) {
      const zhParams = interpolationParams(String(zhCN[key as keyof typeof zhCN] ?? ''))
      const enParams = interpolationParams(String(enUS[key as keyof typeof enUS] ?? ''))
      if (zhParams.join(',') !== enParams.join(',')) {
        mismatches.push(`${key}: zh(${zhParams.join(',')}) != en(${enParams.join(',')})`)
      }
    }
    expect(mismatches, mismatches.join('; ')).toHaveLength(0)
  })

  it('无空词条', () => {
    const empties = Object.entries({ ...zhCN }).filter(([, v]) => String(v).trim() === '')
    expect(empties.map(([k]) => k)).toHaveLength(0)
  })
})
