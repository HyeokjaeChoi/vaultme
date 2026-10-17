// VaultMe Local Runner: TASK visual-fixes (#54). Aesthetic review P0/P1/P2 + S05/S06 owner decisions + Brand/Mark option A. Helpers copied from s05-cells.
// (old header)  S05 restore per-word cells + optional passphrase (outputs/design/redesign-b.md §9.3,
// owner rows 2026-10-17). New B/Word cell, B/Input trailing action, 3 Solar icons; S05 frames rebuilt (old ones archived); Dark re-cloned; repaint.
const TASK = 'visual-fixes'
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
const MAP = {"activity-s40-list": ["404:387", "430:14668"], "activity-s40-empty": ["423:16109", "430:15259"], "activity-s40-loading": ["423:16158", "430:15278"], "activity-s40-error-cached": ["423:16236", "430:15304"], "activity-s40-error-nocache": ["457:17502", "494:17808"], "activity-s40-testmode": ["471:5163", "494:17854"], "activity-s40-unknown-replaced": ["460:5024", "494:17906"], "activity-s41-confirmed": ["423:16327", "430:15326"], "activity-s41-unknown": ["423:16381", "430:15353"], "activity-s41-realchain": ["460:4988", "494:18031"], "activity-s41-testmode": ["457:4412", "494:18069"], "activity-s41-testmode-clear-sheet": ["457:17613", "494:18109"], "activity-s41-api-error": ["457:17668", "494:18177"], "asset-s11-eth": ["423:16447", "430:15384"], "asset-s11-usdc": ["515:30153", "515:30727"], "brand-s01-start": ["423:13440", "430:15497"], "brand-s90-lock-faceid": ["423:15412", "430:16073"], "brand-s90-lock-failed": ["515:33081", "515:33242"], "brand-s91-update": ["423:15443", "430:16093"], "brand-s92-root": ["423:15474", "430:16113"], "home-s10": ["404:163", "430:14606"], "home-s10-empty-faucet": ["515:29238", "515:30619"], "home-s10-testnet-sheet": ["555:67287", "555:66213"], "home-s10-newwallet": ["423:643", "430:14732"], "home-s10-pending": ["423:742", "430:14755"], "home-s10-testdata-sheet": ["515:29783", "515:30956"], "home-s10-testmode": ["457:4274", "457:4320"], "home-s50-push-optin": ["423:14215", "430:15953"], "onboarding-s02-ack": ["423:13478", "430:15518"], "onboarding-s02-ack-checked": ["515:31398", "515:32140"], "onboarding-s03-hidden": ["423:13533", "430:15543"], "onboarding-s03-revealed": ["423:13622", "430:15570"], "onboarding-s03-revealed-checked": ["515:31608", "515:32216"], "send-s20a-recipient-empty": ["423:848", "430:14779"], "send-s20a-recipient-valid": ["423:885", "430:14802"], "send-s20b-amount": ["423:929", "430:14826"], "send-s20b-amount-full": ["423:1000", "430:14855"], "send-s20b-amount-error": ["423:1071", "430:14884"], "send-s22-review": ["404:315", "430:14628"], "send-s22-review-full": ["419:12973", "430:14692"], "send-s22-review-rechecking": ["461:5074", "494:6148"], "send-s22-autherror": ["457:16902", "494:6731"], "send-s22-chainerror": ["457:16988", "494:6777"], "send-s22-needsreview": ["457:17074", "494:6823"], "send-s22-prepareerror": ["457:17160", "494:6869"], "send-s22-pendingblock": ["457:17246", "494:6914"], "send-s22-blocked": ["457:17332", "494:6959"], "send-s22l-lookalike": ["423:14763", "430:14914"], "send-s22l-lookalike-sheet": ["423:15006", "430:15037"], "send-s22l-lookalike-acknowledged": ["494:4103", "494:6596"], "send-s22b-burn": ["423:14844", "430:14955"], "send-s22b-burn-sheet": ["430:7672", "430:15411"], "send-s22b-burn-acknowledged": ["494:4242", "494:6641"], "send-s22t-token": ["423:14925", "430:14996"], "send-s22t-token-sheet": ["430:7737", "430:15454"], "send-s22t-token-acknowledged": ["494:4381", "494:6686"], "send-s23-pending": ["423:15795", "430:15106"], "send-s23-included": ["423:15852", "430:15132"], "send-s23-confirmed": ["423:15909", "430:15158"], "send-s23-failed": ["423:15959", "430:15183"], "send-s23-unknown": ["423:16009", "430:15208"], "send-s23-replaced": ["423:16059", "430:15234"], "send-s23-pending-testmode": ["457:4366", "494:7262"], "send-s24-blocked-sheet": ["423:15062", "430:15080"], "send-s30-receive-faucet": ["423:14163", "430:15692"], "send-s31-backup-required": ["423:13750", "430:15617"], "settings-s60": ["423:13797", "430:15642"], "settings-s60-full": ["515:45343", "515:45681"], "settings-s61-phrase": ["423:13856", "430:15667"], "settings-s64-licenses": ["526:54261", "526:54545"], "settings-s64-licenses-full": ["526:54503", "526:54587"], "settings-s65-license-text": ["526:55042", "526:55830"], "send-s23-failed-reason": ["526:55172", "526:57104"], "activity-s41-confirmed-full": ["526:55415", "526:57603"], "activity-s41-realchain-full": ["526:55456", "526:57641"], "activity-s41-testmode-full": ["526:55499", "526:57681"], "activity-s41-unknown-full": ["526:55547", "526:57725"], "copy-feedback": ["555:72581", "555:65910"], "settings-s65-license-nofile": ["555:67249", "555:67925"], "onboarding-s04-check": ["423:15243", "430:15977"], "onboarding-s04-typing": ["555:70468", "555:66287"], "onboarding-s04-wrong": ["555:70515", "555:66313"], "onboarding-s04-filled": ["555:70569", "555:66339"], "onboarding-s06-done": ["423:13703", "430:15595"], "onboarding-s06-copied": ["555:70619", "555:69639"], "onboarding-s05-restore": ["423:15293", "430:16003"], "onboarding-s05-typing": ["565:85343", "565:75157"], "onboarding-s05-ready": ["565:85483", "565:75203"], "onboarding-s05-busy": ["565:85628", "565:75249"], "onboarding-s05-unknownword": ["565:85778", "565:75295"], "onboarding-s05-checksum": ["565:85919", "565:75342"], "onboarding-s05-exists": ["565:86060", "565:75389"], "onboarding-s05-saveerror": ["565:86214", "565:75437"], "onboarding-s05-passphrase-masked": ["565:86368", "565:78059"], "onboarding-s05-passphrase-shown": ["565:86527", "565:78106"], "onboarding-s05-24words": ["565:86684", "565:78153"], "onboarding-s06-passphrase": ["565:86884", "565:78211"]}
const ID = {}
const pageOf = n => { let p = n; while (p.type !== 'PAGE') p = p.parent; return p }
async function go(id) { const n = await node(id); const p = pageOf(n); if (figma.currentPage !== p) await figma.setCurrentPageAsync(p); return n }
const keys = re => Object.keys(MAP).filter(k => re.test(k))
async function eachFrame(names, fn) {
  const out = []
  for (const nm of names) {
    const ids = MAP[nm]; if (!ids) { out.push('nomap ' + nm); continue }
    for (let i = 0; i < 2; i++) {
      try { const r = await go(ids[i]); const x = await fn(r, nm, i === 0 ? 'L' : 'D'); if (x) out.push(nm + (i ? ' D ' : ' L ') + x) } catch (e) { out.push('ERR ' + nm + ' ' + ids[i] + ' ' + String(e).slice(0, 200)) }
    }
  }
  return out
}
const HEADLINE = 'Product B/Headline', ROWTITLE = 'Product B/Row title'
const NOTICE = '고급을 접으면 입력한 패스프레이즈가 지워져요.'
const MSG_UNKNOWN2 = '3번째 단어가 복구 구문 단어 목록에 없어요'
const FACE = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M22 14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22"/><path d="M10 22C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14"/><path d="M10 2C6.22876 2 4.34315 2 3.17157 3.17157C2 4.34315 2 6.22876 2 10"/><path d="M14 2C17.7712 2 19.6569 2 20.8284 3.17157C22 4.34315 22 6.22876 22 10"/><path d="M9 9.5V11"/><path d="M15 9.5V11"/><path d="M12 9.5V13.5H11"/></g></svg>'

async function btnGhostSm(label) {
  const bbtn = await node('398:247')
  const v = bbtn.children.find(c => c.name === 'Type=Ghost, Size=sm, State=Default').createInstance()
  setP(v, { Label: label, 'Show icon': false }); fillR(byName(v, 'Label'), 'text/link'); return v
}
async function setStyle(t, styleName) {
  for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f)
  await t.setTextStyleIdAsync(S(styleName).id)
}

const STEPS = {
  async comps() {
    const out = {}
    const sec = await node('398:77')
    // 1. Row title style (Pretendard 500, 17/25, ls -0.3) copied from Headline
    let rt = L.s[ROWTITLE]
    if (!rt) {
      const h = S(HEADLINE), lab = S('Product B/Label')
      rt = figma.createTextStyle(); rt.name = ROWTITLE
      await figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' })
      rt.fontName = { family: 'Pretendard', style: 'Medium' }; rt.fontSize = h.fontSize; rt.lineHeight = h.lineHeight; rt.letterSpacing = h.letterSpacing
      const bvH = h.boundVariables || {}, bvL = lab.boundVariables || {}
      out.bvH = Object.keys(bvH); out.bvL = Object.keys(bvL)
      for (const f of Object.keys(bvH)) { try { const src = f === 'fontWeight' ? bvL[f] : bvH[f]; const a = Array.isArray(src) ? src[0] : src; if (a && L.byId[a.id]) rt.setBoundVariable(f, L.byId[a.id]) } catch (e) { out['bind ' + f] = String(e).slice(0, 80) } }
      rt.description = 'Row and list-item titles (Home asset rows, activity rows, settings rows, license rows, action rows). Pretendard 500, 17/25, -0.3. Headline (600) stays for buttons, notice titles, amounts and emphasis; 700 only for figures. 2026-10-17 aesthetic review P1-1.'
      L.s[ROWTITLE] = rt
    }
    out.rowTitle = rt.id
    // 2. apply to masters
    const T = [['B/Row', 'Title'], ['B/Settings row', 'Title'], ['B/Switch row', 'Title'], ['B/Action row', 'Label']]
    out.applied = {}
    for (const [setName, tn] of T) {
      const set = sec.children.find(c => c.name === setName); if (!set) { out.applied[setName] = 'missing'; continue }
      const comps = set.type === 'COMPONENT_SET' ? set.children : [set]; let n = 0
      for (const c of comps) for (const t of c.findAll(x => x.type === 'TEXT' && x.name === tn)) { await setStyle(t, ROWTITLE); n++ }
      out.applied[setName] = n
    }
    // 3. Keypad key label 22 -> 26 (Title 1)
    const kk = sec.children.find(c => c.name === 'B/Keypad key'); let nk = 0
    for (const c of kk.children) for (const t of c.findAll(x => x.type === 'TEXT' && x.name === 'Label')) { await setStyle(t, 'Product B/Title 1'); nk++ }
    out.keypad = nk
    // 4. Detail row center aligned
    const dr = sec.children.find(c => c.name === 'B/Detail row'); for (const v of dr.children) v.counterAxisAlignItems = 'CENTER'
    // 5. Secret grid panel: new semantic surface/inset (Light = subtle, Dark = raised)
    let iv = L.v['surface/inset']
    if (!iv) {
      iv = figma.variables.createVariable('surface/inset', L.sem, 'COLOR'); iv.scopes = ['FRAME_FILL', 'SHAPE_FILL']
      iv.setValueForMode('2:1', V('surface/subtle').valuesByMode['2:1']); iv.setValueForMode('298:0', V('surface/raised').valuesByMode['298:0'])
      iv.description = 'Inset panel on screenB/bg: Light = surface/subtle, Dark = surface/raised (one step lighter than the screen). Used by B/Secret grid.'
      L.v['surface/inset'] = iv; L.byId[iv.id] = iv
    }
    const sg = sec.children.find(c => c.name === 'B/Secret grid'); const panel = sg.findOne(n => n.name === 'Panel'); fillR(panel, 'surface/inset'); out.inset = iv.id
    for (const t of sg.findAll(x => x.type === 'TEXT' && /^(Num|Number|Index)/.test(x.name))) fillR(t, 'text/tertiary')
    out.sgTexts = sg.findAll(x => x.type === 'TEXT').slice(0, 4).map(t => t.name + ':' + t.characters)
    // 6. Progress steps: 3 equal columns, dot + label centred, lines only between dots
    const ps = sec.children.find(c => c.name === 'B/Progress steps')
    const vn = n => { const p = n.fills[0]; return p && p.boundVariables && p.boundVariables.color ? L.byId[p.boundVariables.color.id].name : null }
    for (const v of ps.children) {
      const track = byName(v, 'Track'), labels = byName(v, 'Labels')
      if (track.children.some(c => /^Step /.test(c.name))) continue
      const [d1, l1, d2, l2, d3] = track.children
      const g1 = vn(l1), g2 = vn(l2)
      const cells = [0, 1, 2].map(i => { const c = al('HORIZONTAL', 'Step ' + (i + 1), {}); c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; track.appendChild(c); c.layoutSizingHorizontal = 'FILL'; return c })
      const half = (src, name, color) => { const h = src.clone(); h.name = name; if (color) fillR(h, color); else h.fills = []; return h }
      const put = (cell, arr) => { for (const x of arr) { cell.appendChild(x); if (x.name.startsWith('Line')) { x.layoutSizingHorizontal = 'FILL'; x.layoutSizingVertical = 'FIXED'; x.resize(x.width, 2) } } }
      put(cells[0], [half(l1, 'Line left', null), d1, half(l1, 'Line right', g1)])
      put(cells[1], [half(l1, 'Line left', g1), d2, half(l2, 'Line right', g2)])
      put(cells[2], [half(l2, 'Line left', g2), d3, half(l2, 'Line right', null)])
      l1.remove(); l2.remove()
      for (const t of labels.children) { t.layoutSizingHorizontal = 'FILL'; t.textAlignHorizontal = 'CENTER'; t.textAutoResize = 'HEIGHT' }
      bind(v, 'paddingBottom', 'space/6')
    }
    out.progress = ps.children.map(v => v.name + ' ' + Math.round(v.width) + 'x' + Math.round(v.height))
    return out
  },
  async face() {
    const inst = await node('515:45574'), main = await inst.getMainComponentAsync(), out = { main: main.id, name: main.name }
    for (const c of [...main.children]) c.remove()
    const f = figma.createNodeFromSvg(FACE); f.name = 'Artwork / solar:face-scan-square-linear (no mouth)'; f.fills = []; main.appendChild(f); f.x = 0; f.y = 0
    for (const v of f.findAll(n => n.type === 'VECTOR')) { const o = v.outlineStroke(); if (o) { f.appendChild(o); o.x = v.x; o.y = v.y; o.name = 'Vector (Stroke)'; o.strokes = []; fillR(o, 'icon/primary'); v.remove() } }
    main.resize(32, 32)
    main.description = 'Face ID status glyph, Solar face-scan-square-linear with the mouth removed (no smiley; security app). CC BY 4.0, 480 Design. Fill icon/primary. 2026-10-17 aesthetic review P1-9.'
    out.kids = main.children.map(c => c.name + ' ' + Math.round(c.width))
    return out
  },
  async mark() { // Brand/Mark option A (569:10199): replace contents, keep master ID; add Size=96
    const set = await node('495:17569'), A = await node('569:10199'), out = {}
    const tileSrc = A.children.find(n => n.name === 'tile'), glyphSrc = A.children.find(n => n.name === 'glyph')
    out.tileFill = JSON.stringify(tileSrc.fills.map(p => p.boundVariables && p.boundVariables.color && L.byId[p.boundVariables.color.id].name)); out.glyphFill = JSON.stringify(glyphSrc.fills.map(p => p.boundVariables && p.boundVariables.color && L.byId[p.boundVariables.color.id].name))
    if (!set.children.some(c => /Size=96/.test(c.name))) {
      for (const tone of ['OnLight', 'OnBrand']) { const src = set.children.find(c => c.name === 'Size=72, Tone=' + tone); const c = src.clone(); set.appendChild(c); c.name = 'Size=96, Tone=' + tone }
    }
    for (const c of set.children) {
      const m = /Size=(\d+), Tone=(\w+)/.exec(c.name); const Sz = +m[1], tone = m[2]
      const frame = c.children[0]; for (const k of [...frame.children]) k.remove()
      c.resize(Sz, Sz); frame.resize(Sz, Sz)
      const r = tileSrc.clone(); frame.appendChild(r); r.x = 0; r.y = 0; r.resize(Sz, Sz)
      const tile = figma.flatten([r]); tile.name = 'tile'; fillR(tile, tone === 'OnLight' ? 'brand/primary' : 'color/neutral/0'); tile.x = 0; tile.y = 0
      const g = glyphSrc.clone(); frame.appendChild(g); g.name = 'glyph'; g.resize(57 * Sz / 96, 52 * Sz / 96); g.x = 20 * Sz / 96; g.y = 22 * Sz / 96
      fillR(g, tone === 'OnLight' ? 'color/neutral/0' : 'brand/primary')
    }
    set.description = 'VaultMe mark, owner pick option A (2026-10-17): V monogram with keyhole negative space on a rounded tile. Vector only, no text. Tone=OnLight: Blue A tile with white glyph for white surfaces. Tone=OnBrand: white tile with Blue A glyph for brand-colored surfaces. Sizes 96 (brand screens) / 72 / 40 / 24. Tile is for app icon and brand screens; inside UI use the glyph at 24.'
    out.variants = set.children.map(c => c.name + ' ' + Math.round(c.width))
    return out
  },
  async sweep() { // instance overrides: Headline -> Row title inside row components; Home row subtitles
    const out = { rowTitle: 0, subs: 0, copy: 0 }
    const hid = S(HEADLINE).id
    const SETS = { 'B/Row': 'Title', 'B/Settings row': 'Title', 'B/Switch row': 'Title', 'B/Action row': 'Label' }
    const cache = new Map()
    const setOf = async inst => { if (cache.has(inst.id)) return cache.get(inst.id); const m = await inst.getMainComponentAsync(); const r = m ? (m.parent && m.parent.type === 'COMPONENT_SET' ? m.parent.name : m.name) : ''; cache.set(inst.id, r); return r }
    for (const pid of ['485:76', '486:76', '486:17419', '486:17436', '486:17443']) {
      await figma.setCurrentPageAsync(await node(pid))
      for (const t of figma.currentPage.findAllWithCriteria({ types: ['TEXT'] })) {
        if (t.parent && /^Note/.test(t.name)) continue
        if (t.textStyleId === hid) {
          let p = t.parent, hit = false
          while (p && p.type !== 'PAGE' && !hit) { if (p.type === 'INSTANCE') { const sn = await setOf(p); if (SETS[sn] && SETS[sn] === t.name) hit = true } p = p.parent }
          if (hit) { await setStyle(t, ROWTITLE); out.rowTitle++ }
        }
        if (/;399:91$/.test(t.id) && (t.characters === 'ETH' || t.characters === 'USDC')) { await setText(t, t.characters === 'ETH' ? '테스트넷' : '테스트 토큰'); out.subs++ }
      }
    }
    return out
  },
  async frames() {
    const out = {}
    // Receive: faucet inside footer stack, QR tile
    out.receive = await eachFrame(['send-s30-receive-faucet'], async root => {
      const body = byName(root, 'Body'), content = byName(body, 'Content'), actions = byName(body, 'Actions')
      if (body.children.some(c => c.name === 'Footer')) return 'already'
      const faucet = byName(content, 'Faucet')
      const footer = al('VERTICAL', 'Footer', {}); body.insertChild(body.children.indexOf(actions), footer); footer.layoutSizingHorizontal = 'FILL'
      footer.fills = actions.fills; footer.strokes = actions.strokes; footer.strokeAlign = actions.strokeAlign
      footer.strokeTopWeight = actions.strokeTopWeight; footer.strokeBottomWeight = actions.strokeBottomWeight; footer.strokeLeftWeight = actions.strokeLeftWeight; footer.strokeRightWeight = actions.strokeRightWeight
      footer.appendChild(faucet); faucet.layoutSizingHorizontal = 'FILL'; footer.appendChild(actions); actions.layoutSizingHorizontal = 'FILL'
      actions.fills = []; actions.strokes = []
      const row = byName(content, 'QR row'), qr = byName(row, 'QR code')
      const tile = al('VERTICAL', 'QR tile', { pad: ['space/3', 'space/3', 'space/3', 'space/3'] }); row.insertChild(row.children.indexOf(qr), tile); tile.appendChild(qr); fillR(tile, 'surface/subtle')
      for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bind(tile, k, 'radius/2xl')
      bind(row, 'paddingTop', 'space/2'); bind(row, 'paddingBottom', 'space/2')
    })
    // Tab header pattern
    const tabNames = [...keys(/^home-s10/), ...keys(/^activity-s40/), 'settings-s60', 'settings-s60-full']
    out.tab = await eachFrame(tabNames, async (root, nm) => {
      const h = root.findOne(n => n.type === 'FRAME' && (n.name === 'Header' || n.name === 'Title') && n.layoutMode === 'HORIZONTAL' && n.width >= 380 && n.parent && n.parent.type === 'FRAME' && (n.parent.name === 'Body' || n.parent.name === 'Content'))
      if (!h) return 'noheader'
      let chips = h.children.find(c => c.name === 'Chips')
      if (!chips) {
        const src = await node('494:16619'), main = await src.getMainComponentAsync()
        chips = al('HORIZONTAL', 'Chips', {}); h.appendChild(chips); chips.counterAxisAlignItems = 'CENTER'
        const ci = main.createInstance(); chips.appendChild(ci); ci.name = 'Chip Sepolia 테스트넷'
      }
      h.primaryAxisSizingMode = 'FIXED'; h.counterAxisSizingMode = 'FIXED'; h.resize(h.width, 58); h.layoutSizingHorizontal = 'FILL'
      h.counterAxisAlignItems = 'CENTER'; h.primaryAxisAlignItems = 'MIN'; pad(h, null, 'layout/screen/padding', null, 'layout/screen/padding'); bind(h, 'itemSpacing', 'layout/fieldGap')
      const lead = h.children[0]; if (lead !== chips) lead.layoutSizingHorizontal = 'FILL'
      const td = chips.children.find(c => /테스트 데이터/.test(c.name))
      if (td && /^activity/.test(nm)) {
        const body = h.parent, dh = body.children.find(c => c.name === 'B/Date header' && c.visible !== false)
        body.appendChild(td); td.layoutPositioning = 'ABSOLUTE'; td.x = body.width - 16 - td.width; td.y = dh ? dh.y + 21.5 : 70
      }
    })
    // Asset detail nav title left
    out.asset = await eachFrame(['asset-s11-eth', 'asset-s11-usdc'], async root => {
      const nav = root.findOne(n => n.name === 'Nav' && n.layoutMode === 'HORIZONTAL'), t = nav && nav.children.find(c => c.name === 'Nav title'); if (!t) return 'nonav'
      await setStyle(t, 'Product B/Title 2'); t.textAlignHorizontal = 'LEFT'; t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'
    })
    // Amount vertical balance
    out.amount = await eachFrame(['send-s20b-amount', 'send-s20b-amount-full', 'send-s20b-amount-error'], async root => {
      const content = root.findOne(n => n.name === 'Content' && n.type === 'FRAME'), sp = content.children.find(c => c.name === 'Spacer')
      if (!sp) return 'nospacer'
      const disp = content.children.find(c => /Amount display/.test(c.name)); const sp2 = sp.clone(); sp2.name = 'Spacer top'; content.insertChild(content.children.indexOf(disp), sp2)
      sp2.layoutSizingVertical = 'FILL'; sp.name = 'Spacer bottom'; sp.layoutSizingVertical = 'FILL'
    })
    // Failed: two buttons, details link inline
    out.failed = await eachFrame(['send-s23-failed', 'send-s23-failed-reason'], async root => {
      const content = root.findOne(n => n.name === 'Content' && n.type === 'FRAME'), actions = byName(root, 'Actions')
      const ghost = actions.children.find(c => c.name === 'Button / Ghost'); if (!ghost) return 'noghost'
      const link = await btnGhostSm('거래 상세 보기')
      const wrap = al('HORIZONTAL', 'Detail link', { pad: [null, 'layout/screen/padding', 'space/2', 'layout/screen/padding'] }); wrap.primaryAxisAlignItems = 'CENTER'
      content.insertChild(1, wrap); wrap.layoutSizingHorizontal = 'FILL'; wrap.appendChild(link); ghost.remove()
    })
    // Results: Block top padding space/6
    out.blocks = await eachFrame([...keys(/^send-s23/), ...keys(/^activity-s41/)], async root => {
      let n = 0; for (const b of root.findAll(x => x.type === 'FRAME' && /^Block /.test(x.name) && x.layoutMode === 'VERTICAL')) { bind(b, 'paddingTop', 'space/6'); n++ }
      return n ? '' : 'noblock'
    })
    // Licenses
    out.lic = await eachFrame(['settings-s64-licenses', 'settings-s64-licenses-full'], async root => {
      let n = 0
      for (const r of root.findAll(x => x.type === 'INSTANCE' && /^License /.test(x.name))) { const v = r.findOne(x => x.type === 'TEXT' && x.name === 'Value'); if (v) { await setStyle(v, 'Product B/Caption'); n++ } }
      for (const t of root.findAll(x => x.type === 'TEXT' && x.characters === '아이콘·글꼴')) await setText(t, '아이콘 · 글꼴')
      for (const f of root.findAll(x => x.name === 'Block 아이콘·글꼴')) f.name = 'Block 아이콘 · 글꼴'
      return 'values ' + n
    })
    // Lock: Face ID gap
    out.lock = await eachFrame(['brand-s90-lock-faceid'], async root => { const f = root.findOne(x => x.name === 'Face ID status'); if (f) bind(f, 'itemSpacing', 'space/2') })
    return out
  },
  async s05s06() {
    const out = {}
    out.unknown = await eachFrame(['onboarding-s05-unknownword'], async root => { await setText(byName(root, 'Grid message'), MSG_UNKNOWN2) })
    out.pass = await eachFrame(['onboarding-s05-passphrase-masked', 'onboarding-s05-passphrase-shown'], async (root, nm, kind) => {
      const pp = byName(root, 'Passphrase'), inp = pp.children.find(c => c.name === 'Input 패스프레이즈')
      setP(inp, { Value: /shown/.test(nm) ? 'TREZOR' : '••••••' })
      if (!pp.children.some(c => c.name === 'Collapse notice')) {
        const wrap = al('VERTICAL', 'Collapse notice', { pad: ['space/2', 'layout/screen/padding', null, 'layout/screen/padding'] }); pp.appendChild(wrap); wrap.layoutSizingHorizontal = 'FILL'
        await wrapTxt(wrap, NOTICE, 'Product B/Caption', 'text/tertiary', 'Notice')
      }
      const content = byName(root, 'Content'); content.layoutSizingVertical = 'HUG'; const need = content.height; content.layoutSizingVertical = 'FILL'; root.resize(390, Math.max(844, 205 + need))
      if (kind === 'L') { const sl = root.parent, nn = sl.children.find(c => c.name === 'Note · ' + root.name); if (nn) { nn.y = root.y + root.height + 16; await setText(nn, nn.characters.replace(/ 예시 값은 공개 test vector 단어예요\(실제 패스프레이즈 금지\)\./, ' 예시 패스프레이즈는 공개 Trezor test vector "TREZOR"예요(실제 패스프레이즈 금지).').replace('행을 다시 접으면 입력한 패스프레이즈를 지워요(안 보이는 값이 복구에 쓰이지 않게).', '행을 다시 접으면 입력한 패스프레이즈를 지워요(안 보이는 값이 복구에 쓰이지 않게). 칸 아래에 미리 안내해요: "' + NOTICE + '"')) } }
    })
    out.s06 = await eachFrame(['onboarding-s06-done', 'onboarding-s06-copied', 'onboarding-s06-passphrase'], async (root, nm, kind) => {
      const content = byName(root, 'Content'), actions = byName(root, 'Actions'), sec = actions.children.find(c => c.name === 'Button / Secondary')
      const lab = byName(sec, 'Label'), old = lab.characters; if (old === '다른 주소예요') return 'already'
      const link = await btnGhostSm(old)
      const wrap = al('HORIZONTAL', 'Copy row', { pad: [null, 'layout/screen/padding', null, 'layout/screen/padding'] }); wrap.primaryAxisAlignItems = 'MIN'
      const detail = content.children.find(c => /^Detail/.test(c.name)); content.insertChild(content.children.indexOf(detail) + 1, wrap); wrap.layoutSizingHorizontal = 'FILL'; wrap.appendChild(link)
      setP(sec, { Label: '다른 주소예요' }); try { setP(sec, { 'Show icon': false }) } catch (e) {}
      if (/passphrase/.test(nm)) await setText(byName(detail, 'Value'), '0x9c32 F71D 4DB8 Fb9e 1A58 B0a8 0dF7 9935 e725 6FA6')
      return 'old=' + old
    })
    return out
  },
  async brand() {
    const out = {}
    const names = ['brand-s01-start', 'brand-s90-lock-faceid', 'brand-s90-lock-failed', 'brand-s91-update', 'brand-s92-root']
    out.f = await eachFrame(names, async (root, nm) => {
      const brand = byName(byName(root, 'Content'), 'Brand'); bind(brand, 'itemSpacing', 'space/8')
      const mark = brand.children.find(c => c.name === 'Brand/Mark'); if (mark) setP(mark, { Size: '96' })
      const text = byName(brand, 'Text'), title = byName(text, 'Title'), body = byName(text, 'Body')
      if (/s01|s90/.test(nm)) await setStyle(title, 'Product B/Display M')
      if (/s01/.test(nm)) await setStyle(body, 'Product B/Title 2')
    })
    const sl = await node('485:77'); const fr = n => sl.children.find(c => c.name === n)
    const s01 = await node('423:13440'), s90 = await node('423:15412')
    const n1 = sl.children.find(c => c.name === 'Note · B-S01 시작'); if (n1) await setText(n1, '브랜드 화면. Brand/Mark 96(오너 선택 option A: V 모노그램 + 열쇠 구멍) 가운데. 마크 아래 space/8, 워드마크 "VaultMe"는 Display M(32/40, 자간 -0.8), 한 줄 가치 제안은 Title 2. 잠금·업데이트 화면도 같은 마크 96과 간격.')
    out.note = await note(sl, s90, '잠금 해제 모션: 열쇠 구멍이 브랜드 색으로 번져요(keyhole brand-colour bloom, 400 ms, ease-out). 움직임 줄이기: 번짐 대신 cross-fade. haptic은 성공 때 1회. Face ID 상태 줄 아이콘은 입 없는 face-scan(웃는 얼굴 아님), icon/primary.')
    growSection(sl)
    return out
  }
}

async function run() {
  await init()
  const out = { steps: {}, errors: {} }
  const only = typeof ONLY !== 'undefined' ? ONLY : Object.keys(STEPS)
  const PAGE_OF = { comps: '398:76', face: '137:2', mark: '398:76', sweep: '485:76', frames: '486:17419', s05s06: '485:76', brand: '485:76' }
  for (const k of only) {
    try { await figma.setCurrentPageAsync(await node(PAGE_OF[k])); out.steps[k] = await STEPS[k]() } catch (e) { out.errors[k] = (String(e) + ' | ' + String(e && e.stack)).slice(0, 700); break }
  }
  if (typeof NO_REPAINT === 'undefined') { out.repaint = {}; for (const id of ['137:2', '398:76', '485:76', '486:76', '486:17419', '486:17436', '486:17443']) { try { out.repaint[id] = await repaint(await node(id)) } catch (e) { out.errors['repaint ' + id] = String(e).slice(0, 200) } } }
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
