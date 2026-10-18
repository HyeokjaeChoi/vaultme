import { expect, it } from 'vitest'
import { review } from '../src/entities/transaction/fixtures'
import { resolveReview } from '../src/entities/transaction/review'

it('falls back to the fixture when params are missing or malformed', () => {
  const r = resolveReview()
  expect(r).toMatchObject({ recipient: review.recipient, previous: null, amount: '0.05 ETH', total: '0.050042 ETH' })
  expect(resolveReview('nope', 'abc').recipient).toBe(review.recipient)
  expect(resolveReview(undefined, '0').amount).toBe('0.05 ETH')
})
it('carries the entered recipient and amount, total = amount + fee', () => {
  const to = '0x4E21aB7c9D03F5e86B1a2C4d7E90F3b5a6d8c90F'
  const r = resolveReview(to, '1.5.')
  expect(r).toMatchObject({ recipient: to, previous: null, amount: '1.5 ETH', total: '1.500042 ETH', feeCap: '0.0000735 ETH' })
})
it('marks a look-alike of a recent address and names the recent one', () => {
  const r = resolveReview(review.lookalike, '0.05')
  expect(r.recipient).toBe(review.lookalike)
  expect(r.previous).toBe(review.recipient)
})
it('?risk=1 keeps working without an entered address', () => {
  expect(resolveReview(undefined, undefined, true)).toMatchObject({ recipient: review.lookalike, previous: review.recipient })
})
it('keeps burn and tokenContract risk instead of dropping it', async () => {
  const { BURN_ADDRESSES } = await import('@vaultme/wallet-core')
  const r = resolveReview(BURN_ADDRESSES[0])
  expect(r.risk).toBe('burn')
  expect(r.previous).toBeNull()
  expect(resolveReview(undefined, undefined, true).risk).toBe('lookalike')
})
it('total max = amount + fee cap, next to the estimated total (amount + fee)', () => {
  const r = resolveReview(undefined, '0.05')
  expect(r.total).toBe('0.050042 ETH')
  expect(r.totalMax).toBe('0.0500735 ETH')
})
it('token contract recipient keeps its risk for the confirm sheet', async () => {
  const { ASSETS } = await import('@vaultme/wallet-core')
  expect(resolveReview(ASSETS.USDC.address).risk).toBe('tokenContract')
})

it('USDC review: exact 6-digit amount, ETH fee, no total (the fee is never added to the token amount)', () => {
  const r = resolveReview(undefined, '2.123456', false, undefined, undefined, 'USDC')
  expect(r).toMatchObject({ asset: 'USDC', amount: '2.123456 USDC', fee: '0.000042 ETH', total: null, totalMax: null })
  expect(resolveReview(undefined, '25.', false, undefined, undefined, 'USDC').amount).toBe('25 USDC')
})
it('an ETH amount with 7 digits is not a USDC amount', async () => {
  const { cleanAmount } = await import('../src/entities/transaction/review')
  expect(cleanAmount('1.1234567', 'USDC')).toBeNull()
  expect(cleanAmount('1.1234567', 'ETH')).toBe('1.1234567')
})
