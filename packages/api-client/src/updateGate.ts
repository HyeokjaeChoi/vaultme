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
