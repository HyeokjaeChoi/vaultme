// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { finalize } from '../scripts/finalize.ts'

// Real `react-router build` of a fixture app: a static index route, a hydrated route and the 404 pages. This is the
// path root.tsx's hydrate detection and finalize.ts have to survive once the landing page exists.
const root = process.cwd() // vitest runs in apps/web (turbo and pnpm --filter both cd there)
const out = join(root, 'test/fixtures/build/client')
const read = (p: string) => readFileSync(join(out, p), 'utf8')

describe('build with a static index route', () => {
  beforeAll(() => {
    rmSync(join(root, 'test/fixtures/build'), { recursive: true, force: true })
    const r = spawnSync('pnpm', ['exec', 'react-router', 'build'], {
      cwd: root,
      env: { ...process.env, WEB_FIXTURE: '1' },
      encoding: 'utf8',
    })
    if (r.status !== 0) throw new Error(r.stdout + r.stderr)
    finalize(out, {})
  }, 120_000)
  afterAll(() => {
    rmSync(join(root, 'test/fixtures/build'), { recursive: true, force: true })
  })

  it('keeps the prerendered landing page as index.html, with no app script', () => {
    expect(read('index.html')).toContain('static landing')
    expect(read('index.html')).not.toContain('<script type="module"')
    expect(read('index.html')).not.toContain('__reactRouterContext')
  })

  it('hydrates only the route that asks for it', () => {
    expect(read('hydrated/index.html')).toContain('window.__reactRouterContext')
    expect(read('404.html')).not.toContain('__reactRouterContext')
  })

  it('names the 404 pages and drops the SPA shell', () => {
    expect(existsSync(join(out, '404.html'))).toBe(true)
    expect(existsSync(join(out, 'en/404.html'))).toBe(true)
    expect(existsSync(join(out, '__spa-fallback.html'))).toBe(false)
  })

  it('puts the hashes of every inline script of the built pages into the CSP', () => {
    const csp = read('_headers')
    const hashes = [...csp.matchAll(/'sha256-[^']+'/g)].map((m) => m[0])
    expect(hashes.length).toBeGreaterThan(1) // the theme script and the router's inline scripts
  })
})
