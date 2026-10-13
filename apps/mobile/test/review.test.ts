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
