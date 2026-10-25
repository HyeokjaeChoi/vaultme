import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { ESLint } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fsdLayers } from '../fsd.js'

// Each case lints one import in a real folder tree, because the rule resolves imports through the file system.
const leaf = 'export const x = 1\n'
const tree = (dirs: string[]) => Object.fromEntries(dirs.map((d) => [`${d}/index.ts`, leaf]))

let root: string
beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'fsd-'))) // real path: partialMatch:false compares paths from cwd
})
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

function app(name: string, files: Record<string, string>) {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'tsconfig.json'), '{"compilerOptions":{"module":"esnext","moduleResolution":"bundler"}}')
  for (const [f, src] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true })
    writeFileSync(join(dir, f), src)
  }
  return dir
}

async function lint(dir: string, options: Parameters<typeof fsdLayers>[0], file: string, source: string) {
  const eslint = new ESLint({
    cwd: dir,
    overrideConfigFile: true,
    overrideConfig: [
      { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } },
      ...fsdLayers({ ...options, rootPath: dir }),
    ],
  })
  const [result] = await eslint.lintText(source, { filePath: join(dir, file) })
  return (result?.messages ?? []).filter((m) => m.ruleId === 'boundaries/dependencies')
}

const slices = [
  'pages/home',
  'widgets/card',
  'features/send',
  'features/other',
  'entities/account',
  'shared/lib',
  'shell',
]
const base = {
  ...tree(slices),
  'features/send/model.ts': leaf,
  'shared/lib/locale.ts': leaf,
  'shared/ui/Button.ts': leaf,
  'shared/ui/index.ts': leaf,
}

describe('web layout (app/, routes in app/routes, shared/ui files are entries)', () => {
  const options = {
    files: ['app/**/*.{ts,tsx}'],
    root: 'app',
    routes: [{ pattern: 'app/routes', partialMatch: false }],
    routeMayImport: ['shell', 'pages', 'widgets', 'features', 'entities', 'shared'],
    sharedEntries: ['lib', 'ui'],
  }
  let dir: string
  beforeAll(() => {
    dir = app(
      'web',
      Object.fromEntries(Object.entries({ ...base, 'routes/home.tsx': leaf }).map(([k, v]) => [`app/${k}`, v])),
    )
  })
  const check = (file: string, source: string) => lint(dir, options, `app/${file}`, source)

  it('allows a downward import through the index', async () => {
    expect(await check('widgets/card/ui.ts', "import '../../features/send'")).toHaveLength(0)
  })
  it('fails on an upward import', async () => {
    expect(await check('features/send/ui.ts', "import '../../widgets/card'")).toHaveLength(1)
  })
  it('fails on an import into another slice of the same layer', async () => {
    expect(await check('features/send/ui.ts', "import '../other'")).toHaveLength(1)
  })
  it('fails on a deep import into a slice', async () => {
    expect(await check('routes/home.tsx', "import '../features/send/model'")).toHaveLength(1)
  })
  it('lets a route use the index of a slice and any shared lib or ui file', async () => {
    const src = "import '../features/send'\nimport '../shared/lib/locale'\nimport '../shared/ui/Button'"
    expect(await check('routes/home.tsx', src)).toHaveLength(0)
  })
  it('lets the shell import a page through its index but not past it', async () => {
    expect(await check('shell/index.ts', "import '../pages/home'")).toHaveLength(0)
    expect(await check('shell/index.ts', "import '../features/send/model'")).toHaveLength(1)
  })
  it('fails when a lower layer imports a route', async () => {
    expect(await check('shared/lib/locale.ts', "import '../../routes/home'")).toHaveLength(1)
  })
})

describe('mobile layout (src/, routes in app/, only shared/lib is a route entry)', () => {
  const options = {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    root: 'src',
    routes: [{ pattern: 'app/**', partialMatch: false }],
    routeMayImport: ['shell', 'pages', 'shared'],
    sharedEntries: ['lib'],
    generated: 'src/generated',
  }
  let dir: string
  beforeAll(() => {
    dir = app(
      'mobile',
      Object.fromEntries(Object.entries({ ...base, 'generated/licenses.ts': leaf }).map(([k, v]) => [`src/${k}`, v])),
    )
    mkdirSync(join(dir, 'app'), { recursive: true })
    writeFileSync(join(dir, 'app/index.tsx'), leaf)
  })
  const check = (file: string, source: string) => lint(dir, options, file, source)

  it('lets features read the generated folder', async () => {
    expect(await check('src/features/send/ui.ts', "import '../../generated/licenses'")).toHaveLength(0)
  })
  it('fails when a route imports a feature', async () => {
    expect(await check('app/index.tsx', "import '../src/features/send'")).toHaveLength(1)
  })
  it('fails when a route imports a shared/ui file', async () => {
    expect(await check('app/index.tsx', "import '../src/shared/ui/Button'")).toHaveLength(1)
  })
  it('lets a route use shared/lib and pages', async () => {
    expect(await check('app/index.tsx', "import '../src/shared/lib/locale'\nimport '../src/pages/home'")).toHaveLength(
      0,
    )
  })
})
