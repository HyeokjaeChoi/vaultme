// ESLint runs only on workspace files: each app and package has its own eslint.config.
// Root scripts and .claude/ have none, so Prettier formats them without lint.
const q = (files) => files.map((f) => JSON.stringify(f)).join(' ')

export default {
  '*.{ts,tsx,js,mjs,cjs}': (files) => {
    const ws = files.filter((f) => /\/(apps|packages)\//.test(f))
    return [...(ws.length ? [`eslint --max-warnings=0 --fix ${q(ws)}`] : []), `prettier --write ${q(files)}`]
  },
  '*.{json,yml,yaml}': (files) => `prettier --write ${q(files)}`,
}
