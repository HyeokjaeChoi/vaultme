import { PUSH_COPY, USDC_SEPOLIA, type PushData } from '@vaultme/contracts'
import { z } from 'zod'
import { nowSeconds } from './auth.ts'
import type { Env } from './env.ts'
import { UpstreamError } from './errors.ts'

type Bindings = Env['Bindings']

const ALCHEMY_ADDRESSES_URL = 'https://dashboard.alchemy.com/api/update-webhook-addresses'
const EXPO_SEND_URL = 'https://exp.host/--/api/v2/push/send'
const UPSTREAM_TIMEOUT_MS = 8000
const NETWORK = 'ETH_SEPOLIA'

/** Subscriptions of installs not seen for this long are deleted (#67 decision 7). */
export const PUSH_INACTIVE_SECONDS = 30 * 24 * 3600
const SENT_KEEP_SECONDS = 7 * 24 * 3600
const EXPO_BATCH = 100
const D1_MAX_PARAMS = 100

const secret = (v: unknown): string => {
  // Fail closed (500) when a secret is missing.
  if (typeof v !== 'string' || v.length === 0) throw new Error('invalid push secret')
  return v
}

// ---- Alchemy webhook address list ----

/** Adds or removes addresses on the Notify webhook. Idempotent on Alchemy's side. Throws UpstreamError on failure. */
export async function updateWebhookAddresses(env: Bindings, add: string[], remove: string[]): Promise<void> {
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
  if (!res.ok) throw new UpstreamError(`alchemy ${res.status}`)
}

/** Removes addresses that no subscription uses any more. Rows in push_unregister stay until Alchemy confirms. */
export async function flushUnregister(env: Bindings): Promise<void> {
  const rows = await env.DB.prepare(
    'SELECT address FROM push_unregister WHERE address NOT IN (SELECT address FROM push_subscriptions) LIMIT 100',
  ).all<{ address: string }>()
  const addresses = rows.results.map((r) => r.address)
  if (addresses.length > 0) {
    await updateWebhookAddresses(env, [], addresses)
    await env.DB.batch(addresses.map((a) => env.DB.prepare('DELETE FROM push_unregister WHERE address = ?').bind(a)))
  }
  // An address that is subscribed again no longer needs removal.
  await env.DB.prepare('DELETE FROM push_unregister WHERE address IN (SELECT address FROM push_subscriptions)').run()
}

/** Queue removal first (so a failed Alchemy call is retried by cron), then try it now. Returns false when Alchemy failed. */
export async function unregisterAddresses(env: Bindings, addresses: string[]): Promise<boolean> {
  if (addresses.length === 0) return true
  await env.DB.batch(
    addresses.map((a) => env.DB.prepare('INSERT OR IGNORE INTO push_unregister (address, created_at) VALUES (?, ?)').bind(a, nowSeconds())),
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
export async function subscribe(env: Bindings, installId: string, address: string, expoToken: string): Promise<boolean> {
  const addr = address.toLowerCase()
  const old = await env.DB.prepare('SELECT address FROM push_subscriptions WHERE install_id = ?')
    .bind(installId)
    .first<{ address: string }>()
  try {
    await updateWebhookAddresses(env, [addr], [])
  } catch (e) {
    if (e instanceof UpstreamError) return false
    throw e
  }
  await env.DB.prepare(
    'INSERT INTO push_subscriptions (install_id, address, expo_token, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (install_id) DO UPDATE SET address = excluded.address, expo_token = excluded.expo_token',
  )
    .bind(installId, addr, expoToken, nowSeconds())
    .run()
  // A new row for the same address cancels a queued removal.
  await env.DB.prepare('DELETE FROM push_unregister WHERE address = ?').bind(addr).run()
  if (old && old.address !== addr) await unregisterAddresses(env, [old.address])
  return true
}

/** Deletes the subscription right away, then removes the address from Alchemy. Returns false when that last step failed (cron retries). */
export async function unsubscribe(env: Bindings, installId: string): Promise<boolean> {
  const row = await env.DB.prepare('DELETE FROM push_subscriptions WHERE install_id = ? RETURNING address')
    .bind(installId)
    .first<{ address: string }>()
  if (row) {
    await env.DB.prepare('DELETE FROM push_sent WHERE install_id = ?').bind(installId).run()
    return unregisterAddresses(env, [row.address])
  }
  return true
}

/** Cron: expire inactive installs' subscriptions, retry failed removals, purge dedupe rows. */
export async function sweep(env: Bindings): Promise<void> {
  const now = nowSeconds()
  const expired = await env.DB.prepare(
    'DELETE FROM push_subscriptions WHERE install_id IN (SELECT s.install_id FROM push_subscriptions s JOIN installs i ON i.id = s.install_id WHERE i.last_seen_at < ?) RETURNING address',
  )
    .bind(now - PUSH_INACTIVE_SECONDS)
    .all<{ address: string }>()
  await env.DB.prepare('DELETE FROM push_sent WHERE sent_at < ?').bind(now - SENT_KEEP_SECONDS).run()
  await unregisterAddresses(env, [...new Set(expired.results.map((r) => r.address))])
  await flushUnregister(env)
}

// ---- webhook ----

const hexToBytes = (hex: string): Uint8Array<ArrayBuffer> | null =>
  /^(?:[0-9a-f]{2})+$/i.test(hex) ? Uint8Array.from(hex.match(/../g)!, (h) => Number.parseInt(h, 16)) : null

/** X-Alchemy-Signature = hex HMAC-SHA256(signing key, raw body). Compared in constant time by WebCrypto. */
export async function verifyAlchemySignature(env: Bindings, rawBody: string, header: string | undefined): Promise<boolean> {
  const key = secret(env.ALCHEMY_SIGNING_KEY)
  const sig = hexToBytes(header ?? '')
  if (!sig) return false
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
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
})
export const AlchemyPayload = z.object({
  webhookId: z.string(),
  type: z.string(),
  event: z.object({ network: z.string(), activity: z.array(Activity) }),
})

export type Notification = { address: string; kind: PushData['kind']; hash: string; ref: string }

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
export function notificationsFor(payload: z.infer<typeof AlchemyPayload>, subscribed: ReadonlySet<string>): Notification[] {
  if (payload.type !== 'ADDRESS_ACTIVITY' || payload.event.network !== NETWORK) return []
  const out = new Map<string, Notification>()
  for (const a of payload.event.activity) {
    if (a.log?.removed) continue
    let ok = false
    if (a.category === 'external' || a.category === 'internal') ok = a.asset === 'ETH' && isZero(a.rawContract?.rawValue, a.value) === false
    else if (a.category === 'token' || a.category === 'erc20')
      ok = a.rawContract?.address?.toLowerCase() === USDC_SEPOLIA.toLowerCase() && !isZero(a.rawContract?.rawValue, a.value)
    if (!ok || !/^0x[0-9a-fA-F]{64}$/.test(a.hash)) continue
    const from = a.fromAddress?.toLowerCase()
    const to = a.toAddress?.toLowerCase()
    const ref = `${a.hash.toLowerCase()}:${a.log?.logIndex ?? a.category}`
    // Received wins over sent: a self-send is a deposit as well, and one tx never pushes twice to an address.
    for (const [addr, kind] of [[to, 'deposit'], [from, 'send']] as const) {
      if (addr && subscribed.has(addr) && !out.has(`${addr}:${ref}`)) out.set(`${addr}:${ref}`, { address: addr, kind, hash: a.hash.toLowerCase(), ref })
    }
  }
  return [...out.values()]
}

const ExpoTickets = z.object({
  data: z.array(z.object({ status: z.string(), details: z.object({ error: z.string().optional() }).partial().nullish() })),
})

/**
 * Handles one verified webhook body. Throws UpstreamError when Expo failed so the route can answer 5xx and Alchemy retries;
 * push_sent keeps a retry from notifying twice.
 */
export async function handleActivity(env: Bindings, payload: z.infer<typeof AlchemyPayload>): Promise<void> {
  const expoToken = secret(env.EXPO_ACCESS_TOKEN)
  if (payload.webhookId !== secret(env.ALCHEMY_WEBHOOK_ID)) return
  const addresses = new Set(
    payload.event.activity.flatMap((a) => [a.fromAddress, a.toAddress]).filter((x): x is string => !!x).map((x) => x.toLowerCase()),
  )
  if (addresses.size === 0) return
  const list = [...addresses]
  // D1 allows 100 bound parameters per statement, and one payload can carry more addresses than that.
  type Subscription = { install_id: string; address: string; expo_token: string }
  const subs: { results: Subscription[] } = { results: [] }
  for (let i = 0; i < list.length; i += D1_MAX_PARAMS) {
    const chunk = list.slice(i, i + D1_MAX_PARAMS)
    const rows = await env.DB.prepare(
      `SELECT install_id, address, expo_token FROM push_subscriptions WHERE address IN (${chunk.map(() => '?').join(',')})`,
    )
      .bind(...chunk)
      .all<Subscription>()
    subs.results.push(...rows.results)
  }
  if (subs.results.length === 0) return
  const notes = notificationsFor(payload, new Set(subs.results.map((s) => s.address)))

  const jobs: { sub: (typeof subs.results)[number]; note: Notification }[] = []
  for (const note of notes) {
    for (const sub of subs.results) {
      if (sub.address !== note.address) continue
      const seen = await env.DB.prepare('SELECT 1 AS x FROM push_sent WHERE install_id = ? AND ref = ?').bind(sub.install_id, note.ref).first()
      if (!seen) jobs.push({ sub, note })
    }
  }
  const dead: string[] = []
  let ticketFailed = false
  for (let i = 0; i < jobs.length; i += EXPO_BATCH) {
    const batch = jobs.slice(i, i + EXPO_BATCH)
    let res: Response
    try {
      res = await fetch(EXPO_SEND_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${expoToken}` },
        body: JSON.stringify(
          batch.map(({ sub, note }) => ({
            to: sub.expo_token,
            ...PUSH_COPY[note.kind],
            sound: 'default',
            data: { kind: note.kind, hash: note.hash } satisfies PushData,
          })),
        ),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
    } catch {
      throw new UpstreamError('expo unreachable')
    }
    if (res.status === 429 || res.status >= 500) throw new UpstreamError(`expo ${res.status}`)
    if (!res.ok) {
      // Our own request is wrong (400) or the access token is (401): retrying cannot help.
      console.error('expo rejected push', res.status)
      continue
    }
    const tickets = ExpoTickets.safeParse(await res.json().catch(() => null))
    if (!tickets.success || tickets.data.data.length !== batch.length) throw new UpstreamError('expo ticket shape')
    // Only accepted tickets (and dead tokens, which are deleted below) count as sent. Any other ticket error stays retryable.
    const settled: typeof batch = []
    tickets.data.data.forEach((t, j) => {
      if (t.status === 'ok') settled.push(batch[j]!)
      else if (t.details?.error === 'DeviceNotRegistered') {
        dead.push(batch[j]!.sub.install_id)
        settled.push(batch[j]!)
      } else ticketFailed = true
    })
    if (settled.length > 0)
      await env.DB.batch(
        settled.map(({ sub, note }) =>
          env.DB.prepare('INSERT OR IGNORE INTO push_sent (install_id, ref, sent_at) VALUES (?, ?, ?)').bind(sub.install_id, note.ref, nowSeconds()),
        ),
      )
  }
  // The token is invalid: delete the subscription and the address at once (#67 decision 7).
  for (const id of new Set(dead)) await unsubscribe(env, id)
  if (ticketFailed) throw new UpstreamError('expo ticket error') // push_sent keeps the retry from notifying the others twice
}

