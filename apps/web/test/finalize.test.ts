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

describe('fillHeaders', () => {
  it('replaces the placeholder', () => {
    expect(fillHeaders('script-src __SCRIPT_HASHES__ x', [HASH_A, "'sha256-b'"])).toBe(
      `script-src ${HASH_A} 'sha256-b' x`,
    )
  })
  it('fails without the placeholder or with a line over the limit', () => {
    expect(() => fillHeaders('nothing', [])).toThrow('no __SCRIPT_HASHES__')
    expect(() => fillHeaders('__SCRIPT_HASHES__', ["'x'".repeat(1000)])).toThrow('limit 2000')
  })
})

describe('finalize', () => {
  const build = () => {
    const dir = mkdtempSync(join(tmpdir(), 'web-'))
    for (const p of ['404', 'en/404']) {
      mkdirSync(join(dir, p), { recursive: true })
      writeFileSync(join(dir, p, 'index.html'), '<html><script>a</script></html>')
    }
    writeFileSync(join(dir, 'index.html'), 'spa shell')
    writeFileSync(join(dir, '_headers'), '/*\n  Content-Security-Policy: script-src __SCRIPT_HASHES__\n')
    return dir
  }

  it('names the 404 pages, drops the SPA shell and fills the CSP hashes', () => {
    const dir = build()
    finalize(dir)
    expect(existsSync(join(dir, '404.html'))).toBe(true)
    expect(existsSync(join(dir, 'en/404.html'))).toBe(true)
    expect(existsSync(join(dir, '404'))).toBe(false)
    expect(existsSync(join(dir, 'index.html'))).toBe(false)
    expect(readFileSync(join(dir, '_headers'), 'utf8')).toContain(`script-src ${HASH_A}`)
  })

  it('keeps a prerendered landing page at index.html', () => {
    const dir = build()
    writeFileSync(join(dir, 'index.html'), '<html><main>landing</main></html>')
    finalize(dir)
    expect(existsSync(join(dir, 'index.html'))).toBe(true)
  })

  it('fails when a prerendered 404 is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'web-'))
    expect(() => finalize(dir)).toThrow('missing prerendered')
  })
})
