// VaultMe Local Runner: TASK final-fixes (#54). Fixes from work/review/pd-review-final-2026-10-17.md that write text
// (Pretendard loads only in the desktop app). Non-text master/frame fixes ran over the remote MCP first (see commit).
// Edits go to the Light frames; each changed Dark twin is then re-cloned from Light (syncDark, as in batch2-last.js).
// Last step: repaint every bound paint whose stored color differs from the resolved variable value (root cause of the
// #000000 text in the review: the paint was bound but kept the {0,0,0} seed color; the desktop export drew the seed).
const TASK = 'final-fixes-2'
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
// Light → Dark pairs edited in this task (Dark IDs from tasks/export-pngs.js MAP).
const PAIRS = []
const pair = (l, d) => { PAIRS.push([l, d]); return l }

const LICENSE_MIT_RNSVG = `The MIT License (MIT)

Copyright (c) [2015-2016] [Horcrux]

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`
const USDC = '0x1c7D 4B19 6Cb0 C7B0 1d74 3Fbc 6116 a902 379C 7238'.split(' ')
const ETH_BAL = '1.284732'

const STEPS = {
  async s65b() { // copyright line shown once (header line); body keeps the rest of the licence text verbatim
    const f = await node('526:55042')
    const t = byName(f, 'License text'); await setText(t, LICENSE_MIT_RNSVG.replace('Copyright (c) [2015-2016] [Horcrux]\n\n', ''))
    PAIRS.push([f.id, '526:55830']); return t.id
  },
  async reason() {
    const f = await node('526:55172'); const t = byName(f, 'Reason text'); await setText(t, '수수료 한도가 부족했어요.'); PAIRS.push([f.id, '526:57104']); return t.id
  },
  async rechk() {
    const sl = await node('486:17420')
    return await note(sl, await node('461:5074'), '다시 확인하는 중: 안내 줄 아이콘은 작은 spinner(회전 1 s, linear). 움직임 줄이기에서는 회전하지 않는 정지 아이콘. 버튼이 꺼져 있으니 "보내면 취소할 수 없어요" 캡션은 숨겨요.')
  },
  async redark() {
    for (const p of [['423:13750', '430:15617'], ['515:29238', '515:30619'], ['423:643', '430:14732'], ['457:17502', '494:17808'], ['457:4412', '494:18069'], ['457:17613', '494:18109'], ['526:55499', '526:57681']]) PAIRS.push(p)
    return 'queued'
  }
}
// Repaint bound paints whose stored color differs from the resolved value (whole page).
async function repaint(page) {
  await figma.setCurrentPageAsync(page)
  let n = 0; const ids = []
  const near = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.01
  for (const x of page.findAll(k => 'fills' in k)) {
    for (const key of ['fills', 'strokes']) {
      const ps = x[key]; if (!Array.isArray(ps) || !ps.length) continue
      let changed = false
      const np = ps.map(p => {
        const id = p.type === 'SOLID' && p.boundVariables?.color?.id; if (!id) return p
        const v = L.byId[id]; if (!v) return p
        const res = v.resolveForConsumer(x).value
        if (!res || typeof res !== 'object' || near(res, p.color)) return p
        changed = true; return figma.variables.setBoundVariableForPaint({ ...p, color: rgb(res) }, 'color', v)
      })
      if (changed) { try { if (x.type === 'TEXT') for (const f of x.getRangeAllFontNames(0, x.characters.length)) await figma.loadFontAsync(f); x[key] = np; n++; if (ids.length < 20) ids.push(x.id) } catch (e) { ids.push('ERR ' + x.id + ' ' + String(e).slice(0, 60)) } }
    }
  }
  return { n, ids }
}

async function run() {
  await init()
  const out = { steps: {}, errors: {}, dark: {}, repaint: {} }
  const only = typeof ONLY !== 'undefined' ? ONLY : Object.keys(STEPS)
  const PAGE_OF = { s65b: '486:17443', reason: '486:17419', rechk: '486:17419', redark: '486:17419',  s90: '486:17443', s60: '486:17443', s61: '486:17443', s64: '486:17443', s65: '486:17443', balances: '486:76', emptyHome: '486:76', asset: '486:76', notesHome: '486:76', s20a: '486:17419', token: '486:17419', review: '486:17419', s23: '486:17419', s23reason: '486:17419', s24: '486:17419', s31: '486:17419', notesSend: '486:17419', s41full: '486:17436' }
  for (const k of only) {
    try { await figma.setCurrentPageAsync(await node(PAGE_OF[k])); out.steps[k] = await STEPS[k]() } catch (e) { out.errors[k] = String(e && e.stack || e).slice(0, 400) }
  }
  if (typeof NO_DARK === 'undefined') {
    const seen = new Set()
    for (const [l, d, sec] of PAIRS) {
      if (seen.has(l)) continue; seen.add(l)
      try {
        const ln = await node(l); let p = ln; while (p.type !== 'PAGE') p = p.parent
        if (figma.currentPage !== p) await figma.setCurrentPageAsync(p)
        const dsec = sec || (d ? (await node(d)).parent : null)
        out.dark[l] = await syncDark(l, d, dsec)
        if (sec) growSection(sec)
      } catch (e) { out.errors['dark ' + l] = String(e).slice(0, 200) }
    }
  }
  if (typeof NO_REPAINT === 'undefined') for (const id of ['485:76', '486:76', '486:17419', '486:17436', '486:17443']) { try { out.repaint[id] = await repaint(await node(id)) } catch (e) { out.errors['repaint ' + id] = String(e).slice(0, 200) } }
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
