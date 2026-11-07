// Figma: Motion note · Web · 3 Viewer to Web · 4 Tx detail (W5) 971:12250
import { type CSSProperties, cloneElement, type ReactElement } from 'react'

/** One name per transaction row, part and asset (an ETH row and a USDC row of one hash are two objects). */
export const txShareName = (hash: string, asset: 'ETH' | 'USDC', part: 'status' | 'amount') =>
  `tx-${part}-${hash.toLowerCase()}-${asset}`

/**
 * A name function for the rows of one render: a hash and asset that appears once gets names, one that repeats gets none. /tx
 * names its side by hash and asset alone, so a repeated pair would send the morph from the wrong row, and two visible boxes with
 * one name make the browser skip the whole view transition (a tx can have two ETH or two USDC rows).
 */
export function rowShareNames(rows: { hash: string; asset: 'ETH' | 'USDC' }[]) {
  const count = new Map<string, number>()
  for (const r of rows) {
    const k = `${r.hash.toLowerCase()}-${r.asset}`
    count.set(k, (count.get(k) ?? 0) + 1)
  }
  return (hash: string, asset: 'ETH' | 'USDC', part: 'status' | 'amount') =>
    count.get(`${hash.toLowerCase()}-${asset}`) === 1 ? txShareName(hash, asset, part) : undefined
}

/**
 * The "same object expands" pair of a history row and the /tx detail (DESIGN.md Motion, #466): the two elements carry the same
 * CSS `view-transition-name`, so the browser morphs one into the other inside the route's view transition (root.tsx). Plain CSS
 * names, not React `<ViewTransition name>`: with React's named boundary the badge and amount of /tx never paired with the row
 * (checked on react 19.3.0: the names were set on both pages, the group had no size change). The class `tx-share` is styled in app.css.
 * A DOM element gets the style itself; a component (RowBadge, StatusBadge) is wrapped in an inline-flex span. `name` undefined
 * (before hydration) renders the child alone. HistoryTable and HistoryCards are both in the DOM, one hidden by CSS (display: none): a box that is not rendered cannot clash with the visible one of the same name.
 */
export function Shared({
  name,
  children,
}: {
  name: string | undefined
  children: ReactElement<{ style?: CSSProperties }>
}) {
  if (!name) return children
  const style: CSSProperties = { viewTransitionName: name, viewTransitionClass: 'tx-share' }
  if (typeof children.type === 'string') return cloneElement(children, { style })
  return (
    <span style={style} className="inline-flex">
      {children}
    </span>
  )
}
