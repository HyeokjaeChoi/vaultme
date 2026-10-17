// VaultMe Local Runner: TASK final-fixes (#54). Fixes from work/review/pd-review-final-2026-10-17.md that write text
// (Pretendard loads only in the desktop app). Non-text master/frame fixes ran over the remote MCP first (see commit).
// Edits go to the Light frames; each changed Dark twin is then re-cloned from Light (syncDark, as in batch2-last.js).
// Last step: repaint every bound paint whose stored color differs from the resolved variable value (root cause of the
// #000000 text in the review: the paint was bound but kept the {0,0,0} seed color; the desktop export drew the seed).
const TASK = 'final-fixes'
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
  // ---------- Security & settings ----------
  async s90() { // P0-1: status on one centred row with the Face ID icon, text bound and repainted
    const f = await node(pair('423:15412', '430:16073'))
    const row = byName(f, 'Face ID status'), t = byName(row, 'Status')
    row.layoutMode = 'HORIZONTAL'; row.primaryAxisAlignItems = 'CENTER'; row.counterAxisAlignItems = 'CENTER'; bind(row, 'itemSpacing', 'space/2')
    t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.textAlignVertical = 'CENTER'; fillR(t, 'text/secondary')
    return [row.id, t.id, Math.round(t.y), Math.round(byName(row, 'Icon / hero / face').y)]
  },
  async s60() { // P2-8 + copy
    const out = []
    for (const id of [pair('423:13797', '430:15642'), pair('515:45343', '515:45681')]) {
      const f = await node(id)
      const sec = one(f, n => n.type === 'INSTANCE' && /기기 보안/.test(n.name), 'device row'); setP(sec, { Title: '기기 보안 상태', 'Show value': true, Value: '확인됨' }); sec.name = 'Settings 기기 보안 상태'
      const net = byName(f, 'Settings 네트워크'); setP(net, { 'Show chevron': false })
      out.push(sec.id, net.id)
    }
    return out
  },
  async s61() { // P2-7
    const f = await node(pair('423:13856', '430:15667'))
    const t = byName(byName(f, 'Title block'), 'Body'); await setText(t, 'Face ID로 확인했어요. 화면을 캡처하지 마세요.\n앱을 벗어나면 다시 가려져요.'); return t.id
  },
  async s64() { // P1-6: generated-list caption, compact rows (52), real installed package instead of @solar-icons/react-native
    const out = []
    for (const id of [pair('526:54261', '526:54545'), pair('526:54503', '526:54587')]) {
      const f = await node(id)
      await setText(byName(byName(f, 'Title block'), 'Body'), '앱에 포함된 오픈소스 목록이에요.\n앱을 만들 때 자동으로 만들어져요.')
      for (const r of f.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('License '))) {
        if (r.name === 'License @solar-icons/react-native') { setP(r, { Title: 'react-native-svg' }); r.name = 'License react-native-svg' }
        if (r.name !== 'License Solar Icons 원본 보기') setP(r, { 'Show chevron': true })
        bind(r, 'height', 'size/control_lg')
        out.push(r.id)
      }
    }
    return out.length
  },
  async s65() { // P1-6: license full text screen (new S65)
    const sl = await node('486:17444'), sd = await node('486:17445')
    const s64 = await node('526:54261')
    let f = sl.children.find(c => c.name === 'B-S65 라이선스 전문')
    if (!f) { f = (await node('423:13856')).clone(); sl.appendChild(f); f.name = 'B-S65 라이선스 전문'; f.x = Math.max(...sl.children.filter(c => c !== f).map(c => c.x + c.width)) + 80; f.y = s64.y }
    const content = one(f, n => n.name === 'Content' && n.type === 'FRAME', 'Content')
    content.children.forEach(c => c.remove())
    const tb = al('VERTICAL', 'Title block', { gap: 'space/2', pad: ['space/2', 'layout/screen/padding', 'space/4', 'layout/screen/padding'] })
    content.appendChild(tb); tb.layoutSizingHorizontal = 'FILL'
    await wrapTxt(tb, 'react-native-svg', 'Product B/Title 2', 'text/primary', 'Title')
    await wrapTxt(tb, '버전 15.15.4 · MIT', 'Product B/Body Small', 'text/secondary', 'Body')
    const band = (await node('494:341')).createInstance(); content.appendChild(band); band.layoutSizingHorizontal = 'FILL'
    const blk = al('VERTICAL', 'Block 라이선스 전문', { gap: 'space/3', pad: ['sectionBand/blockPaddingY', 'layout/screen/padding', 'sectionBand/blockPaddingY', 'layout/screen/padding'] })
    content.appendChild(blk); blk.layoutSizingHorizontal = 'FILL'
    await wrapTxt(blk, 'Copyright (c) [2015-2016] [Horcrux]', 'Product B/Label', 'text/primary', 'Copyright')
    await wrapTxt(blk, LICENSE_MIT_RNSVG, 'Product B/Body Small', 'text/secondary', 'License text')
    content.clipsContent = true
    growSection(sl)
    // tap target: S64 react-native-svg row → S65
    for (const id of ['526:54261', '526:54503']) { const r = (await node(id)).findOne(n => n.name === 'License react-native-svg'); if (r) await r.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: f.id, navigation: 'NAVIGATE', transition: null, preserveScrollPosition: false }] }]) }
    await note(sl, f, '행을 누르면 열리는 라이선스 전문. 패키지 이름 · 버전 · 저작권 줄 · 전문(Body Small). 본문은 세로로 스크롤해요. 목록과 전문은 앱을 만들 때 lockfile(pnpm-lock.yaml)에서 자동으로 만들어요. 간접 의존성도 넣어요. 같은 전문은 공유해도 돼요. 이 예시는 node_modules의 react-native-svg 15.15.4 LICENSE 원문이에요.')
    await note(sl, s64, '목록은 손으로 만들지 않아요. 앱을 만들 때 lockfile에서 간접 의존성까지 자동으로 만들어요. 여기 행은 예시예요. 행을 누르면 S65 라이선스 전문. Solar 행의 CC BY 4.0 출처 문구는 그대로 둬요.')
    PAIRS.push([f.id, null, sd])
    return f.id
  },
  // ---------- Home ----------
  async balances() { // P2-10
    const out = []
    for (const [l, d] of [['404:163', '430:14606'], ['423:742', '430:14755'], ['457:4274', '457:4320'], ['423:14215', '430:15953'], ['515:29519', '515:30883'], ['515:29783', '515:30956']]) {
      const f = await node(pair(l, d))
      setP(byName(f, 'Balance hero'), { Amount: ETH_BAL }); setP(byName(f, 'Asset eth'), { Value: ETH_BAL + ' ETH' }); out.push(f.id)
    }
    const a = await node(pair('423:16447', '430:15384')); setP(byName(a, 'Amount hero'), { Amount: ETH_BAL }); out.push(a.id)
    return out
  },
  async emptyHome() { // P1-8: buttons keep position; empty wallet → 보내기 Secondary (left), 받기 Primary (right)
    const sec = await node('9:185'), pri = await node('9:155'), send = '137:6', recv = '137:24', out = []
    for (const id of [pair('515:29238', '515:30619'), pair('423:643', '430:14732')]) {
      const row = byName(await node(id), 'Action row'), [left, right] = row.children
      left.swapComponent(sec); setP(left, { Label: '보내기', Icon: send, ShowIcon: true }); left.name = 'Button / Secondary 보내기'
      right.swapComponent(pri); setP(right, { Label: '받기', Icon: recv, ShowIcon: true }); right.name = 'Button / Primary 받기'
      out.push(left.id, right.id)
    }
    return out
  },
  async asset() { // P2-1
    const out = []
    for (const [l, d, name] of [['423:16447', '430:15384', 'Sepolia ETH'], ['515:30153', '515:30727', 'USD Coin']]) {
      const f = await node(pair(l, d)), nav = byName(f, 'Nav')
      let t = nav.findOne(n => n.type === 'TEXT' && n.name === 'Nav title')
      if (!t) { t = await txt(name, 'Product B/Headline', 'text/primary', 'Nav title'); nav.insertChild(1, t) } else await setText(t, name)
      setP(byName(f, 'Amount hero'), { 'Show body': false })
      out.push(t.id)
      if (name === 'USD Coin') {
        const det = byName(f, 'Detail 컨트랙트 주소'), parent = det.parent
        let row = parent.findOne(n => n.name === 'Contract row')
        if (!row) {
          row = al('HORIZONTAL', 'Contract row', { cross: 'CENTER', pad: [null, 'layout/screen/padding', null, null] })
          parent.insertChild(parent.children.indexOf(det), row); row.layoutSizingHorizontal = 'FILL'
          row.appendChild(det); det.layoutSizingHorizontal = 'FILL'
          const b = (await node('398:247')).children.find(c => c.name === 'Type=Secondary, Size=sm, State=Default').createInstance()
          row.appendChild(b); setP(b, { Label: '복사', 'Show icon': true, Icon: '137:144' }); b.name = 'Button / Copy contract'
        }
        out.push(row.id)
      }
    }
    return out
  },
  async notesHome() { return 'skip' },
  // ---------- Send & receive ----------
  async s20a() { // P2-2
    const f = await node(pair('423:885', '430:14802'))
    const inp = byName(f, 'B/Input 받는 주소'), paste = byName(inp, 'Paste link'), val = byName(inp, 'Value')
    await setText(paste, '지우기')
    const s = val.characters, n = s.length
    val.setRangeFills(0, n, [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.4, g: 0.45, b: 0.5 } }, 'color', V('text/tertiary'))])
    const pri = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.07, g: 0.09, b: 0.11 } }, 'color', V('text/primary'))
    val.setRangeFills(0, 6, [pri]); val.setRangeFills(n - 4, n, [pri])
    pair('423:848', '430:14779') // meta repaint (P1-2) happens in the repaint pass
    return [paste.id, val.id, s]
  },
  async token() { // P2-4: real USDC Sepolia contract (packages/contracts/src/rpc.ts)
    const out = []
    for (const [l, d] of [['423:14925', '430:14996'], ['430:7737', '430:15454'], ['494:4381', '494:6686']]) {
      const f = await node(pair(l, d)), a = byName(byName(f, 'Block 받는 사람'), 'Address'), p = {}
      USDC.forEach((g, i) => p['Group ' + (i + 1)] = g); setP(a, p); out.push(a.id)
    }
    return out
  },
  async review() { // P2-13 + copy, P2-3, P2-12 (non-text parts ran remotely)
    const c = await node(pair('457:16988', '494:6777')); setP(byName(c, 'Amount hero'), { Body: '계정 1에서 아래 주소로 보내요\n수수료를 다시 확인해야 해요' })
    const r = await node(pair('457:17074', '494:6823')); setP(byName(r, 'Banner Warning'), { Message: '보내기 전에 수수료나 거래 정보가 바뀌었어요.\n새 내용을 확인한 뒤 다시 보내세요.' })
    pair('494:4242', '494:6641'); pair('461:5074', '494:6148'); pair('423:15006', '430:15037'); pair('430:7672', '430:15411')
    return [c.id, r.id]
  },
  async s23() { // P0-2, P1-5
    const t = await node(pair('457:4366', '494:7262'))
    const h = byName(t, 'Amount hero'); setP(h, { Title: '테스트 거래예요', Body: '이 기기에서 만든 예시예요.\n네트워크로 보내지 않았어요.' })
    h.findOne(n => n.name === 'Status badge').setProperties({ Kind: 'Info' })
    byName(t, 'Progress').visible = false
    for (const w of t.findAll(n => n.name === 'Inline Warning')) w.visible = false
    byName(t, 'Detail 예상 네트워크 수수료').visible = false
    const out = [t.id]
    for (const id of [pair('423:15795', '430:15106'), pair('423:15852', '430:15132')]) {
      const w = visibleByName(await node(id), 'Inline Warning'); setP(w, { Message: '이미 네트워크에 보냈어요.\n같은 거래를 다시 보내지 마세요.' }); out.push(w.id)
    }
    return out
  },
  async s23reason() { // P2-9: failed result with a confirmed reason line; the default Failed frame stays as is
    const sl = await node('486:17420'), sd = await node('486:17421'), src = await node('423:15959')
    let f = sl.children.find(c => c.name === 'B-S23 Send result Failed / Reason')
    if (!f) { f = src.clone(); sl.appendChild(f); f.name = 'B-S23 Send result Failed / Reason'; f.x = 100; f.y = newRowY(sl) }
    const content = one(f, n => n.name === 'Content' && n.type === 'FRAME', 'Content'), h = byName(content, 'Amount hero')
    let cap = content.findOne(n => n.name === 'Reason')
    if (!cap) {
      cap = al('VERTICAL', 'Reason', { pad: [null, 'layout/screen/padding', 'space/4', 'layout/screen/padding'] })
      content.insertChild(content.children.indexOf(h) + 1, cap); cap.layoutSizingHorizontal = 'FILL'
      await wrapTxt(cap, '이유: 수수료 한도가 부족했어요.', 'Product B/Caption', 'text/secondary', 'Reason text', 'CENTER')
    }
    growSection(sl)
    await note(sl, f, '네트워크에서 확인한 실패 이유 값이 있을 때만 이 줄을 보여요(오너 2026-10-17). 값이 없으면 왼쪽 기본 Failed 화면. 추측한 이유는 쓰지 않아요. 실패 haptic notificationError.')
    PAIRS.push([f.id, null, sd])
    return f.id
  },
  async s24() { // P1-3: background = new S10 pending
    const f = await node(pair('423:15062', '430:15080')), old = byName(f, 'Body'), src = byName(await node('423:742'), 'Body')
    const i = f.children.indexOf(old), cl = src.clone(); f.insertChild(i, cl); old.remove()
    const nav = f.children.find(c => c.name === 'Product navigation'); const srcNav = (await node('423:742')).children.find(c => c.name === 'Product navigation')
    if (nav && srcNav) { const n2 = srcNav.clone(); f.insertChild(f.children.indexOf(nav), n2); nav.remove() }
    return cl.id
  },
  async s31() { // P1-5, P2-6
    const f = await node(pair('423:13750', '430:15617'))
    const es = byName(f, 'B/Empty state 백업')
    setP(es, { Body: '기기를 잃어도 지갑을 되찾으려면\n복구 구문이 필요해요.\n백업을 마치면 받기 주소가 보여요.', Icon: '533:21900' })
    const hero = es.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Icon / hero'))
    if (hero) for (const v of hero.findAll(n => n.type === 'VECTOR')) fillR(v, 'icon/status/warning')
    const chip = byName(f, 'Chip Sepolia 테스트넷'), nav = byName(f, 'Nav')
    if (chip.parent !== nav) { nav.appendChild(chip); nav.primaryAxisAlignItems = 'SPACE_BETWEEN'; nav.counterAxisAlignItems = 'CENTER' }
    return [es.id, chip.id]
  },
  async notesSend() { // P2-17
    const sl = await node('486:17420'), out = []
    out.push(await note(sl, await node('423:929'), '자판: 숫자를 누를 때 haptic selection(가벼운 틱). 칩(25%·50%·전액)도 같은 haptic. 잘못된 입력은 흔들기 대신 오류 줄만 바뀜(160 ms). 움직임 줄이기: 모션 없음, haptic 유지.'))
    out.push(await note(sl, await node('423:15006'), '위험 sheet: 아래에서 250 ms ease-out, scrim 페이드. 열릴 때 haptic notificationWarning. "취소"가 Primary. 움직임 줄이기: 페이드만.'))
    out.push(await note(sl, await node('423:15909'), '확정: 진행 표시의 마지막 단계가 채워짐(200 ms), haptic notificationSuccess 1회. 움직임 줄이기: 색만 바뀜.'))
    out.push(await note(sl, await node('423:15959'), '실패: hero가 바뀔 때 haptic notificationError 1회. 흔들기 없음. 이유 값이 있으면 아래 "Reason" 상태를 써요.'))
    return out
  },
  // ---------- Activity ----------
  async s41full() { // P1-7
    const al_ = await node('486:17437'), ad = await node('486:17438'), out = []
    pair('457:4412', '494:18069'); pair('457:17613', '494:18109'); pair('457:17502', '494:17808')
    let y = null, x = 100
    for (const id of ['423:16327', '460:4988', '457:4412', '423:16381']) {
      const src = await node(id), name = src.name + ' · full'
      let f = al_.children.find(c => c.name === name)
      if (!f) { if (y === null) y = newRowY(al_); f = src.clone(); al_.appendChild(f); f.name = name; f.x = x; f.y = y; x += 470 }
      makeFull(f); out.push(f.id); PAIRS.push([f.id, null, ad])
    }
    growSection(al_)
    return out
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
  const PAGE_OF = { s90: '486:17443', s60: '486:17443', s61: '486:17443', s64: '486:17443', s65: '486:17443', balances: '486:76', emptyHome: '486:76', asset: '486:76', notesHome: '486:76', s20a: '486:17419', token: '486:17419', review: '486:17419', s23: '486:17419', s23reason: '486:17419', s24: '486:17419', s31: '486:17419', notesSend: '486:17419', s41full: '486:17436' }
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
