const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Update time of the history (Q58): "09:41" today, "10월 13일 09:12" on another day. Device local time. */
export function formatUpdated(ms: number, now: number): string {
  const d = new Date(ms)
  return sameDay(d, new Date(now)) ? hhmm(d) : `${d.getMonth() + 1}월 ${d.getDate()}일 ${hhmm(d)}`
}

/** Date group of a history row: `today` (the caller shows "오늘") or "10월 12일". */
export function dayGroup(ms: number, now: number): 'today' | string {
  const d = new Date(ms)
  return sameDay(d, new Date(now)) ? 'today' : `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export const clock = (ms: number): string => hhmm(new Date(ms))
