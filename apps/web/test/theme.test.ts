import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { THEME_KEY, THEME_SCRIPT } from '../app/shared/lib/theme'

// A fresh document per test: the script adds document-level listeners, as on a real page load.
let doc: Document
const run = () => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the script is a string by design (inline in <head>); test runs that same text
  const script = new Function('document', THEME_SCRIPT) as (d: Document) => void
  script(doc)
}
const button = () => doc.querySelector<HTMLButtonElement>('[data-theme-toggle]')!
const theme = () => doc.documentElement.dataset.theme

beforeEach(() => {
  doc = document.implementation.createHTMLDocument('')
  doc.body.innerHTML = `<button data-theme-toggle data-label="Theme" data-names='{"auto":"Auto","light":"Light","dark":"Dark"}'></button>`
})
afterEach(() => {
  localStorage.clear()
})

describe('theme script', () => {
  it('applies the stored choice before paint', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    run()
    expect(theme()).toBe('dark')
  })

  it('ignores a bad stored value', () => {
    localStorage.setItem(THEME_KEY, 'purple')
    run()
    expect(theme()).toBeUndefined()
  })

  it('cycles auto -> light -> dark -> auto on click, stores it and updates the label', () => {
    run()
    doc.dispatchEvent(new Event('DOMContentLoaded'))
    expect(button().getAttribute('aria-label')).toBe('Theme: Auto')
    button().click()
    expect(theme()).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    expect(button().getAttribute('aria-label')).toBe('Theme: Light')
    button().click()
    expect(theme()).toBe('dark')
    button().click()
    expect(theme()).toBeUndefined()
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    expect(button().getAttribute('aria-label')).toBe('Theme: Auto')
  })

  it('works when storage is blocked', () => {
    const real = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    try {
      run()
      button().click()
      expect(theme()).toBe('light')
    } finally {
      Object.defineProperty(window, 'localStorage', real)
    }
  })

  it('ignores clicks elsewhere', () => {
    run()
    doc.body.click()
    expect(theme()).toBeUndefined()
  })
})
