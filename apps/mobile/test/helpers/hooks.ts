// A tiny hook runtime for tests: the app has no React renderer, and these hooks only need state, refs, memo and effects.
// Used with `vi.mock('react', ...)` so the hooks under test run as plain functions. Not a general renderer (no context, no Suspense).
type Slot = { deps?: readonly unknown[] | undefined; value?: unknown; cleanup?: unknown }

let slots: Slot[] = []
let cursor = 0
const flag = { dirty: false, is: () => flag.dirty }
let queue: (() => void)[] = []

const same = (a?: readonly unknown[], b?: readonly unknown[]) =>
  !!a && !!b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
const slot = (): [number, Slot | undefined] => {
  const k = cursor++
  return [k, slots[k]]
}

export const hooks = {
  useState<T>(init: T | (() => T)) {
    const [k, s] = slot()
    const self = (slots[k] ??= { value: s?.value ?? (typeof init === 'function' ? (init as () => T)() : init) })
    const set = (v: T | ((p: T) => T)) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(self.value as T) : v
      if (!Object.is(next, self.value)) {
        self.value = next
        flag.dirty = true
      }
    }
    return [self.value as T, set] as const
  },
  useRef<T>(init: T) {
    const [k] = slot()
    return (slots[k] ??= { value: { current: init } }).value as { current: T }
  },
  useMemo<T>(fn: () => T, deps: readonly unknown[]) {
    const [k, s] = slot()
    if (s && same(s.deps, deps)) return s.value as T
    const value = fn()
    slots[k] = { deps, value }
    return value
  },
  useCallback<T>(fn: T, deps: readonly unknown[]) {
    return hooks.useMemo(() => fn, deps)
  },
  useEffect(fn: () => (() => void) | undefined, deps?: readonly unknown[]) {
    const [k, s] = slot()
    if (s && same(s.deps, deps)) return
    queue.push(() => {
      ;(slots[k]?.cleanup as (() => void) | undefined)?.()
      slots[k] = { deps, cleanup: fn() }
    })
    slots[k] = { ...s, deps: [{}] } // placeholder until the effect runs; never equal to real deps
  },
}

/** Runs `fn` as a component body with fresh hook state. `act(f)` runs `f` (a timer tick, a setter) and re-renders while state changed. */
export function renderHook<P, R>(fn: (props: P) => R, initial: P) {
  slots = []
  const mine = slots
  let props = initial
  const out = { current: undefined as R }
  const flush = () => {
    do {
      slots = mine
      flag.dirty = false
      cursor = 0
      out.current = fn(props)
      const run = queue
      queue = []
      for (const f of run) f()
    } while (flag.is())
  }
  flush()
  return {
    result: out,
    rerender(next: P) {
      props = next
      flush()
    },
    act(f: () => void) {
      slots = mine
      f()
      flush()
    },
    unmount() {
      for (const s of mine) (s.cleanup as (() => void) | undefined)?.()
    },
  }
}
