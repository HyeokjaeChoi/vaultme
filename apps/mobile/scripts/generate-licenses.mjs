// Open-source license list for S64/S65 (owner decision 2026-10-17): built from the installed dependency closure of this app, transitive dependencies included.
// Source of truth = the pnpm install (node_modules is a view of pnpm-lock.yaml; each package.json and LICENSE file is read as installed). No network, no dependency.
// Output: src/generated/licenses.json (git-ignored). Run by `pnpm generate:licenses`; typecheck, lint, test and start run it first.
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Assets that are not npm runtime packages (icon artwork, fonts). Texts are checked in under licenses/ with their source named here.
const ASSETS = [
  {
    name: 'Solar Icons by 480 Design',
    version: null,
    license: 'CC BY 4.0',
    copyright: 'Solar Icons Set by 480 Design (https://www.figma.com/community/file/1166831539721848736)',
    file: 'licenses/CC-BY-4.0.txt', // https://creativecommons.org/licenses/by/4.0/legalcode.txt
    url: 'https://www.figma.com/community/file/1166831539721848736',
  },
  { name: 'Pretendard', version: null, license: 'OFL-1.1', file: 'licenses/Pretendard-OFL-1.1.txt' }, // pretendard/dist/LICENSE.txt
  { name: 'IBM Plex Mono', version: null, license: 'OFL-1.1', file: 'licenses/IBM-Plex-OFL-1.1.txt' }, // https://github.com/IBM/plex LICENSE.txt
]
// The font packages are listed through their font licenses in ASSETS (Pretendard OFL, IBM Plex Mono OFL), not as code libraries.
const EXCLUDE = new Set(['pretendard', '@expo-google-fonts/ibm-plex-mono'])
const DISPLAY = { react: 'React', 'react-native': 'React Native', expo: 'Expo' }
// Shown first in this order (Figma 526:54503); the rest of the direct dependencies follow, then transitive ones, each A to Z.
const FIRST = [
  'react-native',
  'expo',
  'react',
  'viem',
  '@noble/curves',
  '@noble/hashes',
  'react-native-svg',
  'react-native-reanimated',
  'react-native-keychain',
  'react-native-mmkv',
  'i18next',
]
const LICENSE_FILE = /^(licen[sc]e|copying|unlicense)(\.|-|$)/i

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

/** package.json of `name` as Node would find it from `fromDir` (walks up node_modules; pnpm keeps siblings in the parent node_modules of the real path). */
function find(name, fromDir) {
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const p = join(dir, 'node_modules', name, 'package.json')
    if (existsSync(p)) return realpathSync(dirname(p))
    if (dirname(dir) === dir) return null
  }
}

function licenseId(pkg) {
  if (typeof pkg.license === 'string') return pkg.license
  if (pkg.license?.type) return pkg.license.type
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ')
  return 'UNKNOWN'
}

/**
 * Packages hard-wrap license files at about 72 columns. Join the lines of a paragraph so the text reflows on a phone; only line breaks inside a paragraph change.
 * A line that starts with a space, a number, a bullet or a lettered item keeps its break (lists, indented headings).
 */
export function reflow(text) {
  return text
    .split(/\n{2,}/)
    .map((para) =>
      para
        .split('\n')
        .reduce(
          (out, line) =>
            out === ''
              ? line
              : /^(\s|\d+[.)]|[-*•]|\(\w+\)|[A-Za-z][.)]\s)/.test(line)
                ? `${out}\n${line}`
                : `${out} ${line}`,
          '',
        ),
    )
    .join('\n\n')
}

function licenseText(dir) {
  const f = readdirSync(dir)
    .filter((n) => LICENSE_FILE.test(n))
    .sort()[0]
  return f ? reflow(readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n').trim()) : null
}

/** First line that names a copyright holder, as written in the license text. */
const copyrightLine = (text) =>
  text
    ?.split('\n')
    .map((l) => l.trim())
    .find((l) => /^(copyright|\(c\))\b/i.test(l) || /^copyright/i.test(l.replace(/^[#*\s]+/, ''))) ?? null

export function buildLicenses({ root = appDir } = {}) {
  const app = readJson(join(root, 'package.json'))
  const direct = new Set(Object.keys(app.dependencies ?? {}))
  const seen = new Map() // real dir -> package
  const queue = [...direct].map((n) => [n, root])
  while (queue.length) {
    const [name, from] = queue.shift()
    const dir = find(name, from)
    if (!dir || seen.has(dir)) continue
    const pkg = readJson(join(dir, 'package.json'))
    seen.set(dir, pkg)
    for (const dep of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.optionalDependencies ?? {})])
      queue.push([dep, dir])
  }
  const texts = {}
  const idOf = (text) => {
    let h = 5381
    for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
    const id = `${h.toString(36)}-${text.length}`
    texts[id] = text
    return id
  }
  const entry = (name, version, license, text, copyright, extra = {}) => ({
    name,
    ...(DISPLAY[name] ? { display: DISPLAY[name] } : {}),
    version,
    license,
    copyright: copyright ?? copyrightLine(text),
    text: text ? idOf(text) : null,
    ...extra,
  })
  const libs = []
  const emitted = new Set() // pnpm can hold one name@version in several dirs
  for (const [dir, pkg] of seen) {
    if (pkg.name.startsWith('@vaultme/') || EXCLUDE.has(pkg.name) || emitted.has(`${pkg.name}@${pkg.version}`)) continue
    emitted.add(`${pkg.name}@${pkg.version}`) // this repo's own packages (their dependencies are in the list)
    libs.push(entry(pkg.name, pkg.version, licenseId(pkg), licenseText(dir), null, { direct: direct.has(pkg.name) }))
  }
  const rank = (p) => {
    const i = FIRST.indexOf(p.name)
    return i >= 0 ? [0, i, ''] : p.direct ? [1, 0, p.name] : [2, 0, p.name]
  }
  libs.sort((a, b) => {
    const [x, y] = [rank(a), rank(b)]
    return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]) || a.version.localeCompare(b.version)
  })
  const assets = ASSETS.map((a) =>
    entry(
      a.name,
      a.version,
      a.license,
      reflow(readFileSync(join(root, a.file), 'utf8').replace(/\r\n/g, '\n').trim()),
      a.copyright ?? null,
      a.url ? { url: a.url } : {},
    ),
  )
  return { assets, libs, texts }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = join(appDir, 'src/generated/licenses.json')
  mkdirSync(dirname(out), { recursive: true })
  const data = buildLicenses()
  writeFileSync(out, `${JSON.stringify(data)}\n`)
  const missing = data.libs.filter((l) => !l.text).length
  process.stdout.write(
    `licenses: ${data.libs.length} packages, ${Object.keys(data.texts).length} distinct texts, ${missing} without a license file -> src/generated/licenses.json\n`,
  )
}
