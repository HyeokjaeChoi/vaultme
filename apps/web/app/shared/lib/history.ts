import type { WebLocale } from '@vaultme/i18n/web'

/** The faucet the mobile app opens (apps/mobile features/faucet). */
export const FAUCET_URL = 'https://faucet.quicknode.com/ethereum/sepolia'
export const etherscanAddress = (address: string) => `https://sepolia.etherscan.io/address/${address}`

const MIN = 60_000
const HOUR = 60 * MIN
const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0)

/** Time column (Figma): minutes and hours ago, "yesterday", then the date (with the year when it is not this year). */
export function relativeTime(at: number, now: number, locale: WebLocale): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const age = now - at
  if (age < MIN) return rtf.format(0, 'second') // also a clock a little ahead of the server
  if (age < HOUR) return rtf.format(-Math.floor(age / MIN), 'minute')
  if (startOfDay(at) === startOfDay(now)) return rtf.format(-Math.floor(age / HOUR), 'hour')
  if (startOfDay(at) === startOfDay(now - 24 * HOUR)) return rtf.format(-1, 'day')
  const sameYear = new Date(at).getFullYear() === new Date(now).getFullYear()
  return new Intl.DateTimeFormat(locale, {
    ...(sameYear ? {} : { year: 'numeric' }),
    month: locale === 'ko' ? 'long' : 'short',
    day: 'numeric',
  }).format(at)
}

/** Date header of the card list: "10월 25일 (일)". */
export const dayHeader = (at: number, locale: WebLocale) =>
  new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'short' }).format(at)

/** "09:12", 24 hours in both languages. */
export const clock = (at: number, locale: WebLocale) =>
  new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)

/** "+0.05 ETH" / "−0.02 ETH" (U+2212). A zero amount has no sign. */
export function signed(i: { kind: 'send' | 'receive'; amount: string; asset: string }): string {
  const sign = /^0(\.0*)?$/.test(i.amount) ? '' : i.kind === 'receive' ? '+' : '−'
  return `${sign}${i.amount} ${i.asset}`
}
