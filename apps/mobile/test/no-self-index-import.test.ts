import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = new URL('../src', import.meta.url).pathname
const files = readdirSync(src, { recursive: true, encoding: 'utf8' })
  .filter((f) => /\.tsx?$/.test(f) && !/(^|\/)index\.tsx?$/.test(f))
  .map((f) => join(src, f))

// A slice's index re-exports its files, so a file that imports its own index makes a require cycle (Metro warns, values can be undefined).
describe('no file imports its own slice index', () => {
  it('has no `from "."` or `from "./index"`', () => {
    const bad = files.filter((f) => /from '\.(\/index)?'/.test(readFileSync(f, 'utf8'))).map((f) => relative(src, f))
    expect(bad).toEqual([])
  })
})
