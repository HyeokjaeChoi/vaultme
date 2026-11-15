import { readFileSync } from 'node:fs'
import { i18n } from '@vaultme/i18n'
import { describe, expect, it } from 'vitest'

// ADR-0041 (UI side): source scan, screens are checked against Figma. The model rules are in cancel.test.ts and the anvil case 9.
const src = (f: string) => readFileSync(new URL(`../src/widgets/speed-up/${f}`, import.meta.url), 'utf8')

describe('Cancel for an Unknown send (ADR-0041)', () => {
  it('PendingActions shows the buttons for Pending and Unknown only, and SpeedUp is not forced on Unknown', () => {
    const a = src('PendingActions.tsx')
    expect(a).toContain("const buttons = pending || tx.state === 'Unknown'")
    expect(a).toContain("tx.kind === 'cancel' ? null : <SpeedUp")
    expect(src('SpeedUp.tsx')).toContain('canSpeedUp(tx, chain.broadcasts)')
  })
  it('the sheet of an Unknown send warns, and no copy claims the tx was cancelled', () => {
    expect(src('Cancel.tsx')).toContain("tx.state === 'Unknown'")
    expect(src('Cancel.tsx')).toContain("t('cancel.sheet.unknownTitle')")
    const title = i18n.getFixedT('ko')('cancel.sheet.unknownTitle')
    expect(title).toBe('이미 처리됐을 수 있어요')
    expect(title).not.toMatch(/취소(했|됐|되었)/)
  })
})
