import { describe, expect, it } from 'vitest'
import { ko } from '@vaultme/i18n'
import { activityRowLook } from '../src/shared/ui/activityRowLook'

// B/Row State=Caution (Figma 877:631, 877:659): an incoming zero-value row (Q71, #313). The rendering itself is checked against Figma (ActivityRow.tsx).
describe('activityRowLook', () => {
  it('caution: warning badge and the caution line, amount stays plain', () => {
    expect(activityRowLook({ status: 'confirmed', kind: 'receive', caution: true })).toEqual({
      badge: 'warning',
      struck: false,
      amountTone: 'normal',
      showCaution: true,
    })
  })
  it('no caution: the badge follows kind and status as before, no caution line', () => {
    expect(activityRowLook({ status: 'confirmed', kind: 'receive' })).toMatchObject({
      badge: 'received',
      showCaution: false,
    })
    expect(activityRowLook({ status: 'confirmed', kind: 'send' })).toMatchObject({ badge: 'sent', showCaution: false })
    expect(activityRowLook({ status: 'failed', kind: 'send' })).toMatchObject({
      badge: 'failed',
      struck: true,
      amountTone: 'tertiary',
    })
    expect(activityRowLook({ status: 'pending', kind: 'send' })).toMatchObject({
      badge: 'pending',
      amountTone: 'secondary',
    })
  })
  it('a failed caution row keeps its failed look and still shows the caution line', () => {
    expect(activityRowLook({ status: 'failed', kind: 'receive', caution: true })).toMatchObject({
      badge: 'failed',
      struck: true,
      showCaution: true,
    })
  })
  it('the caution line is Korean copy from i18n', () => {
    expect(ko.activity.row.caution).toBe('주의 · 주소를 사칭한 거래일 수 있어요')
  })
})
