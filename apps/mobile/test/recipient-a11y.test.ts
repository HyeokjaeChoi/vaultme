import { describe, expect, it } from 'vitest'
import { recipientA11yLabel } from '../src/shared/ui/recipientA11y'

// P0-1 (#417): the shown-address button must speak the address, not only the field name (WCAG 4.1.2).
describe('recipientA11yLabel', () => {
  it('reads the label and the full address', () => {
    expect(recipientA11yLabel('받는 주소', '0xAbC0000000000000000000000000000000000001')).toBe(
      '받는 주소, 0xAbC0000000000000000000000000000000000001',
    )
  })
})
