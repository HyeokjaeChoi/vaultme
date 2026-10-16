// VaultMe Local Runner: runs one task in the desktop app (local fonts load here), logs to sharedPluginData 'vaultme'/'log'.
const TASK = 'type-korean-tracking'
async function run() {
  const out = {}
  const fonts = (await figma.listAvailableFontsAsync()).filter(f => f.fontName.family === 'Pretendard').map(f => f.fontName.style)
  out.pretendardStyles = fonts
  const styles = (await figma.getLocalTextStylesAsync()).filter(s => s.name.startsWith('Product B/'))
  const tracking = { 'Display L': -1.2, 'Display M': -0.8, 'Title 1': -0.6, 'Title 2': -0.5, 'Title 3': -0.4, Headline: -0.3, Body: -0.3, 'Body Small': -0.2, Label: -0.2, Caption: -0.1 }
  out.updated = []
  for (const s of styles) {
    const key = s.name.replace('Product B/', '')
    if (!(key in tracking)) continue
    await figma.loadFontAsync(s.fontName)
    s.letterSpacing = { unit: 'PIXELS', value: tracking[key] }
    out.updated.push(`${s.name} ${tracking[key]}`)
  }
  const ensure = async (name, style, size, lh, ls, description) => {
    let s = styles.find(x => x.name === name)
    if (!s) { s = figma.createTextStyle(); s.name = name }
    const fontName = { family: 'Pretendard', style }
    await figma.loadFontAsync(fontName)
    s.fontName = fontName; s.fontSize = size; s.lineHeight = { unit: 'PIXELS', value: lh }; s.letterSpacing = { unit: 'PIXELS', value: ls }
    s.description = description
    return s.id
  }
  out.figure = await ensure('Product B/Figure', 'Bold', 44, 52, -1.2, 'Hero amount figure (balance, review, result). Pretendard 700, tabular numbers. Owner decision 2026-10-17.')
  out.figureUnit = await ensure('Product B/Figure unit', 'SemiBold', 24, 32, -0.5, 'Unit next to a Figure (ETH, USDC). Use text/secondary, baseline-aligned.')
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
