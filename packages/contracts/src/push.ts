import { z } from 'zod'

// Transaction push (#67). The server stores one subscription per install: address + Expo push token.
export const ExpoPushToken = z.string().regex(/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{8,64}\]$/)
export const PushAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/)

export const PushSubscribeRequest = z
  .object({ address: PushAddress, expoToken: ExpoPushToken })
  .meta({ id: 'PushSubscribeRequest' })
export const PushOkResponse = z.object({ ok: z.literal(true) }).meta({ id: 'PushOkResponse' })

/** Push payload `data`. The app ignores anything else and re-reads the chain (ARCHITECTURE.md#security-model). */
export const PUSH_KINDS = ['deposit', 'send'] as const
export const PushData = z.object({ kind: z.enum(PUSH_KINDS), hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) })
export type PushData = z.infer<typeof PushData>

/** Lock-screen text carries no amount and no address (#67 decision 4). */
export const PUSH_COPY = {
  deposit: { title: 'VaultMe', body: '입금이 들어왔어요. 앱에서 확인해 주세요.' },
  send: { title: 'VaultMe', body: '보낸 거래가 처리됐어요. 앱에서 확인해 주세요.' },
} as const
