import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fillHeaders, finalize, inlineScriptHashes } from '../scripts/finalize.ts'

// sha256 of "a", base64
const HASH_A = "'sha256-ypeBEsobvcr6wjGzmiPcTaeG7/gUfE5yuYB3ha/uSLs='"

describe('inlineScriptHashes', () => {
  it('hashes inline scripts only, once each', () => {
    const html = '<script>a</script><script src="/x.js"></script><script type="module">a</script>'
    expect(inlineScriptHashes(html)).toEqual([HASH_A])
  })
})

const TEMPLATE =
  '/*\n  Content-Security-Policy: script-src __SCRIPT_HASHES__; connect-src __API_ORIGIN__\n  __X_ROBOTS_TAG__\n  Other: x\n'

describe('fillHeaders', () => {
  const opts = { scriptHashes: [HASH_A, "'sha256-b'"], apiOrigin: 'https://api.example', noindex: true }

  it('fills hashes, API origin and the noindex header', () => {
    const out = fillHeaders(TEMPLATE, opts)
    expect(out).toContain(`script-src ${HASH_A} 'sha256-b'; connect-src https://api.example`)
    expect(out).toContain('  X-Robots-Tag: noindex\n  Other: x')
  })
  it('drops the robots line for an indexable build', () => {
    const out = fillHeaders(TEMPLATE, { ...opts, noindex: false })
    expect(out).not.toContain('X-Robots-Tag')
    expect(out).not.toContain('__X_ROBOTS_TAG__')
  })
  it('fails without a placeholder or with a line over the limit', () => {
    expect(() => fillHeaders('nothing', opts)).toThrow('no __SCRIPT_HASHES__')
    expect(() => fillHeaders(TEMPLATE, { ...opts, scriptHashes: ["'x'".repeat(1000)] })).toThrow('limit 2000')
  })
})

describe('finalize', () => {
  const build = () => {
    const dir = mkdtempSync(join(tmpdir(), 'web-'))
    for (const p of ['404', 'en/404', 'address', 'en/address']) {
      mkdirSync(join(dir, p), { recursive: true })
      writeFileSync(join(dir, p, 'index.html'), '<html><script>a</script></html>')
    }
    writeFileSync(join(dir, 'index.html'), 'spa shell')
    writeFileSync(join(dir, '_headers'), TEMPLATE)
    return dir
  }

  it('names the 404 and other pages, drops the SPA shell and fills the CSP hashes', () => {
    const dir = build()
    finalize(dir, {})
    expect(existsSync(join(dir, '404.html'))).toBe(true)
    expect(existsSync(join(dir, 'en/404.html'))).toBe(true)
    expect(existsSync(join(dir, '404'))).toBe(false)
    expect(existsSync(join(dir, 'index.html'))).toBe(false)
    // Every page is a file: /address is served without a redirect to /address/ (Static Assets html_handling).
    expect(existsSync(join(dir, 'address.html'))).toBe(true)
    expect(existsSync(join(dir, 'en/address.html'))).toBe(true)
    expect(existsSync(join(dir, 'en/address'))).toBe(false)
    const headers = readFileSync(join(dir, '_headers'), 'utf8')
    expect(headers).toContain(`script-src ${HASH_A}`)
    expect(headers).toContain('connect-src https://vaultme-api-staging.gurwo1007.workers.dev') // default origin
    expect(headers).toContain('X-Robots-Tag: noindex') // default: not production
  })

  it('serves production indexable with its own API origin, and rejects a bad origin', () => {
    const dir = build()
    finalize(dir, { WEB_ENV: 'production', WEB_API_ORIGIN: 'https://api.vaultme.stack-line.dev' })
    const headers = readFileSync(join(dir, '_headers'), 'utf8')
    expect(headers).toContain('connect-src https://api.vaultme.stack-line.dev')
    expect(headers).not.toContain('X-Robots-Tag')
    expect(() => finalize(build(), { WEB_API_ORIGIN: "http://x; script-src 'unsafe-inline'" })).toThrow('https origin')
  })

  it('keeps a prerendered landing page at index.html', () => {
    const dir = build()
    writeFileSync(join(dir, 'index.html'), '<html><main>landing</main></html>')
    finalize(dir, {})
    expect(existsSync(join(dir, 'index.html'))).toBe(true)
  })

  it('fails when a prerendered 404 is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'web-'))
    expect(() => finalize(dir, {})).toThrow('missing prerendered')
  })
})
