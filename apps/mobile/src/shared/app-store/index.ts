import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  getAccountAddress,
  getBackupDone,
  getDepositPromptShown,
  getLockSettings,
  getPushOptinShown,
  getPushSetting,
  getRestored,
  getZeroSetting,
  setBackupDone,
  setDepositPromptShown,
  setLockState,
  setPushOptinShown,
  setPushSetting,
  setRestored,
  setZeroSetting,
  type LockState,
} from '../storage'
import { reduceLock, type LockEvent } from './lock'

/**
 * The one store for global UI state (ADR-0021, Q62 ③): lock state and the flags the screens read (backup, opt-in notices).
 * Only booleans, numbers and timestamps. The phrase stays in Keychain (ADR-0004).
 */
export type AppState = {
  lock: LockState
  graceSeconds: number
  backupDone: boolean
  depositPromptShown: boolean
  restored: boolean
  pushSetting: boolean
  pushOptinShown: boolean
  zeroSetting: boolean
  dispatchLock: (e: LockEvent) => void
  setBackupDone: (v: boolean) => void
  setDepositPromptShown: (v: boolean) => void
  setRestored: (v: boolean) => void
  setPushSetting: (v: boolean) => void
  setPushOptinShown: (v: boolean) => void
  setZeroSetting: (v: boolean) => void
}

let store: StoreApi<AppState> | null = null

/** A wallet exists on this install (address in kv). The Keychain-only case (interrupted creation) comes in as `phraseStored`. */
export function hasWallet(): boolean {
  try {
    return getAccountAddress() !== null
  } catch {
    return false
  }
}

/**
 * Builds the store and hydrates it from the encrypted kv, synchronously: call it once after `openKv()` resolved and before the first render
 * (the lock gate must know the state before the first paint, ARCHITECTURE.md#invariants).
 *
 * Why not zustand `persist`: its storage hydrates synchronously too (zustand 5.0.16 `middleware.js` `hydrate()` runs inside `persist()` for a sync
 * storage, docs "Hydration and asynchronous storages"), but it keeps the whole state under ONE key as JSON. Existing installs hold one MMKV key per flag
 * (`backupDone`, `settings.push`, ...), and those keys and formats must stay (no data loss), so the initializer reads them directly and each action writes its key.
 */
export function initAppStore({ phraseStored }: { phraseStored: boolean }): void {
  // Write first, then set: a failed write throws and leaves the state unchanged, so a screen never shows a value that was not saved.
  store = createStore<AppState>()((set, get) => {
    const flag =
      (
        key: 'backupDone' | 'depositPromptShown' | 'restored' | 'pushSetting' | 'pushOptinShown' | 'zeroSetting',
        write: (v: boolean) => void,
      ) =>
      (v: boolean) => {
        write(v)
        set({ [key]: v })
      }
    return {
      // Cold start is locked: the lock state saved by the last run is never read back.
      lock: { locked: hasWallet() || phraseStored, backgroundedAt: null },
      graceSeconds: getLockSettings().graceSeconds,
      backupDone: getBackupDone(),
      depositPromptShown: getDepositPromptShown(),
      restored: getRestored(),
      pushSetting: getPushSetting(),
      pushOptinShown: getPushOptinShown(),
      zeroSetting: getZeroSetting(),
      dispatchLock: (e) => {
        const next = reduceLock(get().lock, e)
        set({ lock: next })
        try {
          setLockState(next)
        } catch {
          // kv write failed: the in-memory lock still applies (fails closed)
        }
      },
      setBackupDone: flag('backupDone', setBackupDone),
      setDepositPromptShown: flag('depositPromptShown', setDepositPromptShown),
      setRestored: flag('restored', setRestored),
      setPushSetting: flag('pushSetting', setPushSetting),
      setPushOptinShown: flag('pushOptinShown', setPushOptinShown),
      setZeroSetting: flag('zeroSetting', setZeroSetting),
    }
  })
}

export function appStore(): StoreApi<AppState> {
  if (!store) throw new Error('app-store: initAppStore() was not called')
  return store
}

export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useStore(appStore(), selector)
}
