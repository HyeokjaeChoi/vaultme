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
/** Settings toggles (S62 거래 알림, S63 0원 거래 표시). Local preferences only: push registration and the zero-value filter are not wired to them yet (ponytail: wire when the push server is). */
export const getPushSetting = (): boolean => store().getBoolean('settings.push') ?? true
export const setPushSetting = (v: boolean): void => store().set('settings.push', v)
export const getZeroSetting = (): boolean => store().getBoolean('settings.zero') ?? false
export const setZeroSetting = (v: boolean): void => store().set('settings.zero', v)

/** Q14: the "back up now" sheet after the first incoming deposit was shown once. Reset when a wallet is created or restored. */
export const getDepositPromptShown = (): boolean => store().getBoolean('backup.depositPromptShown') ?? false
export const setDepositPromptShown = (v: boolean): void => store().set('backup.depositPromptShown', v)

export const getBackupDone = (): boolean => store().getBoolean('backupDone') ?? false
export const setBackupDone = (v: boolean): void => store().set('backupDone', v)

// --- restored flag (Q16): set by a successful restore (S05/S06), cleared when a new wallet is created. It is not backup proof ---
export const getRestored = (): boolean => store().getBoolean('wallet.restored') ?? false
export const setRestored = (v: boolean): void => store().set('wallet.restored', v)

// --- account address: first-account public address, derived at creation (no auth needed to show it) ---
export const getAccountAddress = (): string | null => store().getString('account.address') ?? null
export const setAccountAddress = (a: string): void => store().set('account.address', a)
export const clearAccountAddress = (): void => void store().remove('account.address')

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
  /** Estimated fee at send time, decimal ETH string (S23/S41 show it). Optional: older records have none. */
  fee?: string
  /** Why the network says the tx failed, only when it said so with a value this app knows. Never guessed: S23 shows the reason line only when this is set (owner 2026-10-17). */
  failReason?: 'outOfGas'
  state: 'Pending' | 'Unknown' | 'Included' | 'Confirmed' | 'Failed' | 'Replaced'
}

const STATES = ['Pending', 'Unknown', 'Included', 'Confirmed', 'Failed', 'Replaced']
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
    ...(isStr(o.fee) ? { fee: o.fee } : {}),
    ...(o.failReason === 'outOfGas' ? { failReason: 'outOfGas' as const } : {}),
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

// --- API install id (lld.md §4.1). The device key itself is in Keychain. ---
export const getInstallId = (): string | null => store().getString('api.installId') ?? null
export function setInstallId(id: string | null): void {
  if (id === null) store().remove('api.installId')
  else store().set('api.installId', id)
}

// --- last /v1/history result and when it was fetched (Q58) ---
export type HistoryCache = { address: string; json: string; updatedAt: number }
export function getHistoryCache(): HistoryCache | null {
  const raw = store().getString('history.cache')
  if (raw === undefined) return null
  try {
    const v = JSON.parse(raw) as Partial<HistoryCache>
    return typeof v.address === 'string' && typeof v.json === 'string' && typeof v.updatedAt === 'number' ? (v as HistoryCache) : null
  } catch {
    return null
  }
}
export const setHistoryCache = (c: HistoryCache): void => store().set('history.cache', JSON.stringify(c))

// --- fake chain adapter nonce counter (fake mode only; the real adapter reads the nonce from the network) ---
export const getFakeNonce = (): number => store().getNumber('fakeChain.nonce') ?? 0
export const setFakeNonce = (n: number): void => store().set('fakeChain.nonce', n)

// --- recent recipients (S20a): addresses this device sent to, newest first, at most 3. Local only: never uploaded, never read from the network. ---
export type RecentRecipient = { address: string; at: number; asset: string; amount: string }
export const MAX_RECENTS = 3
export function parseRecents(raw: string | undefined): RecentRecipient[] {
  if (raw === undefined) return []
  try {
    const v = JSON.parse(raw) as unknown
    if (!Array.isArray(v)) return []
    return v
      .filter((x): x is RecentRecipient => !!x && typeof x.address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(x.address) && typeof x.at === 'number' && typeof x.asset === 'string' && typeof x.amount === 'string')
      .slice(0, MAX_RECENTS)
  } catch {
    return []
  }
}
export const getRecents = (): RecentRecipient[] => parseRecents(store().getString('send.recents'))
/** Puts `r` first, drops an older entry of the same address (case-insensitive), keeps 3. */
export function addRecent(r: RecentRecipient): void {
  const rest = getRecents().filter((x) => x.address.toLowerCase() !== r.address.toLowerCase())
  store().set('send.recents', JSON.stringify([r, ...rest].slice(0, MAX_RECENTS)))
}
