import fc from 'fast-check'
import { describe, expect, test, vi } from 'vitest'
import { canStartDraft, reduce, type SendEvent, type SendState } from '../src'

const H = `0x${'ab'.repeat(32)}` as const
const run = (s: SendState, ...es: SendEvent[]) => es.reduce<SendState>((st, e) => reduce(st, e), s)
const draft: SendState = { status: 'Draft' }
const submitting = run(
  draft,
  { type: 'REVIEW', requiresAck: false },
  { type: 'CONFIRM', ack: false },
  { type: 'AUTH_OK' },
)

describe('reduce: transaction state table (ARCHITECTURE.md#invariants)', () => {
  test('happy path to Confirmed', () => {
    const s = run(submitting, { type: 'SUBMITTED', hash: H }, { type: 'RECEIPT', ok: true }, { type: 'SAFE', ok: true })
    expect(s).toEqual({ status: 'Confirmed', hash: H })
  })
  test('rows', () => {
    const rev: SendState = { status: 'Reviewing', blocked: false, requiresAck: false }
    expect(reduce(draft, { type: 'INPUT_VALID' }).status).toBe('Draft')
    expect(reduce(rev, { type: 'EDIT' }).status).toBe('Draft')
    expect(reduce(rev, { type: 'CONFIRM', ack: false }).status).toBe('Authenticating')
    const auth = reduce(rev, { type: 'CONFIRM', ack: false })
    expect(reduce(auth, { type: 'AUTH_FAIL' }).status).toBe('Reviewing')
    expect(reduce(auth, { type: 'AUTH_CANCEL' }).status).toBe('Reviewing')
    expect(reduce(submitting, { type: 'FEE_CAP_EXCEEDED' })).toMatchObject({ status: 'Reviewing', blocked: false })
    expect(reduce(submitting, { type: 'ABS_CAP_EXCEEDED' })).toMatchObject({ status: 'Reviewing', blocked: true })
    expect(reduce(submitting, { type: 'SUBMIT_UNKNOWN', hash: H })).toEqual({ status: 'Unknown', hash: H })
  })
  test('lookalike needs explicit ack; blocked Reviewing cannot confirm', () => {
    const rev: SendState = { status: 'Reviewing', blocked: false, requiresAck: true }
    expect(reduce(rev, { type: 'CONFIRM', ack: false })).toBe(rev)
    expect(reduce(rev, { type: 'CONFIRM', ack: true }).status).toBe('Authenticating')
    const blocked = reduce(submitting, { type: 'ABS_CAP_EXCEEDED' })
    expect(reduce(blocked, { type: 'CONFIRM', ack: true })).toBe(blocked)
  })
  test.each(['Pending', 'Unknown'] as const)('%s: receipt, replaced, timeout', (status) => {
    const s: SendState = { status, hash: H }
    expect(reduce(s, { type: 'RECEIPT', ok: true }).status).toBe('Included')
    expect(reduce(s, { type: 'RECEIPT', ok: false }).status).toBe('Included')
    expect(reduce(s, { type: 'NONCE_PASSED_NO_RECEIPT' }).status).toBe('Replaced')
    const hook = vi.fn()
    expect(reduce(s, { type: 'TIMEOUT' }, hook)).toBe(s)
    expect(hook).not.toHaveBeenCalled() // listed no-op, not an error
  })
  test('Included: SAFE ok/reverted, REORGED', () => {
    const s: SendState = { status: 'Included', hash: H }
    expect(reduce(s, { type: 'SAFE', ok: true }).status).toBe('Confirmed')
    expect(reduce(s, { type: 'SAFE', ok: false }).status).toBe('Failed')
    expect(reduce(s, { type: 'REORGED' })).toEqual({ status: 'Pending', hash: H })
  })
  test('unknown transition: unchanged, hook called, no throw', () => {
    const hook = vi.fn()
    expect(reduce(draft, { type: 'AUTH_OK' }, hook)).toBe(draft)
    expect(hook).toHaveBeenCalledWith(draft, { type: 'AUTH_OK' })
    const done: SendState = { status: 'Confirmed', hash: H }
    expect(reduce(done, { type: 'REORGED' })).toBe(done)
    expect(() => reduce(done, { type: 'EDIT' })).not.toThrow()
  })
})

describe('canStartDraft', () => {
  test('blocked only by Pending / Unknown', () => {
    expect(canStartDraft([])).toBe(true)
    expect(canStartDraft([{ status: 'Pending', hash: H }])).toBe(false)
    expect(canStartDraft([{ status: 'Unknown', hash: H }])).toBe(false)
    expect(canStartDraft([{ status: 'Included', hash: H }, { status: 'Confirmed', hash: H }, draft])).toBe(true)
  })
  const event: fc.Arbitrary<SendEvent> = fc.oneof(
    fc.constantFrom<SendEvent>(
      { type: 'INPUT_VALID' },
      { type: 'EDIT' },
      { type: 'AUTH_OK' },
      { type: 'AUTH_FAIL' },
      { type: 'AUTH_CANCEL' },
      { type: 'FEE_CAP_EXCEEDED' },
      { type: 'ABS_CAP_EXCEEDED' },
      { type: 'REORGED' },
      { type: 'NONCE_PASSED_NO_RECEIPT' },
      { type: 'TIMEOUT' },
      { type: 'SUBMITTED', hash: H },
      { type: 'SUBMIT_UNKNOWN', hash: H },
    ),
    fc.boolean().map<SendEvent>((requiresAck) => ({ type: 'REVIEW', requiresAck })),
    fc.boolean().map<SendEvent>((ack) => ({ type: 'CONFIRM', ack })),
    fc.boolean().map<SendEvent>((ok) => ({ type: 'RECEIPT', ok })),
    fc.boolean().map<SendEvent>((ok) => ({ type: 'SAFE', ok })),
  )
  test('random event sequences: Pending/Unknown always block, and only exit via receipt/replaced (property)', () => {
    fc.assert(
      fc.property(fc.array(event, { maxLength: 60 }), (events) => {
        let s: SendState = draft
        for (const e of events) {
          const next = reduce(s, e)
          if (s.status === 'Pending' || s.status === 'Unknown') {
            expect(['Pending', 'Unknown', 'Included', 'Replaced']).toContain(next.status)
          }
          s = next
          expect(canStartDraft([s])).toBe(s.status !== 'Pending' && s.status !== 'Unknown')
        }
      }),
      { numRuns: 500 },
    )
  })
})
