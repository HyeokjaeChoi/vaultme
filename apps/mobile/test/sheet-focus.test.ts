import { describe, expect, it } from 'vitest'
import { closeOnBlur, releaseCloses, sheetOnScreen } from '../src/shared/ui/sheetFocus'

describe('BottomSheet follows its screen focus', () => {
  it('hides the Modal while another route or tab is in front', () => {
    expect(sheetOnScreen({ mounted: true, focused: true })).toBe(true)
    expect(sheetOnScreen({ mounted: true, focused: false })).toBe(false)
    expect(sheetOnScreen({ mounted: false, focused: true })).toBe(false)
  })
  it('closes an open sheet on blur, so it does not come back on return', () => {
    expect(closeOnBlur({ visible: true, focused: false })).toBe(true)
    expect(closeOnBlur({ visible: true, focused: true })).toBe(false)
    expect(closeOnBlur({ visible: false, focused: false })).toBe(false)
  })
  it('closes on a long or fast drag only when dismissible; otherwise springs back', () => {
    const base = { height: 400, dismissible: true }
    expect(releaseCloses({ ...base, dy: 121, vy: 0 })).toBe(true)
    expect(releaseCloses({ ...base, dy: 10, vy: 0.6 })).toBe(true)
    expect(releaseCloses({ ...base, dy: 100, vy: 0.2 })).toBe(false)
    expect(releaseCloses({ ...base, dismissible: false, dy: 300, vy: 2 })).toBe(false)
  })
})
