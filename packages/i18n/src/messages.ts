import type { Ko } from './ko'

/** The shape of `ko` with every string widened: another language must have exactly these keys (ADR-0037). */
type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type Messages = Widen<Ko>
