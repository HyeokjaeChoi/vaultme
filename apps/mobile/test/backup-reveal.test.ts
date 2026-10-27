import { describe, expect, it } from 'vitest'
import { leavesReveal } from '../src/features/backup/model/reveal'

describe('leavesReveal (#260)', () => {
  it('the OS auth sheet does not cancel the reveal', () => {
    // iOS Face ID: inactive while the sheet is up, and the auth promise may resolve before `active` comes back
    expect(leavesReveal('inactive', true)).toBe(false)
    expect(leavesReveal('inactive', false)).toBe(false)
    // Android device credential: the app goes to the background during auth
    expect(leavesReveal('background', true)).toBe(false)
  })
  it('a real trip to the background cancels it', () => {
    expect(leavesReveal('background', false)).toBe(true)
  })
  it('active never cancels', () => {
    expect(leavesReveal('active', false)).toBe(false)
  })
})
