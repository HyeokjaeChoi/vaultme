import { describe, expect, it } from 'vitest'
import { dark, light } from '../src/generated/tokens'

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

describe.each([['light', light], ['dark', dark]] as const)('%s', (_, t) => {
  it('resolves values to RN-ready numbers', () => {
    expect(t.component.button.size.md.height).toBe(44)
    expect(t.semantic.layout.screen.padding).toBe(16)
    expect(t.semantic.typography.row.fontWeight).toBe('500')
    expect(t.primitive.motion.duration.fastMs).toBe(120)
  })
  it.each(['primary', 'secondary', 'tertiary'] as const)('text.%s has 4.5:1 on surfaces', (k) => {
    for (const s of ['canvas', 'default', 'raised', 'subtle'] as const)
      expect(ratio(t.semantic.text[k], t.semantic.surface[s])).toBeGreaterThanOrEqual(4.5)
  })
  it.each(['success', 'warning', 'danger', 'info', 'unknown'] as const)('status.%s fg on bg has 4.5:1', (k) => {
    expect(ratio(t.semantic.status[k].fg, t.semantic.status[k].bg)).toBeGreaterThanOrEqual(4.5)
  })
})

it('dark differs from light and keeps primary action', () => {
  expect(dark.semantic.surface.default).not.toBe(light.semantic.surface.default)
  expect(dark.component.statusNotice.danger.bg).not.toBe(light.component.statusNotice.danger.bg)
  expect(dark.semantic.action.primary.bg.default).toBe(light.semantic.action.primary.bg.default)
})
