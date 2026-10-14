import { createMMKV, type MMKV } from 'react-native-mmkv'
import { getOrCreateKvKey } from './keychain'

// One encrypted MMKV instance (Q63). The key comes from Keychain (async), so call `openKv()` once
// at boot (before the first render); after that every helper here is synchronous.
let kv: MMKV | null = null
let opening: Promise<void> | null = null

export function openKv(): Promise<void> {
  opening ??= (async () => {
    try {
      const encryptionKey = await getOrCreateKvKey()
      kv = createMMKV({ id: 'vaultme', encryptionKey, encryptionType: 'AES-256' })
    } catch (e) {
      opening = null // allow retry after any init failure
      throw e
    }
  })()
  return opening
}

function store(): MMKV {
  if (!kv) throw new Error('kv: openKv() was not awaited')
  return kv
}


// --- backup flag ---
export const getBackupDone = (): boolean => store().getBoolean('backupDone') ?? false
export const setBackupDone = (v: boolean): void => store().set('backupDone', v)

// --- lock (Q13): 30 s grace after a real background; cold start is locked ---
export type LockSettings = { graceSeconds: number }
export type LockState = { locked: boolean; backgroundedAt: number | null }

export const DEFAULT_LOCK_SETTINGS: LockSettings = { graceSeconds: 30 }
const DEFAULT_LOCK_STATE: LockState = { locked: true, backgroundedAt: null }

export function getLockSettings(): LockSettings {
  const s = store().getNumber('lock.graceSeconds')
  return { graceSeconds: s !== undefined && s >= 0 ? s : DEFAULT_LOCK_SETTINGS.graceSeconds }
}
export const setLockSettings = (s: LockSettings): void => store().set('lock.graceSeconds', s.graceSeconds)

export function getLockState(): LockState {
  const k = store()
  const locked = k.getBoolean('lock.locked')
  if (locked === undefined) return DEFAULT_LOCK_STATE
  const at = k.getNumber('lock.backgroundedAt')
  return { locked, backgroundedAt: at ?? null }
}
export function setLockState(s: LockState): void {
  const k = store()
  k.set('lock.locked', s.locked)
  if (s.backgroundedAt === null) k.remove('lock.backgroundedAt')
  else k.set('lock.backgroundedAt', s.backgroundedAt)
}

// --- pending tx (lld.md §6; send wiring is #23). amount is a decimal string, never a Number. ---
export type PendingTx = {
  hash: string
  nonce: number
  asset: string
  to: string
  amount: string
  createdAt: number
  lastCheckedAt: number
  state: 'Pending' | 'Unknown' | 'Included'
}

const STATES = ['Pending', 'Unknown', 'Included']
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function parsePendingTx(raw: string): PendingTx | null {
  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>
  if (
    !isStr(o.hash) || !isNum(o.nonce) || !isStr(o.asset) || !isStr(o.to) || !isStr(o.amount) ||
    !isNum(o.createdAt) || !isNum(o.lastCheckedAt) || !STATES.includes(o.state as string)
  ) return null
  return {
    hash: o.hash, nonce: o.nonce, asset: o.asset, to: o.to, amount: o.amount,
    createdAt: o.createdAt, lastCheckedAt: o.lastCheckedAt, state: o.state as PendingTx['state'],
  }
}

export function getPendingTx(): PendingTx | null {
  const raw = store().getString('pendingTx')
  if (raw === undefined) return null
  const tx = parsePendingTx(raw)
  // A corrupt record must not read as "no pending tx": that would lift the send block (Q47).
  if (!tx) throw new Error('kv: pendingTx record is corrupt')
  return tx
}
export function setPendingTx(tx: PendingTx | null): void {
  if (tx === null) store().remove('pendingTx')
  else store().set('pendingTx', JSON.stringify(tx))
}
