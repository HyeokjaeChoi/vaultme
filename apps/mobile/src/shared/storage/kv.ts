import type { HistoryCache } from '@vaultme/history'
import { createMMKV, type MMKV } from 'react-native-mmkv'
import { getOrCreateKvKey } from './keychain'

// One encrypted MMKV instance (ADR-0004). The key comes from Keychain (async), so call `openKv()` once
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
/**
 * Settings toggles (S62 거래 알림, S63 0원 거래 표시). S62 is on only after the user opted in and the OS allowed notifications (#67):
 * the default is off, so the switch never claims a registration that does not exist. The S63 zero-value filter is not wired to its switch yet.
 */
export const getPushSetting = (): boolean => store().getBoolean('settings.push') ?? false
export const setPushSetting = (v: boolean): void => store().set('settings.push', v)
/** #67 decision 5: the S50 sheet is offered once. */
export const getPushOptinShown = (): boolean => store().getBoolean('push.optinShown') ?? false
export const setPushOptinShown = (v: boolean): void => store().set('push.optinShown', v)
/** The server may still hold this install's address and token (a DELETE failed or was cut off, or a PUT got no answer). The DELETE is retried at the next launch (#67 decision 7). */
export const getPushUnregisterPending = (): boolean => store().getBoolean('push.unregisterPending') ?? false
export const setPushUnregisterPending = (v: boolean): void => store().set('push.unregisterPending', v)
export const getZeroSetting = (): boolean => store().getBoolean('settings.zero') ?? false
export const setZeroSetting = (v: boolean): void => store().set('settings.zero', v)

/** The "back up now" sheet after the first incoming deposit was shown once. Reset when a wallet is created or restored. */
export const getDepositPromptShown = (): boolean => store().getBoolean('backup.depositPromptShown') ?? false
export const setDepositPromptShown = (v: boolean): void => store().set('backup.depositPromptShown', v)

export const getBackupDone = (): boolean => store().getBoolean('backupDone') ?? false
export const setBackupDone = (v: boolean): void => store().set('backupDone', v)

// --- restored flag: set by a successful restore (S05/S06), cleared when a new wallet is created. It is not backup proof ---
export const getRestored = (): boolean => store().getBoolean('wallet.restored') ?? false
export const setRestored = (v: boolean): void => store().set('wallet.restored', v)

// --- account address: first-account public address, derived at creation (no auth needed to show it) ---
export const getAccountAddress = (): string | null => store().getString('account.address') ?? null
export const setAccountAddress = (a: string): void => store().set('account.address', a)
export const clearAccountAddress = (): void => void store().remove('account.address')

// --- lock: 30 s grace after a real background; cold start is locked ---
export type LockSettings = { graceSeconds: number }
export type LockState = { locked: boolean; backgroundedAt: number | null }

const DEFAULT_LOCK_SETTINGS: LockSettings = { graceSeconds: 30 }
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

// --- pending tx (ARCHITECTURE.md#invariants; send wiring is #23). amount is a decimal string, never a Number. ---
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
  /** Block of the receipt, once the network has one (S41 "블록" Fact row). */
  blockNumber?: number
  /** Derivation index of the sending account, saved at send time (S23/S41 "보낸 계정" = 계정 index + 1). Records saved before #32 have none, and the row is hidden. */
  accountIndex?: number
  state: 'Pending' | 'Unknown' | 'Included' | 'Confirmed' | 'Failed' | 'Replaced'
}

const STATES = new Set(['Pending', 'Unknown', 'Included', 'Confirmed', 'Failed', 'Replaced'])
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
    !isStr(o.hash) ||
    !isNum(o.nonce) ||
    !isStr(o.asset) ||
    !isStr(o.to) ||
    !isStr(o.amount) ||
    !isNum(o.createdAt) ||
    !isNum(o.lastCheckedAt) ||
    !STATES.has(o.state as string)
  )
    return null
  return {
    hash: o.hash,
    nonce: o.nonce,
    asset: o.asset,
    to: o.to,
    amount: o.amount,
    createdAt: o.createdAt,
    lastCheckedAt: o.lastCheckedAt,
    state: o.state as PendingTx['state'],
    ...(isStr(o.fee) ? { fee: o.fee } : {}),
    ...(isNum(o.blockNumber) ? { blockNumber: o.blockNumber } : {}),
    ...(o.failReason === 'outOfGas' ? { failReason: 'outOfGas' as const } : {}),
    ...(Number.isInteger(o.accountIndex) && (o.accountIndex as number) >= 0
      ? { accountIndex: o.accountIndex as number }
      : {}),
  }
}

export function getPendingTx(): PendingTx | null {
  const raw = store().getString('pendingTx')
  if (raw === undefined) return null
  const tx = parsePendingTx(raw)
  // A corrupt record must not read as "no pending tx": that would lift the send block (ADR-0006).
  if (!tx) throw new Error('kv: pendingTx record is corrupt')
  return tx
}
export function setPendingTx(tx: PendingTx | null): void {
  if (tx === null) store().remove('pendingTx')
  else store().set('pendingTx', JSON.stringify(tx))
}

// --- API install id (ARCHITECTURE.md#install-auth). The device key itself is in Keychain. ---
export const getInstallId = (): string | null => store().getString('api.installId') ?? null
export function setInstallId(id: string | null): void {
  if (id === null) store().remove('api.installId')
  else store().set('api.installId', id)
}

// --- last /v1/history result and when it was fetched (ADR-0007) ---
export function getHistoryCache(): HistoryCache | null {
  const raw = store().getString('history.cache')
  if (raw === undefined) return null
  try {
    const v = JSON.parse(raw) as Partial<HistoryCache>
    return typeof v.address === 'string' && typeof v.json === 'string' && typeof v.updatedAt === 'number'
      ? (v as HistoryCache)
      : null
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
function parseRecents(raw: string | undefined): RecentRecipient[] {
  if (raw === undefined) return []
  try {
    const v = JSON.parse(raw) as unknown
    if (!Array.isArray(v)) return []
    return (v as unknown[])
      .filter((x): x is RecentRecipient => {
        if (typeof x !== 'object' || x === null) return false
        const r = x as Record<string, unknown>
        return (
          typeof r.address === 'string' &&
          /^0x[0-9a-fA-F]{40}$/.test(r.address) &&
          typeof r.at === 'number' &&
          typeof r.asset === 'string' &&
          typeof r.amount === 'string'
        )
      })
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

// --- TanStack Query cache (ADR-0021): the persister reads and writes one JSON string here. Public chain data only (balances), never the phrase. ---
export const queryStorage = {
  getItem: (key: string): string | null => store().getString(`query.${key}`) ?? null,
  setItem: (key: string, value: string): void => store().set(`query.${key}`, value),
  removeItem: (key: string): void => void store().remove(`query.${key}`),
}
