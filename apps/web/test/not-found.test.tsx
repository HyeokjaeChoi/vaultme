import { webMessages } from '@vaultme/i18n/web'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import NotFound, { handle, meta } from '../app/routes/not-found'
import { SiteFooter } from '../app/shared/ui/SiteFooter'
import { SiteHeader } from '../app/shared/ui/SiteHeader'
import { SkipLink } from '../app/shared/ui/SkipLink'

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SiteHeader locale={path.startsWith('/en') ? 'en' : 'ko'} />
      <NotFound />
      <SiteFooter locale={path.startsWith('/en') ? 'en' : 'ko'} />
    </MemoryRouter>,
  )

describe('404 page', () => {
  it('renders Korean copy and links for an unknown path', () => {
    at('/nope')
    expect(screen.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('link', { name: '주소 보기' })).toHaveAttribute('href', '/address')
    expect(main.getByRole('link', { name: '홈으로' })).toHaveAttribute('href', '/')
  })

  it('renders English copy under /en/', () => {
    at('/en/nope')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('link', { name: 'View an address' })).toHaveAttribute('href', '/en/address')
    expect(main.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/en/')
  })

  it('is not hydrated and not indexed', () => {
    expect(handle).toEqual({ hydrate: false })
    expect(meta()).toEqual([{ name: 'robots', content: 'noindex' }])
  })
})

describe('skip link', () => {
  it('points at the main content in both languages', () => {
    render(<SkipLink t={webMessages.en.header} />)
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
  })
})

describe('header and footer', () => {
  it('shows the testnet chip, the language switch and the theme toggle', () => {
    at('/nope')
    const header = within(screen.getByRole('banner'))
    expect(header.getByText('Sepolia 테스트넷')).toBeInTheDocument()
    expect(header.getByRole('link', { name: 'EN' })).toHaveAttribute('href', '/en/')
    expect(header.getByRole('button', { name: '화면 테마: 자동' })).toHaveAttribute('data-theme-toggle')
  })

  it('links the other way in English', () => {
    at('/en/nope')
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'KO' })).toHaveAttribute('href', '/')
  })

  // ADR-0014: the header chip is the one network statement on every page; the footer has no caption.
  it('states the network in the header, not in the footer', () => {
    at('/nope')
    expect(within(screen.getByRole('banner')).getByText('Sepolia 테스트넷')).toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).queryByText(/테스트넷/)).toBeNull()
  })
})
