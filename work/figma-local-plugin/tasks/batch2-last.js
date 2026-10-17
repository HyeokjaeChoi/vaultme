// VaultMe Local Runner: runs one task in the desktop app (local fonts load here), logs to sharedPluginData 'vaultme'/'log'.
// ---- shared helpers (VaultMe Redesign B batch 1) ----
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
const V = n => { const v = L.v[n]; if (!v) throw new Error('missing var ' + n); return v }
const S = n => { const s = L.s[n]; if (!s) throw new Error('missing style ' + n); return s }
const node = async id => { const n = await figma.getNodeByIdAsync(id); if (!n) throw new Error('missing node ' + id); return n }
function paint(name) { return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(name)) }
function fill(n, name) { n.fills = [paint(name)] }
function bind(n, field, name) { n.setBoundVariable(field, V(name)) }
function pad(n, t, r, b, l) { const m = { paddingTop: t, paddingRight: r, paddingBottom: b, paddingLeft: l }; for (const k in m) if (m[k]) bind(n, k, m[k]); else n[k] = 0 }
function rad(n, name) { for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bind(n, k, name) }
function al(dir, name, o = {}) {
  const f = figma.createFrame(); f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.name = name; f.fills = []
  if (o.gap) bind(f, 'itemSpacing', o.gap); else f.itemSpacing = 0
  if (o.pad) pad(f, ...o.pad)
  if (o.fill) fill(f, o.fill)
  if (o.align) f.primaryAxisAlignItems = o.align
  if (o.cross) f.counterAxisAlignItems = o.cross
  f.clipsContent = false
  return f
}
async function txt(chars, style, color, name) {
  const t = figma.createText(); await t.setTextStyleIdAsync(S(style).id); t.characters = chars; fill(t, color); t.name = name || chars.slice(0, 24); return t
}
function add(parent, child, h, v) { parent.appendChild(child); if (h) child.layoutSizingHorizontal = h; if (v) child.layoutSizingVertical = v; return child }
async function wrapTxt(parent, chars, style, color, name, align) { const t = await txt(chars, style, color, name); parent.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; if (align) t.textAlignHorizontal = align; return t }
async function findComp(set, props) {
  const s = await node(set)
  if (s.type === 'COMPONENT') return s
  const c = s.children.find(c => Object.entries(props).every(([k, v]) => c.variantProperties[k] === v))
  if (!c) throw new Error('no variant ' + JSON.stringify(props) + ' in ' + s.name)
  return c
}
// set text/boolean props by short name (prefix before #)
function setP(inst, short) {
  const defs = inst.componentProperties, out = {}
  for (const [k, v] of Object.entries(short)) { const key = Object.keys(defs).find(d => d.split('#')[0] === k); if (!key) throw new Error('no prop ' + k + ' on ' + inst.name); out[key] = v }
  inst.setProperties(out); return inst
}
async function inst(setId, variant, props, name) { const c = await findComp(setId, variant || {}); const i = c.createInstance(); if (props) setP(i, props); if (name) i.name = name; return i }
// ---- screen builders ----
const C = { band: '494:341', bh: '494:342', chip: '494:1067', addr: '494:1090', hero: '494:1142', prog: '494:1176', badge: '495:358', row: '418:12824', notice: '399:122', detail: '399:129', primary: '9:283', secondary: '9:284', ghost: '9:285', eth: '137:402', usdc: '137:429', empty: '422:674', receive: '137:24' }
const T = {}
const ADDR = { r: '0x1234 5678 9abc def0 1234 5678 9abc def0 1234 5678', look: '0x1234 5678 9abd d3f0 1234 5678 9abc de0f 1234 5678', burn: '0x0000 0000 0000 0000 0000 0000 0000 0000 0000 dead', token: '0xc0de c0de c0de c0de c0de c0de c0de c0de c0de c0de', my: '0x9858 EfFD 232B 4033 E47d 9000 3D41 EC34 EcaE da94' }
const HASH = '0xa1b2 c3d4 e5f6 0718 293a 4b5c 6d7e 8f90 a1b2 c3d4 e5f6 0718 293a 4b5c 6d7e 8f90'
async function templates() {
  // clone pristine templates once per run, parked off-canvas inside a temp frame
  const park = figma.createFrame(); park.name = '__tmp'; park.visible = false; T.park = park
  const src = await node('404:315'); const nav = src.findOne(n => n.type === 'FRAME' && n.name === 'Nav').clone(); park.appendChild(nav); T.nav = nav
  const act = src.findOne(n => n.type === 'FRAME' && n.name === 'Actions').clone(); park.appendChild(act); act.children.forEach(c => c.remove()); T.act = act
}
const band = async () => (await findComp(C.band, {})).createInstance()
async function bh(title, link) { const i = (await findComp(C.bh, {})).createInstance(); setP(i, { Title: title, Link: link || '', 'Show link': !!link }); i.name = 'Header ' + title; return i }
async function chip(tone, label) { return inst(C.chip, { Tone: tone }, { Label: label }, 'Chip ' + label) }
async function chips(list) { const f = al('HORIZONTAL', 'Chips', { gap: 'space/1_5', cross: 'CENTER' }); for (const [t, l] of list) f.appendChild(await chip(t, l)); return f }
async function address(str, size, diff) {
  const g = str.split(' '); const i = await inst(C.addr, { Size: size || 'M' }); const p = {}; g.forEach((x, k) => p['Group ' + (k + 1)] = x); setP(i, p); i.name = 'Address'
  for (const k of diff || []) { const t = i.findOne(n => n.name === 'G' + k); await t.setTextStyleIdAsync(S('Product B/Address M diff').id); fill(t, 'status/danger/fg') }
  return i
}
async function detail(label, value, o = {}) { const i = await inst(C.detail, { Kind: o.addr ? 'Address' : 'Text', Emphasis: o.em ? 'On' : 'Off' }); const p = { Label: label, 'Show sub value': !!o.sub }; if (o.addr) p.Address = value; else p.Value = value; if (o.sub) p['Sub value'] = o.sub; setP(i, p); i.name = 'Detail ' + label; return i }
async function notice(tier, tone, msg, link) {
  const i = await inst(C.notice, { Tier: tier, Tone: tone }); setP(i, { Message: msg, 'Show link': !!link, Link: link || '다시 확인' }); i.name = tier + ' ' + tone
  if (tier !== 'Banner') return i
  const w = al('VERTICAL', 'Banner wrap', { pad: [null, 'layout/screen/padding', null, 'layout/screen/padding'] }); add(w, i, 'FILL'); return w
}
async function btn(type, label, state, size) { const set = { Primary: C.primary, Secondary: C.secondary, Ghost: C.ghost }[type]; const sz = size || (type === 'Ghost' ? 'Medium' : 'Large'); return inst(set, { Size: sz, State: state || 'Default' }, { Label: label }, 'Button / ' + type) }
async function caption(text, color, align) { const w = al('VERTICAL', 'Caption', { pad: [null, 'layout/screen/padding', null, 'layout/screen/padding'] }); await wrapTxt(w, text, 'Product B/Caption', color || 'text/tertiary', 'Caption', align); return w }
function block(name) { return al('VERTICAL', name, { gap: 'space/2', pad: ['sectionBand/blockPaddingY', null, 'sectionBand/blockPaddingY', null] }) }
async function hero(kind, o) {
  const i = await inst(C.hero, { Kind: kind }); setP(i, { Amount: o.amount || '0.05', Unit: o.unit || 'ETH', Body: o.body || '', 'Show body': !!o.body, ...(o.title ? { Title: o.title } : {}) }); i.name = 'Amount hero'
  if (o.badge) i.findOne(n => n.name === 'Status badge').setProperties({ Kind: o.badge })
  return i
}
async function progress(step) { const i = await inst(C.prog, { Step: step }); i.name = 'Progress'; return i }
function addAll(parent, kids) { for (const k of kids) if (k) { parent.appendChild(k); try { k.layoutSizingHorizontal = 'FILL' } catch (e) {} if (k.type === 'INSTANCE' && /^(Inline|Banner|B\/Notice|Check )/.test(k.name)) { try { k.layoutSizingVertical = 'HUG' } catch (e) {} } } }
function topBar(back, chipFrame) {
  const n = T.nav.clone(); n.name = 'Nav'; n.children.filter(c => c.name === 'Chips').forEach(c => c.remove())
  if (!back) { n.children.forEach(c => c.remove()) }
  n.primaryAxisAlignItems = back ? 'SPACE_BETWEEN' : 'MAX'; n.counterAxisAlignItems = 'CENTER'
  if (!back) bind(n, 'paddingLeft', 'layout/screen/padding')
  if (chipFrame) n.appendChild(chipFrame)
  return n
}
// Rebuild Body of an existing screen frame. spec: {nav:{back,chips}, content:[nodes], actions:{caption, buttons:[...]}, grow:boolean}
async function rebuild(f, spec) {
  const body = f.children.find(c => c.name === 'Body')
  body.children.forEach(c => c.remove())
  if (spec.nav) add(body, topBar(spec.nav.back, spec.nav.chips ? await chips(spec.nav.chips) : null), 'FILL')
  const content = al('VERTICAL', 'Content'); content.clipsContent = true; add(body, content, 'FILL')
  addAll(content, spec.content)
  if (spec.actions) {
    const a = T.act.clone(); a.name = 'Actions'; add(body, a, 'FILL')
    if (spec.actions.caption) { const t = await txt(spec.actions.caption, 'Product B/Caption', 'text/secondary', 'Caption'); a.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; t.textAlignHorizontal = 'CENTER' }
    for (const b of spec.actions.buttons) { a.appendChild(b); b.layoutSizingHorizontal = 'FILL' }
  }
  if (spec.full) { f.primaryAxisSizingMode = 'AUTO'; body.layoutSizingVertical = 'HUG'; content.layoutSizingVertical = 'HUG' }
  else { body.layoutSizingVertical = 'FILL'; content.layoutSizingVertical = 'FILL' }
  return f
}
async function syncDark(lightId, darkId, darkSection) {
  const l = await node(lightId); let d
  if (darkId) { d = await node(darkId); d.children.forEach(c => c.remove()) }
  else { d = figma.createFrame(); darkSection.appendChild(d); d.x = l.x; d.y = l.y; d.name = l.name + ' · Dark' }
  d.layoutMode = l.layoutMode; d.primaryAxisSizingMode = 'FIXED'; d.resize(l.width, l.height); d.fills = l.fills; d.clipsContent = l.clipsContent
  for (const k of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'itemSpacing']) d[k] = l[k]
  for (const c of l.children) { const cl = c.clone(); d.appendChild(cl); if (c.layoutPositioning === 'ABSOLUTE') { cl.layoutPositioning = 'ABSOLUTE'; cl.x = c.x; cl.y = c.y } }
  d.setExplicitVariableModeForCollection(L.sem, '298:0'); fill(d, 'screenB/bg')
  return d.id
}
// Activity-style rows: convert Leading=Icon rows to Asset badge in place
const ROWMAP = { '보내는 중': ['eth', 'Pending', 'Pending'], '받음': ['usdc', 'Received', 'Default'], '보냄': ['eth', 'Sent', 'Default'], '보내기 실패': ['usdc', 'Failed', 'Failed'], '보내기 확인 못 함': ['eth', 'Unknown', 'Default'], '실행되지 않음': ['eth', 'Replaced', 'Failed'] }
async function convertRows(root) {
  const usdc = await node(C.usdc); let n = 0
  for (const r of root.findAll(x => x.type === 'INSTANCE' && x.name.startsWith('B/Row'))) {
    const m = await r.getMainComponentAsync(); if (!m || m.parent.id !== C.row) continue
    const P = {}; for (const [k, v] of Object.entries(r.componentProperties)) P[k.split('#')[0]] = v.value
    const map = ROWMAP[P.Title]; if (!map) continue
    r.setProperties({ Leading: 'Asset badge', State: map[2] })
    setP(r, { Title: P.Title, Subtitle: P.Subtitle, Value: P.Value, 'Show subtitle': true, 'Show sub value': false })
    if (map[0] === 'usdc') r.findOne(x => x.type === 'INSTANCE' && x.name.startsWith('Icon / Asset')).swapComponent(usdc)
    r.findOne(x => x.name === 'Badge').setProperties({ Kind: map[1] })
    if (map[1] === 'Received') fill(r.findOne(x => x.type === 'TEXT' && x.name === 'Value'), 'status/success/fg')
    n++
  }
  return n
}
async function bannerize(root) {
  let n = 0
  for (const i of root.findAll(x => x.type === 'INSTANCE' && x.name.startsWith('B/Notice inline'))) {
    const m = await i.getMainComponentAsync(); if (m.variantProperties.Tier === 'Banner') continue
    if (!/못했어요/.test(i.componentProperties[Object.keys(i.componentProperties).find(k => k.startsWith('Message'))].value)) continue
    const parent = i.parent, idx = parent.children.indexOf(i)
    i.setProperties({ Tier: 'Banner' })
    const w = al('VERTICAL', 'Banner wrap', { pad: ['space/2', 'layout/screen/padding', 'space/2', 'layout/screen/padding'] }); parent.insertChild(idx, w); w.layoutSizingHorizontal = 'FILL'; add(w, i, 'FILL'); n++
  }
  return n
}
async function titleChips(f, list) {
  const t = f.findOne(x => x.type === 'FRAME' && x.name === 'Title'); if (!t) return false
  if (t.findOne(x => x.name === 'Chips')) return true
  t.primaryAxisAlignItems = 'SPACE_BETWEEN'; t.counterAxisAlignItems = 'CENTER'; t.appendChild(await chips(list)); return true
}
async function fixMasters() {
  const s = await node(C.notice); const d = Object.keys(s.componentPropertyDefinitions); const k = p => d.find(x => x.split('#')[0] === p)
  for (const v of s.children.filter(c => c.name.startsWith('Tier=Banner'))) {
    const m = v.findOne(n => n.type === 'TEXT' && n.name === 'Message'); if (m && !m.componentPropertyReferences?.characters) m.componentPropertyReferences = { characters: k('Message') }
    const l = v.findOne(n => n.type === 'TEXT' && n.name === 'Link'); if (l && !l.componentPropertyReferences?.characters) l.componentPropertyReferences = { characters: k('Link'), visible: k('Show link') }
  }
}
const TASK = 'batch2-home-onboarding-settings'
// ---- batch 2 helpers ----
const B2 = { checkRow: null, account: null }
const ICON = { key: '516:235', bell: '516:244', eye: '516:253', network: '516:264', devWarn: '516:274', face: '516:288', info: '137:213', account: '137:41', copy: '137:144', check: '137:230', disclosure: '137:247', eth: '137:402', usdc: '137:429' }
const TV = ['abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about']
const USDC_ADDR = '0x1c7D 4B19 6Cb0 C7B0 1d74 3Fbc 6116 a902 379C 7238'
function colorAll(inst, v) { for (const n of inst.findAll(x => (x.type === 'VECTOR' || x.type === 'BOOLEAN_OPERATION' || x.type === 'ELLIPSE') && Array.isArray(x.fills) && x.fills.length && !(x.parent && x.parent.type === 'BOOLEAN_OPERATION'))) fill(n, v) }
function radiusVar(px) { const rs = Object.values(L.v).filter(v => v.name.startsWith('radius/')); for (const v of rs) { const val = Object.values(v.valuesByMode)[0]; if (val === px) return v.name } return px >= 16 ? 'radius/lg' : 'radius/sm' }
function strokeW(n, name) { for (const k of ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight']) bind(n, k, name) }
function propKey(owner, short) { return Object.keys(owner.componentPropertyDefinitions).find(k => k.split('#')[0] === short) }

async function ensureComponents(out) {
  const sec = await node('398:77')
  let maxY = Math.max(...sec.children.map(c => c.y + c.height))
  const place = n => { n.x = 100; n.y = maxY + 120; maxY = n.y + n.height }
  // 1. B/Check row
  let cr = sec.children.find(c => c.name === 'B/Check row')
  if (!cr) {
    const mk = async on => {
      const c = figma.createComponent(); c.name = 'State=' + (on ? 'On' : 'Off'); sec.appendChild(c)
      c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.resize(390, 48); c.fills = []
      bind(c, 'itemSpacing', 'space/3'); pad(c, 'space/3', 'layout/screen/padding', 'space/3', 'layout/screen/padding'); c.counterAxisAlignItems = 'MIN'
      const box = figma.createFrame(); box.name = 'Box'; box.layoutMode = 'HORIZONTAL'; box.primaryAxisSizingMode = 'FIXED'; box.counterAxisSizingMode = 'FIXED'; box.resize(24, 24)
      box.primaryAxisAlignItems = 'CENTER'; box.counterAxisAlignItems = 'CENTER'; rad(box, 'radius/sm'); c.appendChild(box)
      if (on) { fill(box, 'action/primary/bg/default'); box.strokes = []; const ic = (await node(ICON.check)).createInstance(); box.appendChild(ic); colorAll(ic, 'icon/action/onPrimary') }
      else { fill(box, 'surface/default'); box.strokes = [paint('border/strong')]; box.strokeAlign = 'INSIDE'; strokeW(box, 'input/borderWidth') }
      const col = al('VERTICAL', 'Text', { gap: 'space/0_5' }); add(c, col, 'FILL')
      await wrapTxt(col, '복구 구문을 잃으면 되찾을 수 없어요', 'Product B/Headline', 'text/primary', 'Title')
      await wrapTxt(col, 'VaultMe는 복구 구문을 보관하지도, 되찾아 주지도 않아요.', 'Product B/Body Small', 'text/secondary', 'Body')
      return c
    }
    const off = await mk(false), on = await mk(true)
    cr = figma.combineAsVariants([off, on], sec); cr.name = 'B/Check row'
    cr.layoutMode = 'VERTICAL'; cr.primaryAxisSizingMode = 'AUTO'; cr.counterAxisSizingMode = 'AUTO'; bind(cr, 'itemSpacing', 'space/4'); cr.fills = []
    const kT = cr.addComponentProperty('Title', 'TEXT', '복구 구문을 잃으면 되찾을 수 없어요')
    const kB = cr.addComponentProperty('Body', 'TEXT', 'VaultMe는 복구 구문을 보관하지도, 되찾아 주지도 않아요.')
    const kS = cr.addComponentProperty('Show body', 'BOOLEAN', true)
    for (const v of cr.children) { v.findOne(n => n.name === 'Title').componentPropertyReferences = { characters: kT }; v.findOne(n => n.name === 'Body').componentPropertyReferences = { characters: kB, visible: kS } }
    cr.description = 'Acknowledgement checkbox row. Off: border/strong box (functional border: selectable control). On: action/primary/bg box + white check. All rows must be On before the Primary turns on (S02, S03). 44 px+ target = whole row.'
    place(cr)
  }
  out.checkRow = cr.id
  // 2. B/Account block
  let ab = sec.children.find(c => c.name === 'B/Account block')
  if (!ab) {
    const c = figma.createComponent(); c.name = 'B/Account block'; sec.appendChild(c)
    c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.resize(390, 80); c.fills = []; c.counterAxisAlignItems = 'CENTER'
    bind(c, 'itemSpacing', 'space/3'); pad(c, 'space/4', 'layout/screen/padding', 'space/4', 'layout/screen/padding')
    const av = figma.createFrame(); av.name = 'Avatar'; av.layoutMode = 'HORIZONTAL'; av.primaryAxisSizingMode = 'FIXED'; av.counterAxisSizingMode = 'FIXED'; av.resize(48, 48); av.primaryAxisAlignItems = 'CENTER'; av.counterAxisAlignItems = 'CENTER'
    rad(av, 'radius/pill'); fill(av, 'surface/subtle'); c.appendChild(av); const ic = (await node(ICON.account)).createInstance(); av.appendChild(ic); colorAll(ic, 'icon/account/fg')
    const col = al('VERTICAL', 'Text', { gap: 'space/0_5' }); add(c, col, 'FILL')
    const nm = await txt('계정 1', 'Product B/Headline', 'text/primary', 'Name'); col.appendChild(nm)
    const ad = await txt('0x9858…da94', 'Product B/Address M', 'text/secondary', 'Address'); col.appendChild(ad)
    const b = await inst('398:247', { Type: 'Secondary', Size: 'sm', State: 'Default' }, { Label: '복사', 'Show icon': true, Icon: ICON.copy }, 'Copy')
    c.appendChild(b)
    const kN = c.addComponentProperty('Name', 'TEXT', '계정 1'), kA = c.addComponentProperty('Address', 'TEXT', '0x9858…da94')
    nm.componentPropertyReferences = { characters: kN }; ad.componentPropertyReferences = { characters: kA }
    c.description = 'Settings top account block: name, short address, visible "복사" (copy) action. Copy gives impactLight haptic + toast "복사했어요" (app side).'
    place(c); ab = c
  }
  out.account = ab.id
  // 3. B/Settings row: leading icon (additive) + chevron = disclosure
  const sr = await node('426:2045')
  if (!sr.findChild(n => n.name === 'Leading icon')) {
    const ic = (await node(ICON.key)).createInstance(); ic.name = 'Leading icon'; sr.insertChild(0, ic)
    const kS = sr.addComponentProperty('Show icon', 'BOOLEAN', false)
    const kI = sr.addComponentProperty('Icon', 'INSTANCE_SWAP', ICON.key)
    ic.componentPropertyReferences = { visible: kS, mainComponent: kI }
  }
  const ch = sr.findChild(n => n.name === 'Chevron'); const chm = await ch.getMainComponentAsync()
  if (chm.id !== ICON.disclosure) { ch.swapComponent(await node(ICON.disclosure)); colorAll(ch, 'icon/tertiary') }
  out.settingsRow = sr.id
  // 4. B/Balance hero State=Figure
  const bh0 = await node('401:12430')
  let fig = bh0.children.find(c => c.name === 'State=Figure')
  if (!fig) {
    const base = bh0.children.find(c => c.name === 'State=Value')
    fig = base.clone(); bh0.appendChild(fig); fig.name = 'State=Figure'
    if (bh0.layoutMode === 'NONE') { fig.x = base.x; fig.y = Math.max(...bh0.children.filter(c => c !== fig).map(c => c.y + c.height)) + 24; bh0.resizeWithoutConstraints(bh0.width, fig.y + fig.height + 24) }
    const amt = fig.findChild(n => n.name === 'Amount')
    const row = al('HORIZONTAL', 'Amount row', { gap: 'space/1_5' }); row.counterAxisAlignItems = 'BASELINE'
    fig.insertChild(fig.children.indexOf(amt), row); row.appendChild(amt); await amt.setTextStyleIdAsync(S('Product B/Figure').id); amt.characters = '0.05'; amt.textAutoResize = 'WIDTH_AND_HEIGHT'
    const unit = await txt('ETH', 'Product B/Figure unit', 'text/secondary', 'Unit'); row.appendChild(unit)
    const kU = bh0.addComponentProperty('Unit', 'TEXT', 'ETH'); unit.componentPropertyReferences = { characters: kU }
    fill(fig.findChild(n => n.name === 'Label'), 'text/secondary')
  }
  { const am = fig.findOne(n => n.name === 'Amount'); am.textAutoResize = 'WIDTH_AND_HEIGHT'; am.layoutSizingHorizontal = 'HUG' }
  out.balanceFigure = fig.id
  // 5. B/Secret grid: panel + blur on Hidden + test vector words
  const sg = await node('426:2044')
  for (const v of sg.children) {
    let panel = v.findChild(n => n.name === 'Panel')
    if (!panel) {
      panel = al('HORIZONTAL', 'Panel', { gap: 'space/4', pad: ['space/5', 'space/4', 'space/5', 'space/4'], fill: 'surface/subtle' }); rad(panel, radiusVar(16)); panel.clipsContent = true
      const cols = v.children.filter(c => c.name.startsWith('Column')); v.appendChild(panel); panel.layoutSizingHorizontal = 'FILL'
      for (const c of cols) { panel.appendChild(c); c.layoutSizingHorizontal = 'FILL' }
      v.layoutMode = 'VERTICAL'
    }
    let i = 0
    for (const w of v.findAll(n => n.type === 'FRAME' && /^Word \d+$/.test(n.name))) { const t = w.findChild(n => n.name === 'Word'); const k = parseInt(w.name.split(' ')[1]) - 1; if (t.characters !== TV[k]) t.characters = TV[k]; i++ }
    if (v.name === 'State=Hidden') {
      for (const c of panel.children.filter(c => c.name.startsWith('Column'))) c.effects = [{ type: 'LAYER_BLUR', radius: 14, visible: true }]
      if (!panel.findChild(n => n.name === 'Reveal')) {
        const pill = al('HORIZONTAL', 'Reveal', { gap: 'space/1_5', pad: ['space/2', 'space/4', 'space/2', 'space/4'], fill: 'surface/default', cross: 'CENTER' }); rad(pill, 'radius/pill')
        const eye = (await node(ICON.eye)).createInstance(); pill.appendChild(eye); colorAll(eye, 'icon/action/fg')
        pill.appendChild(await txt('탭해서 보기', 'Product B/Label', 'text/primary', 'Label'))
        panel.appendChild(pill); pill.layoutPositioning = 'ABSOLUTE'; pill.constraints = { horizontal: 'CENTER', vertical: 'CENTER' }
        pill.x = (panel.width - pill.width) / 2; pill.y = (panel.height - pill.height) / 2
      }
    }
    out['grid ' + v.name] = i
  }
  sg.description = 'Recovery phrase grid. Hidden = blurred words (layer blur 8) + "탭해서 보기" pill; re-hidden when the app leaves foreground. Revealed = numbered 2 columns on surface/subtle. Figma uses only the public BIP39 test vector.'
  return out
}
// ---- screen pieces ----
async function balance(label, amount, unit, sub) { return inst('401:12430', { State: 'Figure' }, { Label: label, Amount: amount, Unit: unit, Sub: sub }, 'Balance hero') }
async function actionRow(empty) {
  const a = (await findComp('399:140', {})).createInstance(); a.name = 'Action row'
  if (empty) {
    const left = a.children[0], right = a.children[1]
    left.swapComponent(await findComp('9:283', { Size: 'Medium', State: 'Default' })); setP(left, { Label: '받기', ShowIcon: true, Icon: '137:24' }); left.name = 'Button / Primary 받기'
    right.swapComponent(await findComp('9:284', { Size: 'Medium', State: 'Disabled' })); setP(right, { Label: '보내기', ShowIcon: true, Icon: '137:6' }); right.name = 'Button / Secondary 보내기'
    const li = left.findOne(n => n.type === 'INSTANCE'); if (li) colorAll(li, 'icon/action/onPrimary')
  }
  return a
}
async function sectionHeader(title, link) { return inst('399:95', {}, { Title: title, Link: link || '', 'Show link': !!link }, 'Section ' + title) }
async function assetRow(asset, value) {
  const r = await inst(C.row, { Leading: 'Icon', State: 'Default' }, { Title: asset === 'usdc' ? 'USD Coin' : 'Sepolia ETH', Subtitle: asset === 'usdc' ? 'USDC' : 'ETH', Value: value, 'Show subtitle': true, 'Show sub value': false }, 'Asset ' + asset)
  if (asset === 'usdc') setP(r, { 'Leading icon': ICON.usdc })
  return r
}
const TX = { pending: ['eth', 'Pending', 'Pending', '보내는 중', 'Sepolia ETH · 09:41', '−0.05 ETH'], recv: ['usdc', 'Received', 'Default', '받음', 'USD Coin · 10월 12일', '+12.5 USDC'], sent: ['eth', 'Sent', 'Default', '보냄', 'Sepolia ETH · 10월 12일', '−0.02 ETH'], failed: ['usdc', 'Failed', 'Failed', '보내기 실패', 'USD Coin · 10월 11일', '1 USDC'] }
async function txRow(k) {
  const [asset, badge, state, title, sub, value] = TX[k]
  const r = await inst(C.row, { Leading: 'Asset badge', State: state }, { Title: title, Subtitle: sub, Value: value, 'Show subtitle': true, 'Show sub value': false }, 'Tx ' + title)
  if (asset === 'usdc') r.findOne(x => x.type === 'INSTANCE' && x.name.startsWith('Icon / Asset')).swapComponent(await node(C.usdc))
  r.findOne(x => x.name === 'Badge').setProperties({ Kind: badge })
  if (badge === 'Received') fill(r.findOne(x => x.type === 'TEXT' && x.name === 'Value'), 'status/success/fg')
  if (badge === 'Failed') { const v = r.findOne(x => x.type === 'TEXT' && x.name === 'Value'); v.textDecoration = 'STRIKETHROUGH'; fill(v, 'text/tertiary') }
  return r
}
async function settingsRow(title, icon, value, chevron = true, iconColor) {
  const r = await inst('426:2045', {}, { Title: title, Value: value || '', 'Show value': !!value, 'Show chevron': chevron, 'Show icon': true, Icon: icon }, 'Settings ' + title)
  if (iconColor) colorAll(r.findOne(n => n.name === 'Leading icon'), iconColor)
  return r
}
async function checkRow(on, title, body) { const p = { Title: title, 'Show body': !!body }; if (body) p.Body = body; return inst(B2.checkRow, { State: on ? 'On' : 'Off' }, p, 'Check ' + title.slice(0, 12)) }
async function empty(title, body) { return inst('422:674', {}, { Title: title, Body: body, 'Show button': false }, 'Empty state') }
async function titleBlock(title, body) {
  const w = al('VERTICAL', 'Title block', { gap: 'space/2', pad: ['space/2', 'layout/screen/padding', 'space/4', 'layout/screen/padding'] })
  await wrapTxt(w, title, 'Product B/Title 1', 'text/primary', 'Title'); if (body) await wrapTxt(w, body, 'Product B/Body Small', 'text/secondary', 'Body'); return w
}
function group(name, kids, gap) { const g = al('VERTICAL', name, gap ? { gap } : {}); addAll(g, kids); return g }
const CH_T = [['Testnet', 'Sepolia 테스트넷']], CH_D = [['Testnet', 'Sepolia 테스트넷'], ['Test data', '테스트 데이터']]
async function homeHeader(chipList) {
  const h = al('HORIZONTAL', 'Header', { pad: ['space/2', 'layout/screen/padding', 'space/2', 'layout/screen/padding'], cross: 'CENTER' }); h.primaryAxisAlignItems = 'SPACE_BETWEEN'
  const a = al('HORIZONTAL', 'Account', { gap: 'space/2', cross: 'CENTER' }); const ic = (await node(ICON.account)).createInstance(); a.appendChild(ic); colorAll(ic, 'icon/account/fg')
  a.appendChild(await txt('계정 1', 'Product B/Headline', 'text/primary', 'Account name')); h.appendChild(a); h.appendChild(await chips(chipList)); return h
}
async function home(f, o) {
  const body = f.children.find(c => c.name === 'Body'); body.children.forEach(c => c.remove())
  add(body, await homeHeader(o.chips), 'FILL')
  const content = al('VERTICAL', 'Content'); content.clipsContent = true; add(body, content, 'FILL'); addAll(content, o.items)
  body.layoutSizingVertical = 'FILL'; content.layoutSizingVertical = 'FILL'
  return f.id
}
const HOME = {
  base: async () => [await balance('Sepolia ETH', '0.05', 'ETH', '테스트넷 자산은 시장 가격이 없어요.'), await actionRow(), await sectionHeader('자산'), await assetRow('eth', '0.05 ETH'), await assetRow('usdc', '12.5 USDC')],
  recent: async (pending) => [await sectionHeader('최근 내역', '전체 보기'), ...(pending ? [await txRow('pending'), await txRow('recv'), await txRow('sent')] : [await txRow('recv'), await txRow('sent'), await txRow('failed')])],
  empty: async (backup) => [await balance('Sepolia ETH', '0', 'ETH', '테스트넷 자산은 시장 가격이 없어요.'), await actionRow(true), ...(backup ? [await settingsRow('복구 구문을 아직 백업하지 않았어요', ICON.devWarn, '', true, 'icon/status/warning')] : []), await empty('아직 자산이 없어요', '받기 주소를 공유하면\nSepolia ETH와 USDC를 받을 수 있어요.')]
}
function setGap(f, gap) { const c = f.findOne(n => n.type === 'FRAME' && n.name === 'Content'); if (c) bind(c, 'itemSpacing', gap); return c }
async function brand(f, o) {
  const stack = al('VERTICAL', 'Brand', { gap: 'space/5', cross: 'CENTER', pad: [null, 'layout/screen/padding', 'space/16', 'layout/screen/padding'] })
  stack.appendChild(await inst('495:17569', { Size: '72', Tone: 'OnLight' }, null, 'Brand/Mark'))
  const tc = al('VERTICAL', 'Text', { gap: 'space/2', cross: 'CENTER' }); add(stack, tc, 'FILL')
  await wrapTxt(tc, o.title, 'Product B/Title 1', 'text/primary', 'Title', 'CENTER'); if (o.body) await wrapTxt(tc, o.body, 'Product B/Body', 'text/secondary', 'Body', 'CENTER')
  if (o.extra) add(stack, o.extra, 'FILL')
  const buttons = []; for (const b of o.buttons || []) buttons.push(await btn(...b))
  await rebuild(f, { content: [stack], actions: buttons.length ? { buttons } : null })
  const c = f.findOne(n => n.type === 'FRAME' && n.name === 'Content'); c.primaryAxisAlignItems = 'CENTER'
  const a = f.findOne(n => n.type === 'FRAME' && n.name === 'Actions'); if (a) a.strokes = []
  return f.id
}
async function ensureClone(srcId, section, name, x, y) {
  let f = section.children.find(c => c.name === name)
  if (!f) { f = (await node(srcId)).clone(); section.appendChild(f); f.name = name }
  f.x = x; f.y = y; return f
}
async function sheetOn(f, title, bodyText, primary) {
  for (const c of f.children.filter(c => c.name === 'Bottom sheet' || c.name === 'B/Bottom sheet')) c.remove()
  const s = (await findComp('399:157', {})).createInstance(); s.name = 'B/Bottom sheet'; f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'
  setP(s, { Title: title, Body: bodyText })
  s.findOne(n => n.name === 'Button / Secondary').visible = false
  setP(s.findOne(n => n.name === 'Button / Primary'), { Label: primary })
  s.x = 0; s.y = f.height - s.height
  return s
}
async function note(section, frame, text) {
  const name = 'Note · ' + frame.name; let t = section.children.find(c => c.name === name)
  if (!t) { t = await txt(text, 'Product B/Caption', 'text/tertiary', name); section.appendChild(t) } else t.characters = text
  t.textAutoResize = 'HEIGHT'; t.resize(390, t.height); t.x = frame.x; t.y = frame.y + frame.height + 16; return t.id
}
async function label(id, text) { const t = await node(id); const segs = t.getStyledTextSegments(['fontName']); for (const s of segs) await figma.loadFontAsync(s.fontName); t.characters = text }

async function run() {
  await init()
  const out = { comps: {}, light: {}, dark: {}, notes: [] }
  B2.checkRow = (await ensureComponents(out.comps)).checkRow
  // ---------- Home ----------
  const pHome = await node('486:76'); await figma.setCurrentPageAsync(pHome); await templates()
  const hl = await node('486:77'), hd = await node('486:78')
  out.light.s10 = await home(await node('404:163'), { chips: CH_T, items: [...await HOME.base(), ...await HOME.recent(false)] })
  out.light.s10p = await home(await node('423:742'), { chips: CH_T, items: [...await HOME.base(), ...await HOME.recent(true)] })
  out.light.s10t = await home(await node('457:4274'), { chips: CH_D, items: [...await HOME.base(), ...await HOME.recent(false)] })
  out.light.s10n = await home(await node('423:643'), { chips: CH_T, items: await HOME.empty(true) })
  const s10e = await ensureClone('404:163', hl, 'B-S10E Home empty wallet', 1980, 148)
  out.light.s10e = await home(s10e, { chips: CH_T, items: await HOME.empty(false) })
  out.light.s50 = await home(await node('423:14215'), { chips: CH_T, items: [...await HOME.base(), ...await HOME.recent(false)] })
  const s10f = await ensureClone('423:14215', hl, 'B-S10 Home / First launch sheet', 570, 2212)
  await home(s10f, { chips: CH_T, items: [...await HOME.base(), ...await HOME.recent(false)] })
  for (const c of s10f.children.filter(c => c.name === 'Bottom sheet')) c.remove()
  await sheetOn(s10f, 'Sepolia 테스트넷 지갑이에요', '실제 가치가 없는 테스트 자산만 다뤄요.\n시장 가격이 없어서 수량으로 보여 줘요.\n위의 칩을 누르면 이 안내를 다시 볼 수 있어요.', '확인했어요')
  out.light.s10f = s10f.id
  const s10s = await ensureClone('423:14215', hl, 'B-S10 Home / Test data sheet', 1040, 2212)
  await home(s10s, { chips: CH_D, items: [...await HOME.base(), ...await HOME.recent(false)] })
  await sheetOn(s10s, '테스트 데이터예요', '잔액과 내역은 이 기기에서 만든 예시예요.\n실제 네트워크와 연결되지 않았어요.', '확인')
  out.light.s10s = s10s.id
  // S11 asset detail
  async function asset(f, a) {
    const isU = a === 'usdc'
    const hero0 = await hero('Review', { amount: isU ? '12.5' : '0.05', unit: isU ? 'USDC' : 'ETH', body: isU ? 'USD Coin' : 'Sepolia ETH' }); if (isU) setP(hero0, { Asset: ICON.usdc })
    const info = block('Block 자산 정보')
    addAll(info, isU ? [await bh('자산 정보'), await detail('네트워크', 'Sepolia'), await detail('컨트랙트 주소', USDC_ADDR, { addr: true }), await notice('Inline', 'Info', '보낼 때 네트워크 수수료는 ETH로 내요.')]
      : [await bh('자산 정보'), await detail('네트워크', 'Sepolia'), await notice('Inline', 'Info', '네트워크 수수료는 ETH로 내요.\n수수료로 쓸 ETH를 남겨 두세요.')])
    const hist = block('Block 이 자산의 내역')
    addAll(hist, [await bh('이 자산의 내역', '전체 보기'), ...(isU ? [await txRow('recv'), await txRow('failed')] : [await txRow('pending'), await txRow('sent')])])
    await rebuild(f, { nav: { back: true, chips: CH_T }, content: [hero0, await actionRow(), await band(), info, await band(), hist] })
    return f.id
  }
  out.light.s11 = await asset(await node('423:16447'), 'eth')
  const s11u = await ensureClone('423:16447', hl, 'B-S11 Asset detail USD Coin', 570, 1180)
  out.light.s11u = await asset(s11u, 'usdc')
  // notes + labels
  out.notes.push(await note(hl, s10f, '모션: sheet 250 ms ease-out, scrim 페이드. 첫 실행 때 1회만. 칩을 누르면 같은 sheet. 움직임 줄이기: 페이드만.'))
  out.notes.push(await note(hl, await node('423:742'), '진행 중 거래가 최근 내역 맨 위. 확정되면 행 상태가 제자리에서 바뀜(160 ms 색 전환), haptic notificationSuccess. 실패는 notificationError.'))
  await label('486:79', 'S10 Home · pending · test mode · new wallet · empty'); await label('486:81', 'S11 Asset detail (ETH · USDC)'); await label('486:83', 'S50 Push opt-in · S10 first-launch sheet · test data sheet')
  // dark
  const d522 = await node('404:522'); d522.x = 2450; hd.resizeWithoutConstraints(Math.max(hd.width, 2940), hd.height)
  const HD = [['404:163', '430:14606'], ['404:163', '404:522'], ['423:742', '430:14755'], ['457:4274', '430:14820'], ['423:643', '430:14732'], [s10e.id, null], ['423:16447', '430:15384'], [s11u.id, null], ['423:14215', '430:15953'], [s10f.id, null], [s10s.id, null]]
  HD[3][1] = (hd.children.find(c => c.name === 'B-S10 Home · Dark / Test mode') || {}).id || null
  for (const [l, d] of HD) { let did = d; if (!did) { const ln = (await node(l)).name; const ex = hd.children.find(c => c.name === ln + ' · Dark'); if (ex) did = ex.id } out.dark[l + (d === '404:522' ? '#old' : '')] = await syncDark(l, did, hd) }
  await label('486:80', 'S10 Home · pending · test mode · new wallet · empty · Dark'); await label('486:82', 'S11 Asset detail (ETH · USDC) · Dark'); await label('486:84', 'S50 Push opt-in · S10 sheets · Dark')
  T.park.remove()
  // ---------- Onboarding ----------
  const pOn = await node('485:76'); await figma.setCurrentPageAsync(pOn); await templates()
  const ol = await node('485:77'), od = await node('485:78')
  for (const s of [ol, od]) s.resizeWithoutConstraints(s.width, 4228)
  out.light.s01 = await brand(await node('423:13440'), { title: 'VaultMe', body: '내 기기에 열쇠를 두는\nSepolia 테스트넷 지갑이에요.', buttons: [['Secondary', '기존 지갑 복구'], ['Primary', '새 지갑 만들기']] })
  const ACK = [['복구 구문을 잃으면 되찾을 수 없어요', 'VaultMe는 복구 구문을 보관하지도,\n되찾아 주지도 않아요.'], ['알림으로 복구 구문을 묻지 않아요', '복구 구문을 묻는 메시지는 모두 사기예요.'], ['테스트넷 전용이에요', 'Sepolia 자산만 다뤄요. 실제 가치는 없어요.']]
  async function s02(f, on) {
    const rows = []; for (const [t, b] of ACK) rows.push(await checkRow(on, t, b))
    await rebuild(f, { nav: { back: true }, content: [await titleBlock('시작하기 전에 확인해 주세요', '모두 확인해야 지갑을 만들 수 있어요.'), group('Checks', rows)], actions: { buttons: [await btn('Primary', '지갑 만들기', on ? 'Default' : 'Disabled')] } })
    return f.id
  }
  out.light.s02 = await s02(await node('423:13478'), false)
  const s02c = await ensureClone('423:13478', ol, 'B-S02 책임 안내 · 모두 확인', 100, 3244)
  out.light.s02c = await s02(s02c, true)
  const WARN = '누구에게도 보여 주지 마세요\nVaultMe도, 고객지원도 복구 구문을 묻지 않아요.'
  async function s03(f, state) {
    const grid = await inst('426:2044', { State: state === 'hidden' ? 'Hidden' : 'Revealed' }, null, 'B/Secret grid')
    const items = [await titleBlock('복구 구문', '아래 12단어를 순서대로 종이에 적으세요.\n화면을 캡처하지 마세요.'), grid]
    if (state !== 'hidden') items.push(await checkRow(state === 'checked', '12단어를 순서대로 종이에 적었어요'))
    items.push(await notice('Inline', 'Warning', state === 'hidden' ? '주변에 아무도 없는지 확인하세요\n' + WARN.split('\n')[1] : WARN))
    await rebuild(f, { nav: { back: true }, content: items, actions: { buttons: [await btn('Primary', '다 적었어요', state === 'checked' ? 'Default' : 'Disabled')] } })
    setGap(f, 'layout/groupGap'); return f.id
  }
  out.light.s03h = await s03(await node('423:13533'), 'hidden')
  out.light.s03r = await s03(await node('423:13622'), 'revealed')
  const s03c = await ensureClone('423:13622', ol, 'B-S03 복구 구문 Revealed · 확인', 570, 3244)
  out.light.s03c = await s03(s03c, 'checked')
  let rl = ol.children.find(c => c.name === 'Row label' && c.y > 3100); if (!rl) { rl = (await node('485:79')).clone(); ol.appendChild(rl); rl.x = 100; rl.y = 3196 }
  let rld = od.children.find(c => c.name === 'Row label' && c.y > 3100); if (!rld) { rld = (await node('485:80')).clone(); od.appendChild(rld); rld.x = 100; rld.y = 3196 }
  await label(rl.id, 'S02 · S03 확인 체크 완료 (버튼 켜짐)'); await label(rld.id, 'S02 · S03 확인 체크 완료 · Dark')
  out.notes.push(await note(ol, await node('423:13533'), '탭하면 OS 인증 뒤 흐림이 풀림(200 ms 페이드). 앱을 벗어나면 다시 가림. 캡처 차단. 버튼은 펼친 뒤 체크해야 켜짐.'))
  out.notes.push(await note(ol, await node('423:13440'), '브랜드 화면. Brand/Mark 72 가운데, 화면 높이 약 40%. 오너 확인 필요: 마크 모양.'))
  const OD = [['423:13440', '430:15497'], ['423:13478', '430:15518'], [s02c.id, null], ['423:13533', '430:15543'], ['423:13622', '430:15570'], [s03c.id, null]]
  for (const [l, d] of OD) { let did = d; if (!did) { const ln = (await node(l)).name; const ex = od.children.find(c => c.name === ln + ' · Dark'); if (ex) did = ex.id } out.dark[l] = await syncDark(l, did, od) }
  T.park.remove()
  // ---------- Settings ----------
  const pS = await node('486:17443'); await figma.setCurrentPageAsync(pS); await templates()
  const sl = await node('486:17444'), sd = await node('486:17445')
  async function s60(f, full) {
    const title = al('HORIZONTAL', 'Title', { pad: ['space/2', 'layout/screen/padding', 'space/2', 'layout/screen/padding'], cross: 'CENTER' })
    title.appendChild(await txt('설정', 'Product B/Title 1', 'text/primary', 'Title'))
    const acct = await inst(out.comps.account, {}, { Name: '계정 1', Address: '0x9858…da94' }, 'B/Account block')
    const g1 = block('Block 보안'); addAll(g1, [await bh('보안'), await settingsRow('복구 구문 보기', ICON.key), await settingsRow('기기 보안 경고', ICON.devWarn)])
    const g2 = block('Block 알림'); addAll(g2, [await bh('알림'), await settingsRow('거래 알림', ICON.bell, '켜짐'), await settingsRow('0원 거래 표시', ICON.eye, '숨김')])
    const g3 = block('Block 정보'); addAll(g3, [await bh('정보'), await settingsRow('네트워크', ICON.network, 'Sepolia'), await settingsRow('버전', ICON.info, '1.0.0', false)])
    for (const g of [g1, g2, g3]) bind(g, 'itemSpacing', 'space/1')
    await rebuild(f, { content: [title, acct, await band(), g1, await band(), g2, await band(), g3], full })
    return f.id
  }
  sd.x = 2710; sl.resizeWithoutConstraints(2470, sl.height); sd.resizeWithoutConstraints(2470, sd.height)
  out.light.s60 = await s60(await node('423:13797'), false)
  out.notes.push(await note(sl, await node('423:13797'), '복사: haptic impactLight + 토스트 "복사했어요". 행 누름은 배경색만 바뀜. 전체 길이는 오른쪽 "full" 프레임.'))
  const s60full = await ensureClone('423:13797', sl, 'B-S60 Settings · full', 1980, 148)
  out.light.s60full = await s60(s60full, true)
  {
    const f = await node('423:13856')
    await rebuild(f, { nav: { back: true }, content: [await titleBlock('복구 구문', 'OS 인증을 마쳤어요. 화면을 캡처하지 마세요.\n앱을 벗어나면 다시 가려져요.'), await inst('426:2044', { State: 'Hidden' }, null, 'B/Secret grid'), await notice('Inline', 'Warning', WARN)] })
    setGap(f, 'layout/groupGap'); out.light.s61 = f.id
  }
  const faceGroup = async (text) => { const g = al('VERTICAL', 'Face ID', { gap: 'space/2', cross: 'CENTER', pad: ['space/6', null, null, null] }); const fi = (await node(ICON.face)).createInstance(); g.appendChild(fi); await wrapTxt(g, text, 'Product B/Caption', 'text/secondary', 'Status', 'CENTER'); return g }
  out.light.s90 = await brand(await node('423:15412'), { title: 'VaultMe', body: '잠겨 있어요. Face ID로 잠금을 푸세요.', extra: await faceGroup('Face ID로 확인하는 중이에요') })
  const s90f = await ensureClone('423:15412', sl, 'B-S90 잠금 · 실패·취소', 1510, 1180)
  out.light.s90f = await brand(s90f, { title: 'VaultMe', body: '잠금을 풀지 못했어요. 다시 시도하세요.', buttons: [['Primary', '잠금 해제']] })
  out.light.s91 = await brand(await node('423:15443'), { title: '앱을 업데이트하세요', body: '이 버전은 더 이상 지원하지 않아요.\n자산은 블록체인에 그대로 있어요.\n업데이트한 뒤 계속 쓰세요.', buttons: [['Primary', '스토어에서 업데이트']] })
  out.notes.push(await note(sl, await node('423:15412'), '화면이 뜨면 Face ID를 바로 시작(OS 창이 위에 뜸). 성공: 바로 홈. 실패·취소: 오른쪽 "실패·취소" 상태. 실패 haptic notificationError.'))
  const SD = [['423:13797', '430:15642'], [s60full.id, null], ['423:13856', '430:15667'], ['423:15412', '430:16073'], [s90f.id, null], ['423:15443', '430:16093']]
  for (const [l, d] of SD) { let did = d; if (!did) { const ln = (await node(l)).name; const ex = sd.children.find(c => c.name === ln + ' · Dark'); if (ex) did = ex.id } out.dark[l] = await syncDark(l, did, sd) }
  T.park.remove()
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
