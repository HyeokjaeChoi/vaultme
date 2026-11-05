import { i18n } from '@vaultme/i18n'
import { at } from './at'

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// Date words come from the app language (`time.*` in packages/i18n, ADR-0037): ko "10월 16일 (금)", en "Fri, Oct 16".
const dateVars = (d: Date) => ({
  monthName: at(i18n.t('time.months').split(','), d.getMonth()),
  day: d.getDate(),
  weekday: at(i18n.t('time.weekdays').split(','), d.getDay()),
})

/** Month and day without the weekday: "10월 12일" / "Oct 12". Device local time. */
export const monthDay = (ms: number): string => i18n.t('time.monthDay', dateVars(new Date(ms)))

/** Update time of the history (ADR-0007): "09:41" today, "10월 13일 09:12" on another day. Device local time. */
export function formatUpdated(ms: number, now: number): string {
  const d = new Date(ms)
  return sameDay(d, new Date(now)) ? hhmm(d) : `${monthDay(ms)} ${hhmm(d)}`
}

/** Date group of a history row: `today` (the caller shows the time) or "10월 12일". */
export function dayGroup(ms: number, now: number): string {
  return sameDay(new Date(ms), new Date(now)) ? 'today' : monthDay(ms)
}

/** Date group title of a history row (Figma B/Date header): "10월 16일 (금)". Device local time. */
export const dateLabel = (ms: number): string => i18n.t('time.weekdayDate', dateVars(new Date(ms)))

/** Identity of a local calendar day ("2026-10-16"): the group key of a history list. `dateLabel` has no year, so it is not one. */
export const dayKey = (ms: number): string => {
  const d = new Date(ms)
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const clock = (ms: number): string => hhmm(new Date(ms))

/** Parts of a detail-screen time ("2026년 10월 16일 오전 9:41": 12-hour clock, no zone). Device local time. The words come from `detail.timeAm` / `detail.timePm`. */
export const dateParts = (ms: number) => {
  const d = new Date(ms)
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    pm: d.getHours() >= 12,
    hour: d.getHours() % 12 || 12,
    minute: pad(d.getMinutes()),
  }
}
