// ESLint runs only on workspace files: each app and package has its own eslint.config.
// Root scripts and .claude/ have none, so Prettier formats them without lint.
const q = (files) => files.map((f) => JSON.stringify(f)).join(' ')

export default {
  '*.{ts,tsx,js,mjs,cjs}': (files) => {
    const ws = files.filter((f) => /\/(apps|packages)\//.test(f))
    return [...(ws.length ? [`eslint --max-warnings=0 --fix ${q(ws)}`] : []), `prettier --write ${q(files)}`]
  },
  // Stylelint runs on the web app's CSS only (apps/web/stylelint.config.mjs); other CSS is generated or has no config.
  '*.css': (files) => {
    const web = files.filter((f) => /\/apps\/web\/app\//.test(f))
    return [
      ...(web.length ? [`pnpm --filter @vaultme/web exec stylelint --max-warnings=0 --fix ${q(web)}`] : []),
      `prettier --write ${q(files)}`,
    ]
  },
  '*.{json,yml,yaml}': (files) => `prettier --write ${q(files)}`,
}
