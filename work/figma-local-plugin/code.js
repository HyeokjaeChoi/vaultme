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
function addAll(parent, kids) { for (const k of kids) if (k) { parent.appendChild(k); try { k.layoutSizingHorizontal = 'FILL' } catch (e) {} } }
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
const TASK = 'batch1-activity'
const TESTNET = [['Testnet', 'Sepolia 테스트넷']], TESTDATA = [...TESTNET, ['Test data', '테스트 데이터']]
async function detailScreen(id, o) {
  const f = await node(id)
  const top = o.top ? await notice('Banner', 'Warning', o.top) : null; if (top) bind(top, 'paddingTop', 'space/2')
  const b1 = block('Block 받는 주소'); addAll(b1, [o.test ? await notice('Inline', 'Warning', '네트워크로 보내지 않았어요 (테스트)\n테스트 버전이라 거래 해시와 상태는 이 기기에서 만든 예시예요.') : null, await bh('받는 주소'), await address(ADDR.r, 'M')])
  const b2 = block('Block 거래 정보'); addAll(b2, [await bh('거래 정보'), await detail('상태', o.status), o.account ? await detail('보낸 계정', '계정 1') : null, await detail('네트워크', 'Sepolia'), await detail('예상 네트워크 수수료', '0.000042 ETH'), o.check ? await notice('Inline', 'Info', '마지막 확인 09:41') : null])
  const b3 = block('Block 거래 해시'); addAll(b3, [await detail('거래 해시', HASH, { addr: true })])
  const content = [top, await hero('Result', { badge: o.badge, title: o.title, body: o.body }), await band(), b1, await band(), b2, await band(), b3]
  const buttons = []; for (const b of o.buttons) buttons.push(await btn(...b))
  await rebuild(f, { nav: { back: true, chips: o.test ? TESTDATA : TESTNET }, content, actions: { buttons } })
  return f.id
}
const CONF = { badge: 'Confirmed', title: '보냈어요', body: '이 거래는 네트워크에서 확정됐어요.', status: '확정', account: true }
const UNK = { badge: 'Unknown', title: '보낸 결과를 확인하지 못했어요', body: '다시 보내지 말고 상태를 확인해 주세요.', status: '확인 못 함', check: true, buttons: [['Primary', '상태 다시 확인'], ['Ghost', '내역 보기']] }
async function run() {
  await init(); await fixMasters(); const page = await node('486:17436'); await figma.setCurrentPageAsync(page); await templates()
  const out = { list: {}, detail: {}, dark: {} }
  const L1 = [['404:387', TESTNET], ['423:16109', TESTNET], ['423:16158', TESTNET], ['423:16236', TESTNET], ['457:17502', TESTNET], ['471:5163', TESTDATA], ['460:5024', TESTNET]]
  for (const [id, ch] of L1) { const f = await node(id); out.list[id] = { chips: await titleChips(f, ch), rows: await convertRows(f), banners: await bannerize(f) } }
  // empty: receive icon + Primary CTA (icon is a placeholder until the Solar hero icon exists)
  const ef = await node('423:16109'); const es = ef.findOne(x => x.type === 'INSTANCE' && x.name.includes('Empty'))
  if (es) { const ic = es.findOne(x => x.type === 'INSTANCE' && x.name === 'Icon'); if (ic) { ic.swapComponent(await node(C.receive)); ic.name = 'Icon' } const b = es.findOne(x => x.type === 'INSTANCE' && x.name.startsWith('Button')); if (b) b.setProperties({ Type: 'Primary' }); out.empty = !!b }
  out.detail.conf = await detailScreen('423:16327', { ...CONF, buttons: [['Ghost', '홈으로']] })
  out.detail.unk = await detailScreen('423:16381', UNK)
  out.detail.real = await detailScreen('460:4988', { ...CONF, buttons: [['Ghost', 'Etherscan에서 보기'], ['Ghost', '홈으로']] })
  out.detail.test = await detailScreen('457:4412', { ...CONF, test: true, buttons: [['Ghost', '테스트 거래 지우기'], ['Ghost', '홈으로']] })
  out.detail.sheet = await detailScreen('457:17613', { ...CONF, test: true, buttons: [['Ghost', '테스트 거래 지우기']] })
  out.detail.api = await detailScreen('457:17668', { ...UNK, top: '서버에 연결하지 못했어요\n인터넷 연결을 확인하고 다시 시도하세요.' })
  const dark = await node('486:17438')
  const D = [['404:387', '430:14668'], ['423:16109', '430:15259'], ['423:16158', '430:15278'], ['423:16236', '430:15304'], ['457:17502', null], ['471:5163', null], ['460:5024', null], ['423:16327', '430:15326'], ['423:16381', '430:15353'], ['460:4988', null], ['457:4412', null], ['457:17613', null], ['457:17668', null]]
  for (const [l, d] of D) { let did = d; if (!did) { const ln = (await node(l)).name; const ex = dark.children.find(c => c.name === ln + ' · Dark'); if (ex) did = ex.id } out.dark[l] = await syncDark(l, did, dark) }
  // S31 receive gate (onboarding page)
  const p1 = await node('485:76'); await figma.setCurrentPageAsync(p1)
  const s31 = await node('423:13750')
  if (s31.children.find(c => c.name === 'Body')) {
    const title = al('HORIZONTAL', 'Title row', { gap: 'space/2', cross: 'CENTER', pad: ['space/2', 'layout/screen/padding', 'space/4', 'layout/screen/padding'] })
    title.appendChild(await txt('받기', 'Product B/Title 1', 'text/primary', 'Title')); title.appendChild(await chip('Testnet', 'Sepolia 테스트넷'))
    const ban = await notice('Banner', 'Warning', '먼저 복구 구문을 백업하세요\n기기를 잃어도 이 지갑을 되찾으려면 복구 구문이 필요해요. 백업을 마치면 받기 주소가 보여요.')
    await rebuild(s31, { nav: { back: true }, content: [title, ban, await notice('Inline', 'Warning', '복구 구문은 종이에 적어 두세요. 스크린샷이나 클라우드 메모에 저장하지 마세요.')], actions: { buttons: [await btn('Primary', '백업 시작'), await btn('Ghost', '나중에')] } })
    out.s31 = s31.id; out.s31dark = await syncDark('423:13750', '430:15617', await node('485:78'))
  } else out.s31 = 'no Body: ' + s31.children.map(c => c.name).join(',')
  T.park.remove()
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
