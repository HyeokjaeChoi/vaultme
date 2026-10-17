// VaultMe Local Runner: TASK seamless (#54). Seamless-UX review follow-ups (work/review/seamless-*-2026-10-17.md,
// outputs/design/redesign-b.md §9.3 owner rows 2026-10-17). Runs in the desktop app (Pretendard text writes).
// Light edits first; each changed Dark twin is re-cloned from Light (syncDark keeps the Dark frame ID); last a repaint
// pass for stale bound paints (a7b8228 lesson: the desktop export draws the stored color).
const TASK = 'seamless'
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
const PAIRS = []
const pair = (l, d) => { PAIRS.push([l, d]); return l }

const PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' // public BIP39 test vector (AGENTS rule 4 exception)
const FAUCET = { name: 'QuickNode', url: 'https://faucet.quicknode.com/ethereum/sepolia' }
const COPIED = '복사했어요'
const IC = { check: '137:230', external: '520:27859' }
const SHEET_DRAG = 'Sheet 끌어서 닫기: grabber나 sheet를 아래로 끌면 손가락을 1:1로 따라와요(위로는 rubber-band). 놓을 때 이동이 sheet 높이의 30%를 넘거나 속도가 500 pt/s를 넘으면 닫아요(200 ms). 아니면 spring(300 ms, damping 0.8)으로 제자리. 끌어서 닫기 = "취소"와 같아요(위험 sheet에서도 안전한 쪽). haptic 없음. 움직임 줄이기: 끌기는 그대로, 닫기·복귀는 페이드.'
const BUSY = 'Busy(Loading): 버튼 안 spinner가 회전해요(0→360°, 800 ms, linear, 반복, transform만). 버튼 폭은 그대로. 움직임 줄이기: 회전 없음, 정지 spinner + 진행형 label("보내는 중…", "복구하는 중…", "만드는 중…", "확인하는 중…"). haptic 없음. accessibilityState busy.'

const STEPS = {
  async spinner() { // P0-2: loading glyph = 3/4 ring (was the static Solar restart arrow)
    const ic = await node('137:178'), v = one(ic, n => n.type === 'VECTOR', 'vector'), fr = v.parent
    const svg = figma.createNodeFromSvg('<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.25A9.75 9.75 0 1 1 2.25 12A0.75 0.75 0 0 1 3.75 12A8.25 8.25 0 1 0 12 3.75A0.75 0.75 0 0 1 12 2.25Z" fill="#000"/></svg>')
    const tv = svg.findOne(n => n.type === 'VECTOR')
    const fills = v.fills
    v.vectorPaths = tv.vectorPaths
    v.resize(tv.width, tv.height); v.x = tv.x; v.y = tv.y; v.fills = fills
    svg.remove()
    fr.name = 'Artwork / spinner'
    ic.description = 'status.loading | 3/4 ring spinner drawn for VaultMe (stroke 1.5 at 24, round caps), 2026-10-17 | Busy: rotate 0→360°, 800 ms, linear, repeat. Reduce Motion: no rotation, static ring + progressive label. Use with label; decorative icon hidden from accessibility.'
    return [v.id, Math.round(v.width * 10) / 10, Math.round(v.height * 10) / 10]
  },
  async variants() { // P1-1: Copied state on the copy controls; button descriptions for busy (P0-2)
    const check = await node(IC.check), out = []
    async function addCopied(setId, defName, newName) {
      const set = await node(setId); let pg = set; while (pg.type !== 'PAGE') pg = pg.parent
      if (figma.currentPage !== pg) await figma.setCurrentPageAsync(pg)
      let v = set.children.find(c => c.name === newName)
      if (!v) {
        const d = one(set, c => c.name === defName && c.parent === set, defName); v = d.clone(); set.appendChild(v); v.name = newName
        v.x = d.x; v.y = Math.max(...set.children.filter(c => c !== v).map(c => c.y + c.height)) + 24
        set.resizeWithoutConstraints(Math.max(set.width, v.x + v.width + 24), v.y + v.height + 24)
      }
      const label = one(v, n => n.type === 'TEXT' && n.name === 'Label', 'Label'); label.componentPropertyReferences = {}; await setText(label, COPIED)
      const icon = one(v, n => n.type === 'INSTANCE' && (n.name === 'Icon' || n.name === 'Optional action icon'), 'icon slot')
      const vec = icon.findOne(n => n.type === 'VECTOR'); const varId = vec && vec.fills[0] && vec.fills[0].boundVariables && vec.fills[0].boundVariables.color && vec.fills[0].boundVariables.color.id
      icon.componentPropertyReferences = {}; icon.visible = true; icon.swapComponent(check)
      if (varId) for (const x of icon.findAll(n => n.type === 'VECTOR')) fillR(x, L.byId[varId].name)
      out.push(v.id); return v
    }
    const pri = await addCopied('9:283', 'Size=Large, State=Default', 'Size=Large, State=Copied')
    const sec = await addCopied('9:284', 'Size=Large, State=Default', 'Size=Large, State=Copied')
    const sm = await addCopied('398:247', 'Type=Secondary, Size=sm, State=Default', 'Type=Secondary, Size=sm, State=Copied')
    // B/Account block: component → set with State=Default / Copied
    const ab0 = await node('515:27571'); let pg = ab0; while (pg.type !== 'PAGE') pg = pg.parent; await figma.setCurrentPageAsync(pg)
    let set = ab0.parent.type === 'COMPONENT_SET' ? ab0.parent : null
    if (!set) { const parent = ab0.parent, x = ab0.x, y = ab0.y; set = figma.combineAsVariants([ab0], parent); set.name = 'B/Account block'; ab0.name = 'State=Default'; set.x = x; set.y = y }
    let ab1 = set.children.find(c => c.name === 'State=Copied')
    if (!ab1) { ab1 = ab0.clone(); set.appendChild(ab1); ab1.name = 'State=Copied'; ab0.x = 0; ab0.y = 0; ab1.x = 0; ab1.y = ab0.height + 24; set.resizeWithoutConstraints(ab0.width, ab0.height * 2 + 24) }
    byName(ab1, 'Copy').swapComponent(sm)
    set.description = 'Settings account block. State=Copied: the 복사 pill shows 복사했어요 + check for 1.5 s after a copy (150 ms crossfade ease-out, haptic impactLight on the same frame, screen reader "복사했어요"), then returns to Default. Reduce Motion: instant swap, haptic kept.'
    const copyDesc = '\nCopied (2026-10-17): copy controls only. Label 복사했어요 + check icon for 1.5 s after a successful copy, 150 ms crossfade ease-out, then back to Default. Haptic impactLight on the same frame; screen reader announces 복사했어요. A second tap re-copies and restarts the timer. Reduce Motion: instant swap, haptic kept.'
    const busyDesc = '\nLoading (2026-10-17): Spinner = Icon / status / loading (3/4 ring) rotating 0→360°, 800 ms, linear, repeat; width stays fixed. Reduce Motion: no rotation, progressive label (보내는 중…, 복구하는 중…, 만드는 중…). No haptic. accessibilityState busy.'
    for (const id of ['9:283', '9:284', '9:285', '398:247']) {
      const s = await node(id); let d = s.description.replace(/\nCopied \(2026-10-17\)[\s\S]*?(?=\nLoading \(2026-10-17\)|$)/, '').replace(/\nLoading \(2026-10-17\)[\s\S]*$/, '')
      s.description = (d + (id === '9:285' ? '' : copyDesc) + busyDesc).trim()
    }
    for (const id of ['399:157', '301:606']) { const b = await node(id); b.description = (b.description.replace(/\nDrag to dismiss[\s\S]*$/, '') + '\nDrag to dismiss (2026-10-17): follows the finger 1:1 downward (rubber-band upward). Release past 30% of the sheet height or faster than 500 pt/s closes it (200 ms); otherwise spring back (300 ms, damping 0.8). Dismiss = 취소 (safe side). No haptic. Reduce Motion: drag kept, close/return fade.').trim() }
    out.push(set.id, ab1.id)
    L.copied = { pri: pri.id, sec: sec.id, sm: sm.id }
    return out
  },
  async faucetHome() { // §9.3 Faucet: empty Home
    const f = await node(pair('515:29238', '515:30619'))
    const content = one(f, n => n.name === 'Content' && n.type === 'FRAME', 'Content')
    content.findAll(n => n.name === 'Faucet' && n.parent === content).forEach(n => n.remove())
    const blk = await faucetBlock()
    content.appendChild(blk); blk.layoutSizingHorizontal = 'FILL'
    await note(await node('486:77'), f, FAUCET_NOTE + ' 백업 전 새 지갑(B-S10N)에는 이 행이 없어요: 받기 주소는 백업 뒤에만 보여요(Q14, 백업 시점 유지 오너 2026-10-17).')
    return blk.id
  },
  async faucetReceive() { // §9.3 Faucet: Receive S30
    const f = await node(pair('423:14163', '430:15692'))
    const content = one(f, n => n.name === 'Content' && n.type === 'FRAME', 'Content')
    content.findAll(n => n.name === 'Faucet' && n.parent === content).forEach(n => n.remove())
    const qr = byName(content, 'QR row'); bind(qr, 'paddingTop', 'space/4'); bind(qr, 'paddingBottom', 'space/4')
    const blk = await faucetBlock()
    content.appendChild(blk); blk.layoutSizingHorizontal = 'FILL'
    await note(await node('486:17420'), f, FAUCET_NOTE + ' QR 위아래 여백은 16(행 자리).')
    return [blk.id, Math.round(content.children.reduce((a, c) => a + c.height, 0))]
  },
  async copyExample() { // P1-1 example frame: Receive with the button in the Copied state
    const sl = await node('486:17420'), sd = await node('486:17421'), src = await node('423:14163')
    const f = await cloneTo(src.id, sl, 'B-S30 받기 · 복사됨', 1040, src.y)
    const btn = one(f, n => n.type === 'INSTANCE' && n.name === 'Button / Primary', 'Button / Primary')
    btn.swapComponent(await node(L.copied ? L.copied.pri : (await node('9:283')).children.find(c => c.name === 'Size=Large, State=Copied').id))
    await note(sl, f, '복사 피드백(모든 복사 버튼 공통: 받기 "주소 복사", 설정 계정 블록 "복사", USDC 컨트랙트 "복사", 복구 완료 "주소 복사"): 복사에 성공하면 label이 "복사했어요" + check icon으로 바뀌어요(State=Copied). 150 ms crossfade ease-out, 1.5 s 유지 뒤 원래 label. haptic impactLight는 label이 바뀌는 같은 frame. screen reader 안내 "복사했어요". 1.5 s 안에 다시 누르면 다시 복사하고 타이머를 처음부터. 큰 버튼은 폭 고정, sm pill은 글자만큼 늘어나요. 움직임 줄이기: crossfade 없이 바로 바뀜, haptic 유지.')
    growSection(sl)
    PAIRS.push([f.id, null, sd])
    return f.id
  },
  async s60() { // P2: no "확인됨" — root/jailbreak detection is not built (AGENTS Foundation 4)
    const out = []
    for (const id of ['423:13797', '515:45343', '430:15642', '515:45681']) {
      const r = one(await node(id), n => n.type === 'INSTANCE' && /기기 보안/.test(n.name), 'device row'); setP(r, { 'Show value': false }); out.push(r.id)
    }
    const sec = await node('486:17444'), old = sec.children.find(c => c.name === 'Note · B-S60 Settings')
    const keep = old ? old.characters.replace(/\s*기기 보안 상태 행에는[\s\S]*$/, '') + ' ' : ''
    await note(sec, await node('423:13797'), keep + '기기 보안 상태 행에는 값을 쓰지 않아요. 루팅·탈옥 감지는 아직 만들지 않았어요(AGENTS: 만들지 않은 보안 확인을 주장하지 않음). 누르면 S92 안내를 다시 봐요. 계정 블록 "복사" → State=Copied 1.5 s.')
    return out
  },
  async s65nofile() { // license text: package without a license file (real case: react-native-mmkv 4.3.2, generated licenses.json text = null)
    const sl = await node('486:17444'), sd = await node('486:17445')
    const f = await cloneTo('526:55042', sl, 'B-S65 라이선스 전문 · 원문 파일 없음', 3390, 1180)
    const tb = byName(f, 'Title block'); await setText(byName(tb, 'Title'), 'react-native-mmkv'); await setText(byName(tb, 'Body'), '버전 4.3.2 · MIT')
    const blk = byName(f, 'Block 라이선스 전문'); blk.children.forEach(c => c.remove()); blk.name = 'Block 원문 없음'
    await wrapTxt(blk, '이 패키지는 라이선스 원문 파일을 포함하지 않아요.', 'Product B/Body Small', 'text/secondary', 'No file text')
    const ref = (await node('526:54261')).findOne(n => n.type === 'INSTANCE' && n.name === 'License Solar Icons 원본 보기')
    const row = ref.clone(); blk.parent.appendChild(row); row.layoutSizingHorizontal = 'FILL'; setP(row, { Title: 'npm에서 패키지 보기' }); row.name = 'Link npm 패키지 페이지'
    await note(sl, f, '원문 파일이 없는 패키지(생성된 licenses.json에서 text가 null, 2026-10-17 기준 683개 중 68개). 라이선스 이름은 package.json의 license 값. 저작권 줄과 전문 대신 이 문장 + 패키지 페이지 링크(https://www.npmjs.com/package/{이름}, 외부 브라우저). 예시는 실제로 원문 파일이 없는 react-native-mmkv 4.3.2.')
    growSection(sl)
    PAIRS.push([f.id, null, sd])
    return [f.id, row.id]
  },
  async testnetSheet() { // §9.3: Home first-launch sheet removed; chip → testnet sheet kept
    const sl = await node('486:77'), sd = await node('486:78')
    const old = await node('515:29519')
    const f = await cloneTo(old.id, sl, 'B-S10 Home / Testnet sheet', old.x, old.y)
    const sh = byName(f, 'B/Bottom sheet')
    const texts = sh.findAll(n => n.type === 'TEXT').map(t => t.name + '=' + t.characters.slice(0, 40))
    const body = sh.findOne(n => n.type === 'TEXT' && /칩을 누르면/.test(n.characters))
    if (body) await setText(body, body.characters.replace(/\s*위의 칩을 누르면 이 안내를 다시 볼 수 있어요\.?/, '').trim())
    const btn = sh.findOne(n => n.type === 'INSTANCE' && /Button/.test(n.name) && n.findOne(t => t.type === 'TEXT' && t.characters === '확인했어요'))
    if (btn) { try { setP(btn, { Label: '확인' }) } catch (e) { const t = btn.findOne(n => n.type === 'TEXT'); if (t) await setText(t, '확인') } }
    PAIRS.push([f.id, null, sd])
    // archive the first-launch frames (Light + Dark) and their note
    let ap = figma.root.children.find(p => p.name === 'Archive · 14 Removed frames')
    if (!ap) { ap = figma.createPage(); ap.name = 'Archive · 14 Removed frames' }
    const moved = []
    for (const id of ['515:29519', '515:30883', '515:30337']) { const n = await figma.getNodeByIdAsync(id); if (n && n.parent.type !== 'PAGE') { const ox = moved.length * 470; ap.appendChild(n); n.x = ox; n.y = 0; if (n.type === 'TEXT') { n.x = 0; n.y = 900 } moved.push(n.id) } }
    await note(sl, f, '칩을 누르면 열리는 테스트넷 안내 sheet. 첫 실행 자동 표시는 없앴어요(오너 2026-10-17: S02 셋째 항목과 칩이 같은 안내). 모션: 250 ms ease-out, scrim 페이드. 움직임 줄이기: 페이드만. ' + SHEET_DRAG)
    return { f: f.id, texts, moved }
  },
  async onboarding() { // S04 / S05 / S06 states the app has (apps/mobile/src/pages/backup/check.tsx, restore/index.tsx, restore/done.tsx)
    const sl = await node('485:77'), sd = await node('485:78'), out = {}
    const y0 = Math.max(...sl.children.filter(c => !/^(B-S0[456] .* · |Note · B-S0[456]|Row label · )/.test(c.name)).map(c => c.y + c.height)) + 160
    const rows = [y0 + 48, y0 + 48 + 1180, y0 + 48 + 2360]
    await rowLabel(sl, '485:83', 'S04 단어 확인 상태 · S06 복사됨', 100, rows[0] - 48)
    await rowLabel(sl, '485:83', 'S05 복구 입력 · 입력과 진행', 100, rows[1] - 48)
    await rowLabel(sl, '485:83', 'S05 복구 입력 · 오류', 100, rows[2] - 48)
    const X = i => 100 + i * 470
    const val = (inp, v, state) => { setP(inp, { Value: v, State: state }); const t = inp.findOne(n => n.type === 'TEXT' && n.name === 'Value'); if (t) fillR(t, state === 'Invalid' ? 'input/fg' : 'input/fg'); return inp }
    const mainBtn = f => one(f, n => n.type === 'INSTANCE' && n.name === 'Button / Primary', 'Button / Primary')
    // ---- S04
    const s04 = async (name, i, vals, after) => {
      const f = await cloneTo('423:15243', sl, 'B-S04 일부 단어 확인 · ' + name, X(i), rows[0])
      const ins = ['Input 3번째 단어', 'Input 7번째 단어', 'Input 11번째 단어'].map(n => byName(f, n))
      vals.forEach(([v, st], k) => { if (v !== null) val(ins[k], v, st) })
      if (after) await after(f, ins)
      PAIRS.push([f.id, null, sd]); out[f.name] = f.id; return f
    }
    const a = await s04('입력 중', 0, [['abandon', 'Default'], ['abandon', 'Default'], ['aban', 'Focus']])
    await note(sl, a, '칸마다 단어 1개. 자동 수정·추천은 꺼요. 세 칸이 모두 차면 "확인"이 켜져요. 앱이 background로 가면 입력을 지우고 S03부터 다시 시작해요(Q15).')
    const b = await s04('틀림', 1, [['abandon', 'Default'], ['about', 'Invalid'], ['abandon', 'Default']], async (f, ins) => { setP(ins[1], { Helper: '7번째 단어가 달라요', 'Show helper': true }); mainBtn(f).setProperties({ State: 'Default' }) })
    await note(sl, b, '틀린 칸만 Invalid(빨간 테두리) + 도움말 "N번째 단어가 달라요". 맞은 칸 값은 그대로 둬요. "확인"을 누른 순간 haptic notificationError 1회, focus는 첫 번째 틀린 칸. 그 칸을 고치면 오류 표시가 사라져요. 흔들기 없음. 전체 오류 notice는 쓰지 않아요(seamless P1-5).')
    const c = await s04('모두 입력', 2, [['abandon', 'Default'], ['abandon', 'Default'], ['abandon', 'Default']], async (f) => { mainBtn(f).setProperties({ State: 'Default' }) })
    await note(sl, c, '세 칸이 모두 맞으면 백업 완료를 기록하고 S30 받기로 가요(뒤로 가면 Home). 예시 단어는 공개 test vector(abandon … about)예요.')
    // ---- S06 copied
    const s6 = await cloneTo('423:13703', sl, 'B-S06 복구 결과 · 복사됨', X(3), rows[0])
    one(s6, n => n.type === 'INSTANCE' && n.name === 'Button / Secondary', 'Button / Secondary').swapComponent(await node(L.copied ? L.copied.sec : (await node('9:284')).children.find(c => c.name === 'Size=Large, State=Copied').id))
    await note(sl, s6, '"주소 복사" → "복사했어요" + check 1.5 s(State=Copied), 150 ms crossfade, haptic impactLight. 그 뒤 "주소 복사"로 돌아가요. 복구 성공을 백업의 증거로 쓰지 않아요(Q16).')
    PAIRS.push([s6.id, null, sd]); out[s6.name] = s6.id
    // ---- S05
    const s05 = async (name, row, i, v, st, helper, btnState, banner) => {
      const f = await cloneTo('423:15293', sl, 'B-S05 복구 입력 · ' + name, X(i), rows[row])
      const inp = byName(f, 'Input 복구 구문'); val(inp, v, st)
      if (helper) setP(inp, { Helper: helper, 'Show helper': true })
      if (btnState) mainBtn(f).setProperties({ State: btnState })
      if (banner) {
        const content = one(f, n => n.name === 'Content' && n.type === 'FRAME', 'Content')
        const w = al('VERTICAL', 'Banner wrap', { pad: [null, 'layout/screen/padding', null, 'layout/screen/padding'] })
        content.insertChild(content.children.indexOf(inp) + 1, w); w.layoutSizingHorizontal = 'FILL'
        const bi = (await node('399:122')).children.find(x => x.name === 'Tier=Banner, Tone=Danger').createInstance(); w.appendChild(bi); bi.layoutSizingHorizontal = 'FILL'
        setP(bi, { Title: banner[0], 'Show title': true, Message: banner[1], 'Show link': false }); bi.name = 'Banner Danger'
      }
      PAIRS.push([f.id, null, sd]); out[f.name] = f.id; return f
    }
    const t1 = await s05('입력 중', 1, 0, 'abandon abandon abandon abandon aban', 'Focus')
    await note(sl, t1, '입력하는 중인 마지막 단어는 판단하지 않아요. 띄어쓰기 뒤에 단어 목록을 확인해요. 자동 수정·추천·자동 완성 끔. 화면을 떠나거나 앱이 background로 가면 입력을 지워요. 기록·로그 없음.')
    const t2 = await s05('모든 단어', 1, 1, PHRASE, 'Default', null, 'Default')
    await note(sl, t2, '12단어나 24단어이고 모두 BIP39 단어이면 "복구"가 켜져요. 예시는 공개 test vector예요(실제 자금 금지).')
    const t3 = await s05('복구 중', 1, 2, PHRASE, 'Default', null, 'Loading')
    await note(sl, t3, 'OS 인증 뒤 저장하는 동안. ' + BUSY)
    const e1 = await s05('모르는 단어', 2, 0, PHRASE.replace('abandon abandon abandon', 'abandon abandon abandn'), 'Invalid', "'abandn'는 복구 구문 단어가 아니에요.", 'Disabled')
    await note(sl, e1, '첫 번째 모르는 단어를 그대로 보여 줘요. 칸을 떠나거나 띄어쓰기를 치면 판단해요. 단어를 고치면 오류가 사라져요.')
    const e2 = await s05('단어 수', 2, 1, PHRASE.replace('abandon about', 'about'), 'Invalid', '11단어를 입력했어요. 12단어나 24단어여야 해요.', 'Disabled')
    await note(sl, e2, '칸을 떠나거나 "복구"를 누른 뒤에만 단어 수를 판단해요. 입력 중(13–23단어)은 오류가 아니에요. 25단어 이상은 바로 오류.')
    const e3 = await s05('순서 오류', 2, 2, Array(12).fill('abandon').join(' '), 'Invalid', '단어나 순서가 맞지 않아요. 복구 구문을 다시 확인하세요.', 'Disabled')
    await note(sl, e3, 'checksum이 맞지 않을 때. 어느 단어인지는 알 수 없어요(BIP39 checksum은 전체로만 확인). 칸을 떠난 뒤에만 보여요.')
    const e4 = await s05('이미 지갑 있음', 2, 3, PHRASE, 'Default', null, 'Default', ['이 기기에 이미 지갑이 있어요', '한 기기에는 지갑 하나만 둘 수 있어요.'])
    await note(sl, e4, '복구를 막는 상황이라 Banner(Danger)를 입력 칸 바로 아래에 둬요. 입력은 지우지 않아요. haptic notificationError 1회.')
    const e5 = await s05('저장 실패', 2, 4, PHRASE, 'Default', null, 'Default', ['지갑을 복구하지 못했어요', '기기에 화면 잠금을 설정한 뒤 다시 시도하세요.'])
    await note(sl, e5, '키 저장 실패(기기 화면 잠금 없음 등). 입력은 그대로, "복구"로 다시 시도. haptic notificationError 1회.')
    growSection(sl)
    return out
  },
  async notesMisc() { // busy + drag annotations on existing frames
    const out = []
    const send = await node('486:17420')
    const r = send.children.find(c => c.name === 'Note · B-S22 Send review (scrolled full) / rechecking')
    if (r) { await setText(r, r.characters.replace('회전 1 s, linear', '회전 800 ms, linear')); out.push(r.id) }
    const ack = send.children.find(c => c.name === 'Note · B-S22L+ACK Review look-alike confirm sheet')
    if (ack) { await setText(ack, ack.characters.replace(/\s*Sheet 끌어서 닫기:[\s\S]*$/, '') + ' ' + SHEET_DRAG); ack.resize(390, ack.height); out.push(ack.id) }
    out.push(await note(send, await node('404:315'), '"확인하고 보내기" ' + BUSY))
    return out
  },
  async notesHomeSheet() {
    const sl = await node('486:77')
    return await note(sl, await node('515:29783'), '칩 "테스트 데이터"를 누르면 열려요. ' + SHEET_DRAG)
  }
}
const FAUCET_NOTE = `테스트 ETH 받기: 누르면 받기 주소를 복사하고(State=Copied 피드백, haptic impactLight) ${FAUCET.name} Sepolia faucet(${FAUCET.url})을 외부 브라우저로 열어요. 고른 이유(2026-10-17 공식 페이지 확인): 계정·mainnet 잔액·X 게시 없이 사람 확인 1회, 12시간마다 1회. VaultMe가 운영하지 않는 외부 사이트라 받는 양·시간은 약속하지 않아요. 비교는 outputs/design/ux-copy.md "Faucet 조사".`
async function faucetBlock() {
  const blk = al('VERTICAL', 'Faucet', { gap: 'space/1', pad: ['space/2', null, null, null] })
  const ref = (await node('526:54261')).findOne(n => n.type === 'INSTANCE' && n.name === 'License Solar Icons 원본 보기')
  const row = ref.clone(); blk.appendChild(row); row.layoutSizingHorizontal = 'FILL'; setP(row, { Title: '테스트 ETH 받기', 'Show value': true, Value: FAUCET.name }); row.name = 'Link 테스트 ETH 받기'
  const cap = al('VERTICAL', 'Caption', { pad: [null, 'layout/screen/padding', null, 'layout/screen/padding'] }); blk.appendChild(cap); cap.layoutSizingHorizontal = 'FILL'
  await wrapTxt(cap, '받기 주소를 복사하고 외부 사이트(faucet)를 열어요.', 'Product B/Caption', 'text/secondary', 'Caption')
  return blk
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

async function run() {
  await init()
  const out = { steps: {}, errors: {}, dark: {}, repaint: {} }
  const only = typeof ONLY !== 'undefined' ? ONLY : Object.keys(STEPS)
  const PAGE_OF = { spinner: '137:2', variants: '398:76', faucetHome: '486:76', faucetReceive: '486:17419', copyExample: '486:17419', s60: '486:17443', s65nofile: '486:17443', testnetSheet: '486:76', onboarding: '485:76', notesMisc: '486:17419', notesHomeSheet: '486:76' }
  for (const k of only) {
    try { await figma.setCurrentPageAsync(await node(PAGE_OF[k])); out.steps[k] = await STEPS[k]() } catch (e) { out.errors[k] = (String(e) + ' | ' + String(e && e.stack)).slice(0, 500) }
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
  if (typeof NO_REPAINT === 'undefined') for (const id of ['137:2', '398:76', '4:19', '485:76', '486:76', '486:17419', '486:17443']) { try { out.repaint[id] = await repaint(await node(id)) } catch (e) { out.errors['repaint ' + id] = String(e).slice(0, 200) } }
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
