// VaultMe Local Runner: TASK s05-cells (#54). S05 restore per-word cells + optional passphrase (outputs/design/redesign-b.md §9.3,
// owner rows 2026-10-17). New B/Word cell, B/Input trailing action, 3 Solar icons; S05 frames rebuilt (old ones archived); Dark re-cloned; repaint.
const TASK = 's05-cells'
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
function growSection(section) {
  const r = Math.max(...section.children.map(c => c.x + c.width)) + 100, b = Math.max(...section.children.map(c => c.y + c.height)) + 100
  section.resizeWithoutConstraints(Math.max(section.width, r), Math.max(section.height, b))
}
async function cloneTo(srcId, section, name, x, y) {
  let f = section.children.find(c => c.name === name)
  if (f) f.remove()
  f = (await node(srcId)).clone(); section.appendChild(f); f.name = name; f.x = x; f.y = y
  return f
}
async function rowLabel(section, srcLabelId, text, x, y) {
  const name = 'Row label · ' + text; let t = section.children.find(c => c.name === name)
  if (!t) { t = (await node(srcLabelId)).clone(); section.appendChild(t); t.name = name }
  await setText(t, text); t.x = x; t.y = y; return t.id
}
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

function strokeR(n, name) {
  const v = V(name)
  n.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }, 'color', v)]
  const res = v.resolveForConsumer(n).value
  if (res && typeof res === 'object') n.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb(res) }, 'color', v)]
}
const PAIRS = []
const ARCHIVE = 'Archive · 14 Removed frames'
const W = 'abandon'
const L12 = [...Array(11).fill(W), 'about'] // public BIP39 test vector (AGENTS rule 4 exception)
const BODY = '복구 구문 단어를 순서대로 입력하세요.'
const MSG_UNKNOWN = '3번째 단어가 BIP39 목록에 없어요'
const MSG_CHECKSUM = '단어나 순서가 맞지 않아요. 복구 구문을 다시 확인하세요.'
const PASS_ROW = '고급 · 패스프레이즈 입력'
const PASS_HELPER = '패스프레이즈를 썼던 지갑만 입력하세요. 틀리면 다른 주소가 나와요.'
const S06_LINE = '패스프레이즈로 복구했어요.'
const BUSY = 'Busy(Loading): 버튼 안 spinner가 회전해요(0→360°, 800 ms, linear, 반복, transform만). 버튼 폭은 그대로. 움직임 줄이기: 회전 없음, 정지 spinner + "복구하는 중…". haptic 없음. accessibilityState busy.'
const SVG = {
  eyeClosed: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="#000" stroke-linecap="round" stroke-width="1.5" d="M12 14C5 14 2 7 2 7M22 7C22 7 21.0586 9.19661 19 11.1288C18.0872 11.9856 16.9547 12.7904 15.5872 13.3287C14.5334 13.7435 13.34 14 12 14M12 14V16.5M15.5872 13.3287L17 15.5M19 11.1288L20.5 12.6288M8.41281 13.3287L7 15.5M5 11.1288L3.5 12.6288"/></svg>',
  expand: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9L12 15L5 9"/></svg>',
  collapse: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 15L12 9L5 15"/></svg>'
}
const ID = {}

const STEPS = {
  async icons() { // Solar Linear 20, outlined strokes, icon/action/fg (same build as 09 Icons)
    const pg = await node('137:2'), out = {}
    async function mk(key, name, art, svg, x, y, desc) {
      let c = pg.children.find(n => n.type === 'COMPONENT' && n.name === name)
      if (!c) {
        c = figma.createComponent(); pg.appendChild(c); c.name = name; c.resize(20, 20); c.fills = []; c.x = x; c.y = y
        const f = figma.createNodeFromSvg(svg); f.name = 'Artwork / ' + art; f.fills = []; c.appendChild(f); f.x = 0; f.y = 0
        for (const v of f.findAll(n => n.type === 'VECTOR')) { const o = v.outlineStroke(); if (o) { f.appendChild(o); o.x = v.x; o.y = v.y; o.name = 'Vector (Stroke)'; o.strokes = []; fillR(o, 'icon/action/fg'); v.remove() } }
        c.description = desc
      }
      ID[key] = c.id; out[key] = c.id
    }
    await mk('eyeClosed', 'Icon / settings / eye-closed', 'solar:eye-closed-linear', SVG.eyeClosed, 2160, 340, 'Solar eye-closed-linear (Linear). CC BY 4.0, 480 Design. Fill icon/action/fg. S05 passphrase: shown state, action = 숨기기.')
    await mk('expand', 'Icon / navigation / expand', 'solar:alt-arrow-down-linear', SVG.expand, 1772, 1060, 'Solar alt-arrow-down-linear (Linear). CC BY 4.0, 480 Design. Fill icon/action/fg. Collapsed disclosure row (S05 고급).')
    await mk('collapse', 'Icon / navigation / collapse', 'solar:alt-arrow-up-linear', SVG.collapse, 1772, 1140, 'Solar alt-arrow-up-linear (Linear). CC BY 4.0, 480 Design. Fill icon/action/fg. Expanded disclosure row (S05 고급).')
    return out
  },
  async wordCell() { // new B/Word cell (States Empty / Focus / Filled / Error), bound to input/* variables
    const sec = await node('398:77')
    let set = sec.children.find(n => n.type === 'COMPONENT_SET' && n.name === 'B/Word cell')
    if (set) { ID.wc = set.id; return { reused: set.id } }
    const states = ['Empty', 'Focus', 'Filled', 'Error'], comps = []
    for (const st of states) {
      const c = figma.createComponent(); c.name = 'State=' + st
      c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.resize(175, 48); c.counterAxisAlignItems = 'CENTER'
      bind(c, 'itemSpacing', 'space/2'); pad(c, 'space/3', 'space/3', 'space/3', 'space/3')
      for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bind(c, k, 'input/radius')
      fillR(c, 'input/bg/default'); strokeR(c, st === 'Focus' ? 'input/border/focus' : st === 'Error' ? 'input/border/error' : 'input/border/default'); c.strokeAlign = 'INSIDE'
      for (const k of ['strokeTopWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'strokeRightWeight']) bind(c, k, 'input/borderWidth')
      const num = await txt('1', 'Product B/Caption', 'text/tertiary', 'Number'); c.appendChild(num); num.resize(20, num.height); num.textAutoResize = 'HEIGHT'
      const entry = al('HORIZONTAL', 'Entry', {}); c.appendChild(entry); entry.layoutSizingHorizontal = 'FILL'; entry.counterAxisAlignItems = 'CENTER'
      const w = await txt(st === 'Empty' ? ' ' : st === 'Focus' ? 'aban' : st === 'Error' ? 'abandn' : W, 'Product B/Body', 'input/fg', 'Word'); entry.appendChild(w)
      const r = figma.createRectangle(); r.name = 'Caret'; r.resize(2, 20); fillR(r, 'input/border/focus'); entry.appendChild(r); r.visible = st === 'Focus'
      comps.push(c)
    }
    set = figma.combineAsVariants(comps, sec); set.name = 'B/Word cell'
    comps.forEach((c, i) => { c.x = 24 + i * 199; c.y = 24 })
    set.resizeWithoutConstraints(24 + 4 * 199, 96)
    const kN = set.addComponentProperty('Number', 'TEXT', '1'), kW = set.addComponentProperty('Word', 'TEXT', W)
    for (const c of comps) {
      c.findOne(n => n.name === 'Number').componentPropertyReferences = { characters: kN }
      if (c.name !== 'State=Empty') c.findOne(n => n.name === 'Word').componentPropertyReferences = { characters: kW }
    }
    const bottom = Math.max(...sec.children.filter(n => n !== set).map(n => n.y + n.height))
    set.x = 100; set.y = bottom + 120
    growSection(sec)
    set.description = 'Restore word cell (S05, 2026-10-17). One BIP39 word per cell; Number label left (fixed 20 wide) is also the accessibility label "N번째 단어". State=Empty / Focus (input/border/focus + caret) / Filled / Error (input/border/error only; the message goes under the grid, never inside the cell). Height 48 (padding space/3 + Body 24), touch ≥44. Keyboard: ascii, lowercase, autoCapitalize none, autoCorrect and suggestions off. Space or Return = next cell, Return on the last cell closes the keyboard, Backspace in an empty cell = previous cell. Pasting a full phrase into any cell splits on spaces/newlines and fills from cell 1 (12 or 24 words also set the count). Focus border change 150 ms ease-out; Reduce Motion: instant. No haptic. Figma uses only the public BIP39 test vector.'
    ID.wc = set.id
    return { set: set.id, variants: comps.map(c => c.id) }
  },
  async inputAction() { // B/Input: optional trailing action icon (Kind=Text) for the secure passphrase field
    const set = await node('421:805')
    const defs = set.componentPropertyDefinitions
    let kS = Object.keys(defs).find(k => k.split('#')[0] === 'Show action'), kI = Object.keys(defs).find(k => k.split('#')[0] === 'Action icon')
    if (!kS) kS = set.addComponentProperty('Show action', 'BOOLEAN', false)
    if (!kI) kI = set.addComponentProperty('Action icon', 'INSTANCE_SWAP', '516:253')
    const eye = await node('516:253'), out = []
    for (const v of set.children.filter(c => /^Kind=Text, /.test(c.name))) {
      const field = byName(v, 'Field')
      let ic = field.children.find(c => c.name === 'Action icon')
      if (!ic) { ic = eye.createInstance(); field.appendChild(ic); ic.name = 'Action icon'; bind(ic, 'width', 'icon/size/control'); bind(ic, 'height', 'icon/size/control') }
      ic.componentPropertyReferences = { visible: kS, mainComponent: kI }
      out.push(ic.id)
    }
    set.description = (set.description.replace(/\nShow action \(2026-10-17\)[\s\S]*$/, '') + '\nShow action (2026-10-17): Kind=Text only. Trailing icon button inside the field (Action icon, default Icon / settings / eye). S05 passphrase: masked = eye (보기), shown = eye-closed (숨기기). Hit area 44×44 around the 20 icon. Accessibility label "패스프레이즈 보기" / "패스프레이즈 숨기기". No haptic.').trim()
    return out
  },
  async onboarding() {
    const sl = await node('485:77'), sd = await node('485:78'), out = { frames: {}, archived: [] }
    // 1. archive the superseded S05 frames from 987336c (Light + Dark), their notes and row labels; keep a copy of the old single-field S05
    const ap = figma.root.children.find(p => p.name === ARCHIVE); await ap.loadAsync()
    let ax = Math.max(0, ...ap.children.map(c => c.x + c.width)) + 200, ay = 0
    const toArchive = []
    if (!ap.children.find(c => c.name === 'B-S05 복구 입력 · 이전 단일 입력')) {
      for (const [id, nm] of [['423:15293', 'B-S05 복구 입력 · 이전 단일 입력'], ['430:16003', 'B-S05 복구 입력 · 이전 단일 입력 · Dark']]) { const c = (await node(id)).clone(); c.name = nm; toArchive.push(c) }
    }
    for (const id of ['555:70662', '555:70712', '555:70762', '555:70817', '555:70869', '555:70921', '555:70973', '555:71032', '555:69661', '555:69686', '555:69711', '555:69736', '555:69761', '555:69786', '555:69811', '555:69838']) { const n = await figma.getNodeByIdAsync(id); if (n && n.parent && n.parent.type === 'SECTION') toArchive.push(n) }
    const textsToArchive = []
    for (const id of ['555:68893', '555:68944', '555:69000', '555:69053', '555:69106', '555:69159', '555:69219', '555:69279', '555:65394', '555:65395']) { const n = await figma.getNodeByIdAsync(id); if (n && n.parent && n.parent.type === 'SECTION') textsToArchive.push(n) }
    for (const n of toArchive) { ap.appendChild(n); n.x = ax; n.y = ay; ax += n.width + 80; out.archived.push(n.id) }
    let tx = ax
    for (const n of textsToArchive) { ap.appendChild(n); n.x = tx; n.y = ay; tx += 420; out.archived.push(n.id) }
    // 2. build
    const chipSet = await node('421:812'), bbtn = await node('398:247'), wc = await node(ID.wc), inSet = await node('421:805'), srC = await node('426:2045'), banSet = await node('399:122')
    const eye = await node('516:253'), eyeC = await node(ID.eyeClosed), exp = await node(ID.expand), col = await node(ID.collapse)
    const mainBtn = f => one(f, n => n.type === 'INSTANCE' && n.name === 'Button / Primary', 'Button / Primary')
    async function build(f, o) {
      const content = one(f, n => n.name === 'Content' && n.type === 'FRAME', 'Content')
      for (const c of [...content.children]) if (c.name !== 'Title block') c.remove()
      await setText(byName(byName(content, 'Title block'), 'Body'), BODY)
      if (o.banner) {
        const w = al('VERTICAL', 'Banner wrap', { pad: [null, 'layout/screen/padding', null, 'layout/screen/padding'] }); content.appendChild(w); w.layoutSizingHorizontal = 'FILL'
        const bi = banSet.children.find(x => x.name === 'Tier=Banner, Tone=Danger').createInstance(); w.appendChild(bi); bi.layoutSizingHorizontal = 'FILL'
        setP(bi, { Title: o.banner[0], 'Show title': true, Message: o.banner[1], 'Show link': false }); bi.name = 'Banner Danger'
      }
      const ph = al('VERTICAL', 'Phrase', { gap: 'layout/rowGap', pad: [null, 'layout/screen/padding', null, 'layout/screen/padding'] }); content.appendChild(ph); ph.layoutSizingHorizontal = 'FILL'
      const row = al('HORIZONTAL', 'Count row', {}); ph.appendChild(row); row.layoutSizingHorizontal = 'FILL'; row.primaryAxisAlignItems = 'SPACE_BETWEEN'; row.counterAxisAlignItems = 'CENTER'
      const chips = al('HORIZONTAL', 'Word count', { gap: 'layout/fieldGap' }); row.appendChild(chips)
      for (const [n, label] of [[12, '12단어'], [24, '24단어']]) { const ci = chipSet.children.find(c => c.name === 'State=' + (o.count === n ? 'Selected' : 'Default')).createInstance(); chips.appendChild(ci); setP(ci, { Label: label }); ci.name = 'Chip ' + label }
      const paste = bbtn.children.find(c => c.name === 'Type=Ghost, Size=sm, State=Default').createInstance(); row.appendChild(paste); setP(paste, { Label: '붙여넣기', 'Show icon': false }); paste.name = 'Button 붙여넣기'
      fillR(byName(paste, 'Label'), 'text/link') // critique: read as an action, not a third chip
      const grid = al('HORIZONTAL', 'Word grid', { gap: 'layout/fieldGap' }); ph.appendChild(grid); grid.layoutSizingHorizontal = 'FILL'
      const half = o.count / 2
      for (let k = 0; k < 2; k++) {
        const cf = al('VERTICAL', 'Column ' + (k + 1), { gap: 'layout/fieldGap' }); grid.appendChild(cf); cf.layoutSizingHorizontal = 'FILL'
        for (let i = 0; i < half; i++) {
          const idx = k * half + i, [w, st] = o.words[idx]
          const inst = wc.children.find(c => c.name === 'State=' + st).createInstance(); cf.appendChild(inst); inst.layoutSizingHorizontal = 'FILL'
          setP(inst, st === 'Empty' ? { Number: String(idx + 1) } : { Number: String(idx + 1), Word: w }); inst.name = 'Word ' + (idx + 1)
        }
      }
      if (o.msg) await wrapTxt(ph, o.msg, 'Product B/Body Small', 'input/errorText', 'Grid message')
      const pp = al('VERTICAL', 'Passphrase', {}); content.appendChild(pp); pp.layoutSizingHorizontal = 'FILL'
      const sr = srC.createInstance(); pp.appendChild(sr); sr.layoutSizingHorizontal = 'FILL'
      setP(sr, { Title: PASS_ROW, 'Show value': false, 'Show chevron': true, 'Show icon': false }); sr.name = 'Row 고급 패스프레이즈'
      const ch = byName(sr, 'Chevron'); const cv = ch.findOne(n => n.type === 'VECTOR'); const cvar = cv && cv.fills[0] && cv.fills[0].boundVariables && cv.fills[0].boundVariables.color && L.byId[cv.fills[0].boundVariables.color.id].name
      ch.swapComponent(o.pass ? col : exp); for (const x of ch.findAll(n => n.type === 'VECTOR')) fillR(x, cvar || 'icon/tertiary')
      if (o.pass) {
        const inp = inSet.children.find(c => c.name === 'Kind=Text, State=Default').createInstance(); pp.appendChild(inp); inp.layoutSizingHorizontal = 'FILL'; inp.name = 'Input 패스프레이즈'
        setP(inp, { Label: '패스프레이즈', Value: o.pass === 'masked' ? '•••••••' : W, Helper: PASS_HELPER, 'Show helper': true, 'Show action': true, 'Action icon': o.pass === 'masked' ? eye.id : eyeC.id })
        fillR(byName(inp, 'Value'), 'input/fg')
      }
      const b = mainBtn(f); b.setProperties({ State: o.btn })
      // fit: frames whose content is taller than the viewport are drawn at full scroll length
      content.layoutSizingVertical = 'HUG'; const need = content.height; content.layoutSizingVertical = 'FILL'
      f.resize(390, Math.max(844, 205 + need)) // taller content is drawn at full scroll length; the 복구 bar stays pinned in the app
      return Math.round(need)
    }
    const X = i => 100 + i * 470
    const Y = { A: 5476, B: 6656, C: 7836 }
    await rowLabel(sl, '485:83', 'S05 복구 입력 · 단어 칸 · 입력과 진행', 100, Y.A - 48)
    await rowLabel(sl, '485:83', 'S05 복구 입력 · 오류와 Banner', 100, Y.B - 48)
    await rowLabel(sl, '485:83', 'S05 패스프레이즈 · 24단어 · S06 패스프레이즈', 100, Y.C - 48)
    const filled = arr => arr.map(w => [w, 'Filled'])
    const empty12 = Array.from({ length: 12 }, () => [' ', 'Empty'])
    // base (keeps 423:15293 / 430:16003)
    const base = await node('423:15293')
    out.frames.base = [base.id, await build(base, { count: 12, words: empty12, btn: 'Disabled' })]
    PAIRS.push(['423:15293', '430:16003'])
    await note(sl, base, '번호 붙은 단어 칸(B/Word cell) 12개, 2열(왼쪽 1–6, 오른쪽 7–12). 초점 순서는 번호 순. 칩 "12단어"/"24단어"(radiogroup)로 칸 수를 바꿔요. 바꿔도 입력한 단어는 지우지 않아요(12로 줄이면 13–24번은 숨기고 복구에 쓰지 않아요). 키보드: 영문 소문자, 자동 대문자·자동 수정·추천 끔. 스페이스·엔터 = 다음 칸. 마지막 칸 엔터 = 키보드 닫기(복구는 버튼으로만). 빈 칸에서 지우기 = 이전 칸. 어느 칸에든 구문 전체를 붙여넣으면 띄어쓰기·줄바꿈으로 나눠 1번 칸부터 채워요. 12·24단어면 칸 수도 맞춰요. "붙여넣기" 버튼도 같아요. 화면을 떠나거나 앱이 background로 가면 모두 지워요. 기록·로그 없음.')
    const mk = async (name, x, y, o, text) => {
      const f = await cloneTo('423:15293', sl, 'B-S05 복구 입력 · ' + name, x, y)
      const need = await build(f, o); PAIRS.push([f.id, null, sd]); out.frames[f.name] = [f.id, need, Math.round(f.height)]
      await note(sl, f, text); return f
    }
    await mk('입력 중', X(0), Y.A, { count: 12, words: [...filled([W, W, W, W]), ['aban', 'Focus'], ...empty12.slice(5)], btn: 'Disabled' },
      'focus 칸만 input/border/focus 테두리 + caret(테두리 전환 150 ms ease-out, 움직임 줄이기: 바로 바뀜). 키보드가 올라오면 Content를 스크롤해서 focus 칸이 키보드와 "복구" 버튼 바(키보드 위에 붙어요) 위로 16 pt 이상 보이게 해요. 다음 칸으로 갈 때도 같아요. 입력 중인 칸은 판단하지 않아요. 칸을 떠날 때(스페이스·엔터·다른 칸 누름) BIP39 목록을 확인해요. haptic 없음. screen reader 칸 이름 "N번째 단어".')
    await mk('모든 단어', X(1), Y.A, { count: 12, words: filled(L12), btn: 'Default' },
      '모든 칸이 BIP39 단어이고 checksum이 맞으면 "복구"가 켜져요. 패스프레이즈 행은 접힌 상태(기본). 누르면 펼쳐져요(200 ms ease-out 높이 + 페이드, chevron 아래 → 위. 움직임 줄이기: 바로 펼침). haptic 없음. 예시는 공개 test vector(abandon … about)예요.')
    await mk('복구 중', X(2), Y.A, { count: 12, words: filled(L12), btn: 'Loading' },
      'OS 인증 뒤 저장하는 동안. 칸·칩·붙여넣기·패스프레이즈 행은 잠가요. ' + BUSY)
    const unk = filled(L12); unk[2] = ['abandn', 'Error']
    await mk('모르는 단어', X(0), Y.B, { count: 12, words: unk, msg: MSG_UNKNOWN, btn: 'Disabled' },
      '틀린 칸만 Error(input/border/error). 메시지는 grid 아래 한 줄(input/errorText). 틀린 칸이 여러 개면 모두 표시하고 메시지는 첫 번째 칸 번호. 칸을 고치면 바로 사라져요. haptic·흔들기 없음. screen reader가 메시지를 읽어요(live region polite). "복구" 꺼짐.')
    await mk('순서 오류', X(1), Y.B, { count: 12, words: filled(Array(12).fill(W)), msg: MSG_CHECKSUM, btn: 'Disabled' },
      '모든 칸이 BIP39 단어인데 checksum이 틀릴 때. 어느 칸인지 알 수 없어서(BIP39 checksum은 전체로만 확인) 칸은 표시하지 않고 grid 아래 메시지만. 마지막 칸을 떠난 뒤 보여요. 단어를 고치면 사라져요. 예시 abandon ×12는 checksum이 틀린 공개 예시예요.')
    await mk('이미 지갑 있음', X(2), Y.B, { count: 12, words: filled(L12), btn: 'Default', banner: ['이 기기에 이미 지갑이 있어요', '한 기기에는 지갑 하나만 둘 수 있어요.'] },
      '복구를 막는 상황이라 Banner(Danger)를 제목 바로 아래에 둬요(스크롤 없이 보여요). 입력은 지우지 않아요. haptic notificationError 1회. 스크롤한 전체 길이(고급 행까지).')
    await mk('저장 실패', X(3), Y.B, { count: 12, words: filled(L12), btn: 'Default', banner: ['지갑을 복구하지 못했어요', '기기에 화면 잠금을 설정한 뒤 다시 시도하세요.'] },
      '키 저장 실패(기기 화면 잠금 없음 등). Banner(Danger)는 제목 아래. 입력은 그대로, "복구"로 다시 시도. haptic notificationError 1회. 스크롤한 전체 길이(고급 행까지).')
    await mk('패스프레이즈 가림 · 전체', X(0), Y.C, { count: 12, words: filled(L12), btn: 'Default', pass: 'masked' },
      '고급 행을 펼친 상태(스크롤한 전체 길이, "복구" 바는 화면 아래 고정). 펼치면 패스프레이즈 칸에 focus + 키보드, 칸이 키보드 위로 보이게 스크롤해요. 기본은 가림(secureTextEntry). 눈 아이콘(보기)을 누르면 보여요. 자동 수정·자동 대문자·추천 끔. 띄어쓰기·대소문자를 그대로 써요(BIP39 NFKD). 빈 칸 = 패스프레이즈 없음. 행을 다시 접으면 입력한 패스프레이즈를 지워요(안 보이는 값이 복구에 쓰이지 않게). 새 지갑 만들기에는 없어요. 이전 "패스프레이즈는 지원하지 않아요" 안내는 없앴어요(Q40 변경).')
    await mk('패스프레이즈 보기 · 전체', X(1), Y.C, { count: 12, words: filled(L12), btn: 'Default', pass: 'shown' },
      '보기 상태. 아이콘이 eye-closed(숨기기)로 바뀌어요. 아이콘 누름 영역 44×44. screen reader "패스프레이즈 보기" / "패스프레이즈 숨기기". 앱이 background로 가면 입력을 모두 지워요. haptic 없음. 예시 값은 공개 test vector 단어예요(실제 패스프레이즈 금지).')
    await mk('24단어 · 입력 중 · 전체', X(2), Y.C, { count: 24, words: [...filled(Array(12).fill(W)), ['ab', 'Focus'], ...Array.from({ length: 11 }, () => [' ', 'Empty'])], btn: 'Disabled' },
      '"24단어" 선택(또는 24단어 붙여넣기). 칸 24개, 2열(1–12, 13–24). 스크롤한 전체 길이. 13번 칸 입력 중: focus 칸이 키보드 위로 보이게 자동 스크롤. 예시는 공개 test vector 단어만 써요.')
    // S06 with passphrase
    const s6 = await cloneTo('423:13703', sl, 'B-S06 복구 결과 · 패스프레이즈', X(3), Y.C)
    const tb = byName(s6, 'Title block'); if (!tb.children.find(c => c.name === 'Body')) await wrapTxt(tb, S06_LINE, 'Product B/Body', 'text/secondary', 'Body')
    PAIRS.push([s6.id, null, sd]); out.frames[s6.name] = [s6.id]
    await note(sl, s6, '패스프레이즈를 입력해 복구했을 때만 제목 아래 "패스프레이즈로 복구했어요." 줄을 보여요. 전체 주소로 기존 지갑과 같은지 확인해요(패스프레이즈가 틀리면 다른 주소). 예시 주소는 공개 test vector 주소예요(설명용).')
    growSection(sl); growSection(sd)
    return out
  }
}

async function run() {
  await init()
  const out = { steps: {}, errors: {}, dark: {}, repaint: {} }
  const only = typeof ONLY !== 'undefined' ? ONLY : Object.keys(STEPS)
  const PAGE_OF = { icons: '137:2', wordCell: '398:76', inputAction: '398:76', onboarding: '485:76' }
  if (!only.includes('icons')) { const pg = await node('137:2'); await figma.setCurrentPageAsync(pg); for (const [k, n] of [['eyeClosed', 'Icon / settings / eye-closed'], ['expand', 'Icon / navigation / expand'], ['collapse', 'Icon / navigation / collapse']]) { const c = pg.children.find(x => x.name === n); if (c) ID[k] = c.id } }
  if (!only.includes('wordCell')) { const pg = await node('398:76'); await figma.setCurrentPageAsync(pg); const s = (await node('398:77')).children.find(x => x.name === 'B/Word cell'); if (s) ID.wc = s.id }
  for (const k of only) {
    try { await figma.setCurrentPageAsync(await node(PAGE_OF[k])); out.steps[k] = await STEPS[k]() } catch (e) { out.errors[k] = (String(e) + ' | ' + String(e && e.stack)).slice(0, 600); break }
  }
  if (typeof NO_DARK === 'undefined') {
    const seen = new Set()
    for (const [l, d, sec] of PAIRS) {
      if (seen.has(l)) continue; seen.add(l)
      try {
        const ln = await node(l); let p = ln; while (p.type !== 'PAGE') p = p.parent
        if (figma.currentPage !== p) await figma.setCurrentPageAsync(p)
        const dsec = sec || (d ? (await node(d)).parent : null)
        out.dark[ln.name] = await syncDark(l, d, dsec)
        if (sec) growSection(sec)
      } catch (e) { out.errors['dark ' + l] = String(e).slice(0, 200) }
    }
  }
  if (typeof NO_REPAINT === 'undefined') for (const id of ['137:2', '398:76', '485:76']) { try { const n = await node(id); out.repaint[id] = await repaint(n.type === 'PAGE' ? n : (() => { let p = n; while (p.type !== 'PAGE') p = p.parent; return p })()) } catch (e) { out.errors['repaint ' + id] = String(e).slice(0, 200) } }
  out.ids = ID
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
