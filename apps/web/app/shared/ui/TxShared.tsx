// Figma: Motion note · Web · 3 Viewer to Web · 4 Tx detail (W5) 971:12250
import { type CSSProperties, cloneElement, type ReactElement } from 'react'

/** One name per transaction row, part and asset (an ETH row and a USDC row of one hash are two objects). */
export const txShareName = (hash: string, asset: 'ETH' | 'USDC', part: 'status' | 'amount') =>
  `tx-${part}-${hash.toLowerCase()}-${asset}`

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
