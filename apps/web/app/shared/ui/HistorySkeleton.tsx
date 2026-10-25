// Figma: B/Skeleton row 422:668 + Skeleton date / Skeleton button (History loading 767:3091 at 375, 767:3221 and 767:3383 with Web/Table head)
import type { WebMessages } from '@vaultme/i18n/web'

// The same boxes as the rows they stand for, so rows arriving move nothing (CLS 0): 5 rows and the 더 보기 button.
const bar = 'bg-skeleton-bg rounded-skeleton-radius'

function Row() {
  return (
    <div className="h-row-b-height px-row-b-padding-x flex items-center gap-3">
      <div className="bg-skeleton-bg rounded-pill size-avatar-md shrink-0" />
      <div className="gap-skeleton-gap flex min-w-px flex-1 flex-col">
        <div className={`${bar} skeleton-title`} />
        <div className={`${bar} skeleton-subtitle`} />
      </div>
      <div className={`${bar} skeleton-value`} />
    </div>
  )
}

export function HistorySkeleton({ t }: { t: WebMessages }) {
  const th = 'text-product-b-caption text-text-tertiary px-1-5 py-2 font-normal'
  return (
    <div aria-hidden="true">
      <div className="tablet:hidden">
        <div className={`${bar} skeleton-date`} />
        <Row />
        <Row />
        <div className={`${bar} skeleton-date`} />
        <Row />
        <Row />
      </div>
      <div className="tablet:block hidden">
        <div className="px-row-b-padding-x flex gap-3">
          <span className={`${th} w-col-status`}>{t.history.columns.status}</span>
          <span className={`${th} w-col-direction`}>{t.history.columns.direction}</span>
          <span className={`${th} min-w-px flex-1`}>{t.history.columns.counterparty}</span>
          <span className={`${th} w-col-amount text-right`}>{t.history.columns.amount}</span>
          <span className={`${th} w-col-time text-right`}>{t.history.columns.time}</span>
        </div>
        {[0, 1, 2, 3, 4].map((n) => (
          <Row key={n} />
        ))}
      </div>
      <div className="pt-6">
        <div className={`${bar} h-button-b-height-lg`} />
      </div>
    </div>
  )
}
