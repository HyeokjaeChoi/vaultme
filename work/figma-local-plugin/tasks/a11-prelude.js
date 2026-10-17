const L = {}
async function init() {
  const vars = await figma.variables.getLocalVariablesAsync()
  L.v = Object.fromEntries(vars.map(v => [v.name, v])); L.byId = Object.fromEntries(vars.map(v => [v.id, v]))
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
const V = n => { const v = L.v[n]; if (!v) throw new Error('missing var ' + n); return v }
const S = n => { const s = L.s[n]; if (!s) throw new Error('missing style ' + n); return s }
const node = async id => { const n = await figma.getNodeByIdAsync(id); if (!n) throw new Error('missing node ' + id); return n }
const rgb = (c) => ({ r: c.r, g: c.g, b: c.b })
// Bound paint seeded with the resolved color for this node (never the {0,0,0} seed).
function fillR(n, name) {
  const v = V(name)
  n.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }, 'color', v)]
  const res = v.resolveForConsumer(n).value
  if (res && typeof res === 'object') n.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb(res) }, 'color', v)]
}
function bind(n, f, name) { n.setBoundVariable(f, V(name)) }
function pad(n, t, r, b, l) { const m = { paddingTop: t, paddingRight: r, paddingBottom: b, paddingLeft: l }; for (const k in m) if (m[k]) bind(n, k, m[k]); else n[k] = 0 }
function al(dir, name, o = {}) {
  const f = figma.createFrame(); f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.name = name; f.fills = []
  if (o.gap) bind(f, 'itemSpacing', o.gap); else f.itemSpacing = 0
  if (o.pad) pad(f, ...o.pad)
  if (o.align) f.primaryAxisAlignItems = o.align
  if (o.cross) f.counterAxisAlignItems = o.cross
  f.clipsContent = false
  return f
}
async function txt(chars, style, color, name) { const t = figma.createText(); await t.setTextStyleIdAsync(S(style).id); t.characters = chars; t.name = name || chars.slice(0, 24); fillR(t, color); return t }
async function wrapTxt(parent, chars, style, color, name, align) { const t = await txt(chars, style, color, name); parent.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; if (align) t.textAlignHorizontal = align; fillR(t, color); return t }
function setP(inst, short) {
  const defs = inst.componentProperties, o = {}
  for (const [k, v] of Object.entries(short)) { const key = Object.keys(defs).find(d => d.split('#')[0] === k); if (!key) throw new Error('no prop ' + k + ' on ' + inst.name); o[key] = v }
  inst.setProperties(o); return inst
}
async function setText(t, s) { for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = s }
const one = (root, pred, what) => { const n = root.findOne(pred); if (!n) throw new Error('not found ' + what + ' in ' + root.name); return n }
const byName = (root, name) => one(root, n => n.name === name, name)
const visibleByName = (root, name) => one(root, n => n.name === name && n.visible !== false, name)
async function syncDark(lightId, darkId, darkSection) {
  const l = await node(lightId); let d
  if (darkId) { d = await node(darkId); d.children.forEach(c => c.remove()) }
  else { d = darkSection.children.find(c => c.name === l.name + ' · Dark'); if (d) d.children.forEach(c => c.remove()); else { d = figma.createFrame(); darkSection.appendChild(d); d.name = l.name + ' · Dark' } d.x = l.x; d.y = l.y }
  d.layoutMode = l.layoutMode; d.primaryAxisSizingMode = 'FIXED'; d.resize(l.width, l.height); d.fills = l.fills; d.clipsContent = l.clipsContent
  for (const k of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'itemSpacing']) d[k] = l[k]
  for (const c of l.children) { const cl = c.clone(); d.appendChild(cl); if (c.layoutPositioning === 'ABSOLUTE') { cl.layoutPositioning = 'ABSOLUTE'; cl.x = c.x; cl.y = c.y; cl.constraints = c.constraints } }
  d.setExplicitVariableModeForCollection(L.sem, '298:0'); fillR(d, 'screenB/bg')
  return d.id
}
async function note(section, frame, text) {
  const name = 'Note · ' + frame.name; let t = section.children.find(c => c.name === name)
  if (!t) { t = await txt(text, 'Product B/Caption', 'text/tertiary', name); section.appendChild(t) } else await setText(t, text)
  t.textAutoResize = 'HEIGHT'; t.resize(390, t.height); t.x = frame.x; t.y = frame.y + frame.height + 16; return t.id
}
// New frames go on a new row under everything in the section; the section grows to fit.
function newRowY(section) { return Math.max(...section.children.map(c => c.y + c.height)) + 160 }
function growSection(section) {
  const r = Math.max(...section.children.map(c => c.x + c.width)) + 100, b = Math.max(...section.children.map(c => c.y + c.height)) + 100
  section.resizeWithoutConstraints(Math.max(section.width, r), Math.max(section.height, b))
}
async function ensureClone(srcId, section, name, x, y) {
  let f = section.children.find(c => c.name === name)
  if (!f) { f = (await node(srcId)).clone(); section.appendChild(f); f.name = name; f.x = x; f.y = y }
  return f
}
function makeFull(f) {
  const body = byName(f, 'Body'), content = body.findOne(n => n.name === 'Content' && n.type === 'FRAME')
  f.primaryAxisSizingMode = 'AUTO'; body.layoutSizingVertical = 'HUG'; content.layoutSizingVertical = 'HUG'
}
