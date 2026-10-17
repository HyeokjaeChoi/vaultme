import { describe, expect, it } from 'vitest'
import { chainIdCopula, parseAddressQr } from '../src/shared/lib/qrAddress'

const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94' // public test vector (AGENTS.md Foundation 4)
const TOKEN = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // Sepolia USDC

describe('parseAddressQr', () => {
  it('accepts a bare address (checksum, lower and upper case)', () => {
    expect(parseAddressQr(A)).toEqual({ ok: true, address: A, chainId: null, hadAmount: false })
    expect(parseAddressQr(A.toLowerCase())).toEqual({ ok: true, address: A, chainId: null, hadAmount: false })
    expect(parseAddressQr(`0x${A.slice(2).toUpperCase()}`)).toMatchObject({ ok: true, address: A })
  })

  it('trims surrounding whitespace', () => {
    expect(parseAddressQr(`  ${A}\n`)).toMatchObject({ ok: true, address: A })
  })

  it('rejects a mixed-case address with a wrong checksum', () => {
    const bad = `${A.slice(0, -1)}${A.endsWith('4') ? '5' : '4'}`
    expect(parseAddressQr(bad)).toEqual({ ok: false, error: 'notAddress' })
    expect(parseAddressQr(`0x${A.slice(2, 4).toLowerCase()}${A.slice(4).replace(/[A-F]/, (c) => c.toLowerCase())}`)).toEqual({ ok: false, error: 'notAddress' })
  })

  it('accepts ethereum: with and without chain id', () => {
    expect(parseAddressQr(`ethereum:${A}`)).toEqual({ ok: true, address: A, chainId: null, hadAmount: false })
    expect(parseAddressQr(`ethereum:${A}@11155111`)).toEqual({ ok: true, address: A, chainId: 11155111, hadAmount: false })
    expect(parseAddressQr(`ETHEREUM:pay-${A}@11155111`)).toMatchObject({ ok: true, address: A })
  })

  it('ignores amount params and flags them', () => {
    expect(parseAddressQr(`ethereum:${A}@11155111?value=1e18`)).toEqual({ ok: true, address: A, chainId: 11155111, hadAmount: true })
    expect(parseAddressQr(`ethereum:${A}?amount=2`)).toMatchObject({ ok: true, hadAmount: true })
    expect(parseAddressQr(`ethereum:${A}?label=Bob`)).toMatchObject({ ok: true, hadAmount: false })
  })

  it('blocks another chain', () => {
    expect(parseAddressQr(`ethereum:${A}@1`)).toEqual({ ok: false, error: 'wrongChain', chainId: 1 })
    expect(parseAddressQr(`ethereum:${A}@1?value=5`)).toEqual({ ok: false, error: 'wrongChain', chainId: 1 })
  })

  it('token transfer: the recipient is the address param, never the token contract', () => {
    const r = parseAddressQr(`ethereum:${TOKEN}@11155111/transfer?address=${A}&uint256=1000000`)
    expect(r).toEqual({ ok: true, address: A, chainId: 11155111, hadAmount: true })
    expect(parseAddressQr(`ethereum:${TOKEN}/transfer`)).toEqual({ ok: false, error: 'notAddress' })
    expect(parseAddressQr(`ethereum:${TOKEN}/transfer?address=0x1234`)).toEqual({ ok: false, error: 'notAddress' })
    expect(parseAddressQr(`ethereum:${TOKEN}/approve?address=${A}&uint256=1`)).toEqual({ ok: false, error: 'notAddress' })
  })

  it('rejects everything else', () => {
    for (const s of ['', 'hello', 'https://example.com', 'bitcoin:bc1qxyz', 'ethereum:vitalik.eth', `ethereum:${A}@abc`, `ethereum:${A}@`, 'ethereum:0x1234', '0x1234', `${A}0`, `ethereum:${A}extra`]) {
      expect(parseAddressQr(s), s).toEqual({ ok: false, error: 'notAddress' })
    }
  })
})

describe('chainIdCopula', () => {
  it('picks 예요 after a vowel-final digit name', () => {
    expect(chainIdCopula(1)).toBe('이에요')
    expect(chainIdCopula(11155111)).toBe('이에요')
    expect(chainIdCopula(10)).toBe('이에요')
    expect(chainIdCopula(42161)).toBe('이에요')
    for (const id of [2, 5, 9, 137 + 2, 8453 + 2]) expect(chainIdCopula(id)).toBe('예요')
  })
})
