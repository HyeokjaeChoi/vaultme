// VaultMe Local Runner: runs one task in the desktop app (local fonts load here), logs to sharedPluginData 'vaultme'/'log'.
// TASK batch2-critique (#54): fixes from the impeccable critique pass after batch2-polish (tasks/batch2-polish.js).
// S90 Face ID status text: Caption 12 -> Label 14, text/secondary (it is the live state of the lock screen, not a footnote).
const TASK = 'batch2-critique'
const L = {}
async function init() {
  const vars = await figma.variables.getLocalVariablesAsync()
  L.v = Object.fromEntries(vars.map(v => [v.name, v]))
  const ts = await figma.getLocalTextStylesAsync()
  L.s = Object.fromEntries(ts.map(s => [s.name, s]))
  const seen = new Set()
  for (const s of ts) { const k = s.fontName.family + '|' + s.fontName.style; if (!seen.has(k)) { seen.add(k); try { await figma.loadFontAsync(s.fontName) } catch (e) {} } }
  for (const st of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync({ family: 'Pretendard', style: st })
  for (const st of ['Regular', 'Medium', 'SemiBold']) await figma.loadFontAsync({ family: 'IBM Plex Mono', style: st })
  for (const st of ['Regular', 'Medium', 'Semi Bold', 'Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }) } catch (e) {} }
  const cols = await figma.variables.getLocalVariableCollectionsAsync()
  L.sem = cols.find(c => c.name === '02 Semantic')
}
const DARK = '298:0'
const V = n => { const v = L.v[n]; if (!v) throw new Error('missing var ' + n); return v }
const node = async id => { const n = await figma.getNodeByIdAsync(id); if (!n) throw new Error('missing node ' + id); return n }
function paint(name) { return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(name)) }
function bind(n, f, name) { n.setBoundVariable(f, V(name)) }
function props(inst, o) { const m = {}; for (const [short, val] of Object.entries(o)) { const k = Object.keys(inst.componentProperties).find(d => d.split('#')[0] === short); if (!k) throw new Error('no prop ' + short + ' on ' + inst.name); m[k] = val } inst.setProperties(m) }
const kid = (n, name) => n.children.find(c => c.name === name)
async function setText(t, s) { for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = s }
// Dark twin = frame named "<light name> · Dark" on the same page; same child index path.
function twin(n) {
  const path = []; let x = n
  while (x.parent && x.parent.type !== 'SECTION' && x.parent.type !== 'PAGE') { path.unshift(x.parent.children.indexOf(x)); x = x.parent }
  const d = figma.currentPage.findOne(f => f.type === 'FRAME' && f.name === x.name + ' · Dark'); if (!d) return null
  let y = d; for (const i of path) { y = y.children[i]; if (!y) return null } return y
}
const ICON_DOC = '533:21894', ICON_SW = '533:21900', ICON_EXT = '520:27859'


async function run() {
  await init()
  const out = []
  await figma.setCurrentPageAsync(await node('486:17443'))
  for (const id of ['515:45579', '515:45780']) {
    const t = await node(id); await t.setTextStyleIdAsync(L.s['Product B/Label'].id); t.fills = [paint('text/secondary')]; t.textAutoResize = 'WIDTH_AND_HEIGHT'; out.push([id, t.width, t.height])
  }
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
