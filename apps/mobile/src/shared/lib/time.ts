const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Update time of the history (ADR-0007): "09:41" today, "10월 13일 09:12" on another day. Device local time. */
export function formatUpdated(ms: number, now: number): string {
  const d = new Date(ms)
  return sameDay(d, new Date(now)) ? hhmm(d) : `${d.getMonth() + 1}월 ${d.getDate()}일 ${hhmm(d)}`
}

/** Date group of a history row: `today` (the caller shows "오늘") or "10월 12일". */
export function dayGroup(ms: number, now: number): 'today' | string {
  const d = new Date(ms)
  return sameDay(d, new Date(now)) ? 'today' : `${d.getMonth() + 1}월 ${d.getDate()}일`
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/** Date group title of a history row (Figma B/Date header): "10월 16일 (금)". Device local time. */
export const dateLabel = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`
}

/** Identity of a local calendar day ("2026-10-16"): the group key of a history list. `dateLabel` has no year, so it is not one. */
export const dayKey = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const clock = (ms: number): string => hhmm(new Date(ms))

/** Zone label of the device clock for a Fact time: KST at +9, otherwise "UTC+N" (no zone database needed). */
const zoneLabel = (d: Date): string => {
  const off = -d.getTimezoneOffset() / 60
  return off === 9 ? 'KST' : `UTC${off < 0 ? '-' : '+'}${Math.abs(off)}`
}

/** Time as a Fact (Product B/Fact): "2026-10-16 09:41 KST". Device local time. */
export const factTime = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hhmm(d)} ${zoneLabel(d)}`
}
