import { useSyncExternalStore } from 'react'

/** Set once the API said 426: this app version is no longer supported. It stays set until the app restarts (an update restarts it). */
export function createUpdateGate() {
  let required = false
  const listeners = new Set<() => void>()
  return {
    mark: () => {
      if (required) return
      required = true
      listeners.forEach((l) => l())
    },
    get: () => required,
    subscribe: (l: () => void) => {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
  }
}

const gate = createUpdateGate()
export const markUpdateRequired = gate.mark

/** S91 gate: true once any API call got 426. */
export const useUpdateRequired = (): boolean => useSyncExternalStore(gate.subscribe, gate.get)
