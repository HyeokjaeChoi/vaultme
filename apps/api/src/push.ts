import { PUSH_CHANNEL_ID, PUSH_COPY, USDC_SEPOLIA, type PushData } from '@vaultme/contracts'
import { and, desc, eq, inArray, lt, notInArray } from 'drizzle-orm'
import { z } from 'zod'
import { nowSeconds } from './auth.ts'
import { getDb, runBatch, type BatchItem } from './db/index.ts'
import { installs, pushReceipts, pushSent, pushSubscriptions, pushUnregister } from './db/schema.ts'
import type { Env } from './env.ts'
import { UpstreamError } from './errors.ts'
import { logEvent } from './log.ts'
import { recordPushLatency, recordPushReceipt, recordPushTicket } from './metrics.ts'
import { proxyRpc } from './rpc.ts'
import { at } from './util.ts'

type Bindings = Env['Bindings']

const ALCHEMY_ADDRESSES_URL = 'https://dashboard.alchemy.com/api/update-webhook-addresses'
const EXPO_SEND_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts'
const UPSTREAM_TIMEOUT_MS = 8000
const NETWORK = 'ETH_SEPOLIA'

/** Subscriptions of installs not seen for this long are deleted (#67 decision 7). */
export const PUSH_INACTIVE_SECONDS = 30 * 24 * 3600
/** Installs not seen for this long are deleted by the cron (Q31). Nonces and any subscription cascade. */
const INSTALL_KEEP_SECONDS = 90 * 24 * 3600
const SENT_KEEP_SECONDS = 7 * 24 * 3600
/** Expo advises reading receipts 15 minutes after the send (Expo push docs, "Check push receipts"). Ids older than 7 days are purged regardless (Q31). */
const PUSH_RECEIPT_DELAY_SECONDS = 15 * 60
const RECEIPT_KEEP_SECONDS = 7 * 24 * 3600
const EXPO_RECEIPT_BATCH = 300 // getReceipts accepts at most 300 ids
const EXPO_BATCH = 100
const D1_MAX_PARAMS = 100

/** `[a, a, b]` -> `Map {a => 2, b => 1}`. */
const tally = (xs: string[]): Map<string, number> => {
  const m = new Map<string, number>()
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1)
  return m
}

/** Ticket and receipt errors Expo documents ("Push notification errors"). Anything else is `other`: Expo's text is not ours, so it never becomes a data point label or a log field. */
const EXPO_OUTCOMES = new Set([
  'ok',
  'error',
  'DeviceNotRegistered',
  'MessageTooBig',
  'MessageRateExceeded',
  'MismatchSenderId',
  'InvalidCredentials',
])
const outcomeLabel = (v: string): string => (EXPO_OUTCOMES.has(v) ? v : 'other')

const secret = (v: unknown): string => {
  // Fail closed (500) when a secret is missing.
  if (typeof v !== 'string' || v.length === 0) throw new Error('invalid push secret')
  return v
}

// ---- Alchemy webhook address list ----

/** Adds or removes addresses on the Notify webhook. Idempotent on Alchemy's side. Throws UpstreamError on failure. */
async function updateWebhookAddresses(env: Bindings, add: string[], remove: string[]): Promise<void> {
  const token = secret(env.ALCHEMY_NOTIFY_TOKEN)
  const webhookId = secret(env.ALCHEMY_WEBHOOK_ID)
  let res: Response
  try {
    res = await fetch(ALCHEMY_ADDRESSES_URL, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'X-Alchemy-Token': token },
      body: JSON.stringify({ webhook_id: webhookId, addresses_to_add: add, addresses_to_remove: remove }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch {
    throw new UpstreamError('alchemy unreachable') // never log the URL or token
  }
  if (!res.ok) throw new UpstreamError(`alchemy ${String(res.status)}`)
}

/** Removes addresses that no subscription uses any more. Rows in push_unregister stay until Alchemy confirms. */
async function flushUnregister(env: Bindings): Promise<void> {
  const db = getDb(env.DB)
  const subscribed = db.select({ address: pushSubscriptions.address }).from(pushSubscriptions)
  const rows = await db
    .select({ address: pushUnregister.address })
    .from(pushUnregister)
    .where(notInArray(pushUnregister.address, subscribed))
    .limit(100)
  const addresses = rows.map((r) => r.address)
  if (addresses.length > 0) {
    await updateWebhookAddresses(env, [], addresses)
    // At most 100 addresses (the LIMIT above), which is D1's bound-parameter limit per statement.
    await db.delete(pushUnregister).where(inArray(pushUnregister.address, addresses))
  }
  // An address that is subscribed again no longer needs removal.
  await db.delete(pushUnregister).where(inArray(pushUnregister.address, subscribed))
}

/** Queue removal first (so a failed Alchemy call is retried by cron), then try it now. Returns false when Alchemy failed. */
async function unregisterAddresses(env: Bindings, addresses: string[]): Promise<boolean> {
  if (addresses.length === 0) return true
  const db = getDb(env.DB)
  await runBatch(
    db,
    addresses.map((a) =>
      db.insert(pushUnregister).values({ address: a, createdAt: nowSeconds() }).onConflictDoNothing(),
    ),
  )
  try {
    await flushUnregister(env)
    return true
  } catch (e) {
    if (e instanceof UpstreamError) return false
    throw e
  }
}

// ---- subscription ----

/** Upserts the install's subscription and registers the address. Returns false when Alchemy failed (nothing is kept). */
export async function subscribe(
  env: Bindings,
  installId: string,
  address: string,
  expoToken: string,
): Promise<boolean> {
  const addr = address.toLowerCase()
  const db = getDb(env.DB)
  const old = await db
    .select({ address: pushSubscriptions.address })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.installId, installId))
    .get()
  try {
    await updateWebhookAddresses(env, [addr], [])
  } catch (e) {
    if (e instanceof UpstreamError) return false
    throw e
  }
  await db
    .insert(pushSubscriptions)
    .values({ installId, address: addr, expoToken, createdAt: nowSeconds() })
    .onConflictDoUpdate({ target: pushSubscriptions.installId, set: { address: addr, expoToken } }) // created_at stays
  // A new row for the same address cancels a queued removal.
  await db.delete(pushUnregister).where(eq(pushUnregister.address, addr))
  if (old && old.address !== addr) await unregisterAddresses(env, [old.address])
  return true
}

/** Deletes the subscription right away, then removes the address from Alchemy. Returns false when that last step failed (cron retries). */
export async function unsubscribe(env: Bindings, installId: string, onlyToken?: string): Promise<boolean> {
  // `onlyToken`: delete only while the install still has that token (a receipt of an old token must not remove a new subscription).
  const db = getDb(env.DB)
  const row = await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.installId, installId),
        onlyToken === undefined ? undefined : eq(pushSubscriptions.expoToken, onlyToken),
      ),
    )
    .returning({ address: pushSubscriptions.address })
    .get()
  if (row) {
    await db.batch([
      db.delete(pushSent).where(eq(pushSent.installId, installId)),
      db.delete(pushReceipts).where(eq(pushReceipts.installId, installId)),
    ])
    return unregisterAddresses(env, [row.address])
  }
  return true
}

/** Cron: expire inactive installs' subscriptions, delete installs idle for 90 days, retry failed removals, purge dedupe rows. */
export async function sweep(env: Bindings): Promise<void> {
  const now = nowSeconds()
  const db = getDb(env.DB)
  const inactive = db
    .select({ installId: pushSubscriptions.installId })
    .from(pushSubscriptions)
    .innerJoin(installs, eq(installs.id, pushSubscriptions.installId))
    .where(lt(installs.lastSeenAt, now - PUSH_INACTIVE_SECONDS))
  const expired = await db
    .delete(pushSubscriptions)
    .where(inArray(pushSubscriptions.installId, inactive))
    .returning({ installId: pushSubscriptions.installId, address: pushSubscriptions.address })
  // The dedupe rows hold install_id + tx hash: drop them (and the receipt ids) with the link (ADR-0022), not after their 7 days.
  if (expired.length)
    await runBatch(
      db,
      expired.flatMap((r) => [
        db.delete(pushSent).where(eq(pushSent.installId, r.installId)),
        db.delete(pushReceipts).where(eq(pushReceipts.installId, r.installId)),
      ]),
    )
  // After the subscription expiry above (30 d < 90 d), so no subscription is left to cascade without an Alchemy removal.
  await db.delete(installs).where(lt(installs.lastSeenAt, now - INSTALL_KEEP_SECONDS))
  await db.delete(pushSent).where(lt(pushSent.sentAt, now - SENT_KEEP_SECONDS))
  await db.delete(pushReceipts).where(lt(pushReceipts.createdAt, now - RECEIPT_KEEP_SECONDS))
  await unregisterAddresses(env, [...new Set(expired.map((r) => r.address))])
  await checkReceipts(env, now)
  await flushUnregister(env)
}

const ExpoReceipts = z.object({
  data: z.record(
    z.string(),
    z.object({ status: z.string(), details: z.object({ error: z.string() }).partial().nullish() }),
  ),
})

/**
 * Reads the Expo receipts of pushes sent at least 15 minutes ago. A `DeviceNotRegistered` receipt deletes the subscription
 * (only while the install still has the token that was pushed to). Every id Expo answered for is then deleted; an id with no receipt
 * yet stays for the next run (newest first, so ids Expo no longer knows cannot starve newer ones). An Expo failure keeps all ids (the 7-day purge bounds them) and never stops the rest of the sweep.
 */
async function checkReceipts(env: Bindings, now: number): Promise<void> {
  const db = getDb(env.DB)
  const rows = await db
    .select({ receiptId: pushReceipts.receiptId, installId: pushReceipts.installId, expoToken: pushReceipts.expoToken })
    .from(pushReceipts)
    .where(lt(pushReceipts.createdAt, now - PUSH_RECEIPT_DELAY_SECONDS))
    .orderBy(desc(pushReceipts.createdAt))
    .limit(1000)
  for (let i = 0; i < rows.length; i += EXPO_RECEIPT_BATCH) {
    const batch = rows.slice(i, i + EXPO_RECEIPT_BATCH)
    try {
      const res = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${secret(env.EXPO_ACCESS_TOKEN)}`,
        },
        body: JSON.stringify({ ids: batch.map((r) => r.receiptId) }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
      if (!res.ok) throw new Error(`expo ${String(res.status)}`)
      const parsed = ExpoReceipts.safeParse(await res.json())
      if (!parsed.success) throw new Error('expo receipt shape')
      const checked = batch.filter((r) => r.receiptId in parsed.data.data)
      const outcomes: string[] = []
      for (const r of checked) {
        const item = parsed.data.data[r.receiptId]
        const error = item?.details?.error
        outcomes.push(outcomeLabel(item?.status === 'ok' ? 'ok' : (error ?? item?.status ?? 'unknown')))
        if (error !== 'DeviceNotRegistered') continue
        await unsubscribe(env, r.installId, r.expoToken)
      }
      for (const [outcome, n] of tally(outcomes)) recordPushReceipt(env, outcome, n)
      logEvent('info', 'expo_receipts', { requested: batch.length, answered: checked.length })
      if (checked.length > 0)
        await runBatch(
          db,
          // Up to 300 ids: one statement each, as D1 binds at most 100 parameters per statement.
          checked.map((r) => db.delete(pushReceipts).where(eq(pushReceipts.receiptId, r.receiptId))),
        )
    } catch (e) {
      logEvent('error', 'expo_receipts_failed', { reason: e instanceof Error ? e.message : 'error' }) // retried by the next run
      return
    }
  }
}

// ---- webhook ----

const hexToBytes = (hex: string): Uint8Array<ArrayBuffer> | null =>
  /^(?:[0-9a-f]{2})+$/i.test(hex) ? Uint8Array.from(hex.match(/../g) ?? [], (h) => Number.parseInt(h, 16)) : null

/** X-Alchemy-Signature = hex HMAC-SHA256(signing key, raw body). Compared in constant time by WebCrypto. */
export async function verifyAlchemySignature(
  env: Bindings,
  rawBody: string,
  header: string | undefined,
): Promise<boolean> {
  const key = secret(env.ALCHEMY_SIGNING_KEY)
  const sig = hexToBytes(header ?? '')
  if (!sig) return false
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify('HMAC', k, sig, new TextEncoder().encode(rawBody))
}

const Activity = z.object({
  hash: z.string(),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
  value: z.number().nullish(),
  asset: z.string().nullish(),
  category: z.string(),
  rawContract: z.object({ address: z.string().nullish(), rawValue: z.string().nullish() }).partial().nullish(),
  log: z.object({ logIndex: z.string().optional(), removed: z.boolean().optional() }).partial().nullish(),
  blockNum: z.string().optional(),
})
export const AlchemyPayload = z.object({
  webhookId: z.string(),
  type: z.string(),
  event: z.object({ network: z.string(), activity: z.array(Activity) }),
})

/** `own`: the address sent this tx (also when a received leg won the kind): its receipt is read. `probe`: an own zero-value tx. It is pushed only if its receipt says it failed (a reverted token call moves nothing, so it has no transfer leg). */
type Notification = {
  address: string
  kind: PushData['kind']
  hash: string
  ref: string
  probe?: true
  own?: true
  blockNum?: string // hex block number of the activity: its block timestamp is the canonical time of the push (Q26)
}

const isZero = (rawValue: string | null | undefined, value: number | null | undefined): boolean => {
  if (rawValue) {
    try {
      return BigInt(rawValue) === 0n
    } catch {
      return true // unreadable amount: treat as no value
    }
  }
  return !value || value <= 0
}

/**
 * Turns Alchemy activity into notifications for subscribed addresses. Pure.
 * Skips removed (reorged) logs, zero-value transfers, and anything other than ETH or USDC (#67 decision 6).
 * Token symbols are chosen by the token contract, so USDC is matched by contract address, never by symbol.
 */
function notificationsFor(payload: z.infer<typeof AlchemyPayload>, subscribed: ReadonlySet<string>): Notification[] {
  if (payload.type !== 'ADDRESS_ACTIVITY' || payload.event.network !== NETWORK) return []
  const out = new Map<string, Notification>()
  for (const a of payload.event.activity) {
    if (a.log?.removed) continue
    let ok = false
    let probe = false
    if (a.category === 'external' || a.category === 'internal') {
      ok = a.asset === 'ETH' && !isZero(a.rawContract?.rawValue, a.value)
      probe = a.category === 'external' && a.asset === 'ETH' && !ok
    } else if (a.category === 'token' || a.category === 'erc20')
      ok =
        a.rawContract?.address?.toLowerCase() === USDC_SEPOLIA.toLowerCase() && !isZero(a.rawContract.rawValue, a.value)
    if (!(ok || probe) || !/^0x[0-9a-fA-F]{64}$/.test(a.hash)) continue
    const from = a.fromAddress?.toLowerCase()
    const to = a.toAddress?.toLowerCase()
    const hash = a.hash.toLowerCase()
    // One notification per (address, tx), and the hash is the push_sent ref, so a later webhook with another leg of the same tx stays silent.
    // Received wins over sent, whatever the activity order: a self-send is a deposit, and a tx with an incoming and an outgoing leg is a deposit.
    // Known limit: if the send leg arrives in an earlier webhook than the deposit leg, the push says send.
    for (const [addr, kind] of [
      [to, 'deposit'],
      [from, 'send'],
    ] as const) {
      if (!addr || !subscribed.has(addr) || (probe && kind === 'deposit')) continue
      const key = `${addr}:${hash}`
      const prev = out.get(key)
      if (prev?.kind === 'deposit' || (prev && probe && !prev.probe)) {
        if (!prev.blockNum && a.blockNum) prev.blockNum = a.blockNum // the kept leg has no block: take it from a later leg of the same tx
        continue
      }
      out.set(key, {
        address: addr,
        kind,
        hash,
        ref: hash,
        ...(probe ? { probe: true as const } : {}),
        ...(from === addr ? { own: true as const } : {}),
        ...(a.blockNum ? { blockNum: a.blockNum } : {}),
      })
    }
  }
  return [...out.values()]
}

const Receipt = z.object({
  result: z.object({ status: z.enum(['0x0', '0x1']) }).nullish(),
  error: z.unknown().optional(),
})

/**
 * Every notified tx is looked up on the chain (one `eth_getTransactionReceipt` per hash, through the RPC proxy; deposits too, ADR-0026):
 * receipt status 0x0 turns the push into `failed` (#314, Q23/Q24), also when a received leg won the kind (a self-send).
 * A zero-value probe that did not fail is dropped.
 * `failed` has its own `push_sent` ref (`<hash>:failed`): after a reorg the same hash can revert although a `send` push went out (#345), and the failure must still be pushed.
 * A hash whose receipt cannot be read (chain down, RPC error, no receipt yet, unknown status; Alchemy reports mined txs, so a missing receipt
 * is a lagging node) is left out and not claimed, and `unreadable` is true: the caller answers 5xx after it has sent the other pushes, so
 * Alchemy retries and a retry can still push `failed`.
 */
async function withFailures(
  env: Bindings,
  notes: Notification[],
): Promise<{ notes: Notification[]; unreadable: boolean }> {
  const hashes = [...new Set(notes.map((n) => n.hash))] // deposits too (ADR-0026): an incoming ETH leg has no `log`, so a reorg cannot mark it removed
  const failed = new Set<string>()
  const unreadable = new Set<string>()
  await Promise.all(
    hashes.map(async (hash) => {
      try {
        const text = await proxyRpc(env, {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionReceipt',
          params: [hash],
        })
        const r = text === null ? null : Receipt.safeParse(JSON.parse(text))
        if (!r?.success || r.data.error !== undefined || !r.data.result) throw new Error('no receipt')
        if (r.data.result.status === '0x0') failed.add(hash)
      } catch {
        unreadable.add(hash)
      }
    }),
  )
  return {
    notes: notes
      .filter((n) => !unreadable.has(n.hash) && (!n.probe || failed.has(n.hash)))
      .map((n) =>
        failed.has(n.hash) && (n.kind === 'send' || n.own)
          ? { ...n, kind: 'failed' as const, ref: `${n.hash}:failed` }
          : n,
      ),
    unreadable: unreadable.size > 0,
  }
}

const ExpoTickets = z.object({
  data: z.array(
    z.object({
      status: z.string(),
      id: z.string().optional(),
      details: z.object({ error: z.string().optional() }).partial().nullish(),
    }),
  ),
})

const BlockTime = z.object({ result: z.object({ timestamp: z.string() }) })

/** Runs background work after the answer: `waitUntil` in the route, awaited where there is no execution context (unit tests). */
type After = (work: Promise<void>) => Promise<void> | void

/** An accepted push: when Expo took it (ms) and the block it is for. */
type Handoff = { kind: PushData['kind']; blockNum: string | undefined; at: number }

/**
 * Q26: seconds from the block timestamp of the event the push is for (the canonical time) to the Expo hand-off.
 * The block is read after the send, and the caller runs this after the answer (`after`), so it delays neither a push, the release of an unsent claim nor the answer to Alchemy.
 * Never throws: a block that cannot be read only loses its data point.
 */
async function recordLatencies(env: Bindings, handoffs: Handoff[]): Promise<void> {
  const stamps = new Map<string, number>()
  await Promise.all(
    [...new Set(handoffs.flatMap((h) => (h.blockNum ? [h.blockNum] : [])))].map(async (blockNum) => {
      try {
        const text = await proxyRpc(env, {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBlockByNumber',
          params: [blockNum, false],
        })
        const r = BlockTime.safeParse(JSON.parse(text ?? 'null'))
        if (r.success) stamps.set(blockNum, Number(BigInt(r.data.result.timestamp)))
      } catch {
        // logged below as unavailable
      }
    }),
  )
  // One line and one data point per (kind, block, batch): pushes of one batch for one block share their latency (250 points per invocation).
  const groups = new Map<string, { h: Handoff; n: number }>()
  for (const h of handoffs) {
    const key = `${h.kind}|${h.blockNum ?? ''}|${String(h.at)}`
    const g = groups.get(key)
    if (g) g.n += 1
    else groups.set(key, { h, n: 1 })
  }
  for (const { h, n } of groups.values()) {
    const stamp = h.blockNum ? stamps.get(h.blockNum) : undefined
    if (stamp === undefined) {
      logEvent('warn', 'push_latency_unavailable', { kind: h.kind, pushes: n })
      continue
    }
    // Block timestamps are whole seconds from a validator clock: a hand-off a moment "before" its block is skew, not a negative latency.
    const seconds = Math.max(0, h.at / 1000 - stamp)
    logEvent('info', 'push_latency', { kind: h.kind, seconds: Math.round(seconds * 10) / 10, pushes: n })
    recordPushLatency(env, h.kind, seconds, n)
  }
}

/**
 * Handles one verified webhook body. Throws UpstreamError when Expo failed so the route can answer 5xx and Alchemy retries;
 * push_sent keeps a retry from notifying twice.
 */
export async function handleActivity(
  env: Bindings,
  payload: z.infer<typeof AlchemyPayload>,
  after: After = (work) => work.then(() => undefined),
): Promise<void> {
  const expoToken = secret(env.EXPO_ACCESS_TOKEN)
  if (payload.webhookId !== secret(env.ALCHEMY_WEBHOOK_ID)) return
  // One line per delivery (count and categories, no address or hash): shows in Workers Logs whether legs of one tx arrive apart (#183).
  logEvent('info', 'alchemy_activity', {
    activities: payload.event.activity.length,
    categories: [...new Set(payload.event.activity.map((a) => a.category))].join(','),
  })
  const addresses = new Set(
    payload.event.activity
      .flatMap((a) => [a.fromAddress, a.toAddress])
      .filter((x): x is string => !!x)
      .map((x) => x.toLowerCase()),
  )
  if (addresses.size === 0) return
  const list = [...addresses]
  // D1 allows 100 bound parameters per statement, and one payload can carry more addresses than that.
  const db = getDb(env.DB)
  const subs: { installId: string; address: string; expoToken: string }[] = []
  for (let i = 0; i < list.length; i += D1_MAX_PARAMS) {
    const chunk = list.slice(i, i + D1_MAX_PARAMS)
    subs.push(
      ...(await db
        .select({
          installId: pushSubscriptions.installId,
          address: pushSubscriptions.address,
          expoToken: pushSubscriptions.expoToken,
        })
        .from(pushSubscriptions)
        .where(inArray(pushSubscriptions.address, chunk))),
    )
  }
  // Counts only (no address or token): shows in Workers Logs where a delivery stopped before Expo (#263).
  if (subs.length === 0) {
    logEvent('info', 'push_outcome', { subs: 0, notes: 0, jobs: 0 })
    return
  }
  const checked = await withFailures(env, notificationsFor(payload, new Set(subs.map((s) => s.address))))
  const { notes } = checked

  // Claim first, then send: Alchemy can deliver two legs of one tx as separate webhooks at the same moment, and a
  // check-then-insert let both runs send. INSERT OR IGNORE is atomic, so only the first claimer sends (its kind wins,
  // which may be send). A claim whose send fails is released below, so Alchemy's retry still works.
  const pairs = notes.flatMap((note) => subs.filter((s) => s.address === note.address).map((sub) => ({ sub, note })))
  const outcome = (jobs: number) => logEvent('info', 'push_outcome', { subs: subs.length, notes: notes.length, jobs })
  if (pairs.length === 0) {
    outcome(0)
    if (checked.unreadable) throw new UpstreamError('rpc receipt') // retried by Alchemy
    return
  }
  const claims = await runBatch(
    db,
    pairs.map(({ sub, note }) =>
      db
        .insert(pushSent)
        .values({ installId: sub.installId, ref: note.ref, sentAt: nowSeconds() })
        .onConflictDoNothing(),
    ),
  )
  const jobs = pairs.filter((_, i) => claims[i]?.meta.changes === 1)
  outcome(jobs.length) // jobs=0 with notes>0: already claimed (sent before)
  const unsettled = new Set(jobs)
  const dead: string[] = []
  let ticketFailed = false
  const handoffs: Handoff[] = []
  try {
    for (let i = 0; i < jobs.length; i += EXPO_BATCH) {
      const batch = jobs.slice(i, i + EXPO_BATCH)
      let res: Response
      try {
        res = await fetch(EXPO_SEND_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            authorization: `Bearer ${expoToken}`,
          },
          body: JSON.stringify(
            batch.map(({ sub, note }) => ({
              to: sub.expoToken,
              ...PUSH_COPY[note.kind],
              channelId: PUSH_CHANNEL_ID,
              sound: 'default',
              data: { kind: note.kind } satisfies PushData,
            })),
          ),
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        })
      } catch {
        throw new UpstreamError('expo unreachable')
      }
      const handedOffAt = Date.now() // Expo has the batch: the end of the Q26 latency
      if (res.status === 429 || res.status >= 500) throw new UpstreamError(`expo ${String(res.status)}`)
      if (!res.ok) {
        // Our own request is wrong (400) or the access token is (401): retrying cannot help.
        logEvent('error', 'expo_rejected', { status: res.status })
        continue
      }
      const tickets = ExpoTickets.safeParse(await res.json().catch(() => null))
      if (!tickets.success || tickets.data.data.length !== batch.length) throw new UpstreamError('expo ticket shape')
      // Receipt ids (ok) or error codes: an accepted push that never arrives is then looked up in Expo's receipts (#263).
      const outcomes = tickets.data.data.map((t) =>
        outcomeLabel(t.status === 'ok' ? 'ok' : (t.details?.error ?? t.status)),
      )
      for (const [outcome, n] of tally(outcomes)) recordPushTicket(env, outcome, n)
      logEvent('info', 'expo_tickets', {
        ok: outcomes.filter((o) => o === 'ok').length,
        errors: outcomes.filter((o) => o !== 'ok').join(','),
        receipt_ids: tickets.data.data.flatMap((t) => (t.status === 'ok' && t.id ? [t.id] : [])).join(','),
      })
      // Only accepted tickets (and dead tokens, which are deleted below) count as sent. Any other ticket error stays retryable.
      const settled: typeof batch = []
      const receipts: BatchItem<'sqlite'>[] = []
      for (const [j, t] of tickets.data.data.entries()) {
        const sent = at(batch, j) // lengths are equal, checked above
        if (t.status === 'ok') {
          settled.push(sent)
          handoffs.push({ kind: sent.note.kind, blockNum: sent.note.blockNum, at: handedOffAt })
          // Expo receipts are read by the cron, 15 minutes later (#314, Q39).
          if (t.id)
            receipts.push(
              db
                .insert(pushReceipts)
                .values({
                  receiptId: t.id,
                  installId: sent.sub.installId,
                  expoToken: sent.sub.expoToken,
                  createdAt: nowSeconds(),
                })
                .onConflictDoNothing(),
            )
        } else if (t.details?.error === 'DeviceNotRegistered') {
          dead.push(sent.sub.installId)
          settled.push(sent)
        } else ticketFailed = true
      }
      for (const j of settled) unsettled.delete(j)
      // A side record: a D1 failure here must not stop the send loop or the DeviceNotRegistered cleanup (lost ids only skip a receipt check).
      if (receipts.length > 0)
        await runBatch(db, receipts).catch(() => logEvent('error', 'push_receipt_ids_not_stored'))
    }
  } finally {
    // Not sent (Expo failed, rejected, or ticket error): release the claim so the retry can send.
    const release = [...unsettled].map(({ sub, note }) =>
      db.delete(pushSent).where(and(eq(pushSent.installId, sub.installId), eq(pushSent.ref, note.ref))),
    )
    try {
      if (release.length > 0) await runBatch(db, release)
    } finally {
      await after(recordLatencies(env, handoffs)) // after the claims are released
    }
  }
  // The token is invalid: delete the subscription and the address at once (#67 decision 7).
  for (const id of new Set(dead)) await unsubscribe(env, id)
  if (checked.unreadable) throw new UpstreamError('rpc receipt') // the other pushes are claimed, so the retry sends only the unread tx
  if (ticketFailed) throw new UpstreamError('expo ticket error') // push_sent keeps the retry from notifying the others twice
}
