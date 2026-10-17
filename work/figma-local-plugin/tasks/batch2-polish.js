// VaultMe Local Runner: runs one task in the desktop app (local fonts load here), logs to sharedPluginData 'vaultme'/'log'.
// TASK batch2-polish (#54): lock S90 stable brand position, S92 rebuild, S60 license row, new S64 license screen,
// recent-address row padding (S20a), clear-sheet line break (S41). Every step is idempotent so the task can re-run.
const TASK = 'batch2-polish'
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

// ---- S90 lock: Face ID status moves into a reserved Actions area (same height as the failed state's button area),
// so Brand/Mark and title sit at the same y in every lock state.
async function lockFix(frameId, failedId) {
  const f = await node(frameId), failed = await node(failedId)
  const body = kid(f, 'Body'), content = kid(body, 'Content'), brand = kid(content, 'Brand'), face = kid(brand, 'Face ID')
  if (!face) return 'skip (already fixed)'
  const act = kid(kid(failed, 'Body'), 'Actions').clone(); body.appendChild(act); act.layoutSizingHorizontal = 'FILL'; act.layoutSizingVertical = 'HUG'
  for (const c of [...act.children]) c.remove()
  const row = figma.createFrame(); row.name = 'Face ID status'; row.fills = []; row.layoutMode = 'HORIZONTAL'; act.appendChild(row)
  row.layoutSizingHorizontal = 'FILL'; row.primaryAxisAlignItems = 'CENTER'; row.counterAxisAlignItems = 'CENTER'; bind(row, 'itemSpacing', 'space/2')
  row.layoutSizingVertical = 'FIXED'; bind(row, 'height', 'buttonB/height/lg')
  const icon = face.children.find(c => c.type === 'INSTANCE'), status = face.children.find(c => c.type === 'TEXT')
  row.appendChild(icon); try { icon.rescale(32 / 48) } catch (e) {}
  row.appendChild(status); status.textAutoResize = 'WIDTH_AND_HEIGHT'
  face.remove(); content.layoutSizingVertical = 'FILL'
  return { act: act.id, row: row.id }
}

// ---- S92 rooting/jailbreak warning: same brand-screen pattern as S91, danger hero in the 72 px mark slot.
async function rootFix(targetId, s91Id) {
  const t = await node(targetId), s91 = await node(s91Id)
  const tb = kid(t, 'Body'), sb = kid(s91, 'Body')
  for (const c of [...tb.children]) c.remove()
  for (const c of sb.children) { const cl = c.clone(); tb.appendChild(cl); cl.layoutSizingHorizontal = 'FILL'; if (c.name === 'Content') cl.layoutSizingVertical = 'FILL' }
  const brand = tb.findOne(n => n.name === 'Brand'), mark = brand.children[0]
  const slot = figma.createFrame(); slot.name = 'Hero'; slot.fills = []; slot.layoutMode = 'HORIZONTAL'
  slot.primaryAxisSizingMode = 'FIXED'; slot.counterAxisSizingMode = 'FIXED'; slot.resize(72, 72)
  slot.primaryAxisAlignItems = 'CENTER'; slot.counterAxisAlignItems = 'CENTER'
  brand.insertChild(0, slot); slot.appendChild((await node(ICON_SW)).createInstance()); mark.remove()
  const text = brand.findOne(n => n.name === 'Text')
  await setText(kid(text, 'Title'), '안전하지 않은 기기 같아요')
  await setText(kid(text, 'Body'), '루팅되었거나 탈옥된 기기로 보여요.\n다른 앱이 지갑 키를 읽을 수 있어요.\n이 지갑에는 테스트넷 자산만 두세요.')
  const btn = tb.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Button')); props(btn, { Label: '이해했어요' })
  return { frame: t.id, slot: slot.id }
}

// ---- S60: "오픈소스 라이선스" row in the 정보 group, before 버전.
async function settingsRow(frameId, isFull) {
  const f = await node(frameId)
  const block = f.findOne(n => n.type === 'FRAME' && n.name === 'Block 정보')
  if (block.children.some(c => c.name === 'Settings 오픈소스 라이선스')) return 'skip'
  const tpl = kid(block, 'Settings 네트워크'), ver = kid(block, 'Settings 버전')
  const r = tpl.clone(); r.name = 'Settings 오픈소스 라이선스'; block.insertChild(block.children.indexOf(ver), r)
  props(r, { Title: '오픈소스 라이선스', 'Show value': false, 'Show chevron': true, 'Show icon': true, Icon: ICON_DOC })
  if (isFull) f.resize(f.width, f.height + r.height + block.itemSpacing)
  return r.id
}

// ---- S64 open-source licenses (new). Built from S63 (nav + title block) and S60 groups (band + block + B/Settings row).
const GROUPS = [
  ['아이콘·글꼴', [['Solar Icons by 480 Design', 'CC BY 4.0'], ['Solar Icons 원본 보기', null], ['Pretendard', 'OFL-1.1'], ['IBM Plex Mono', 'OFL-1.1']]],
  ['앱 라이브러리', [['React Native', 'MIT'], ['Expo', 'MIT'], ['React', 'MIT'], ['viem', 'MIT'], ['@noble/curves', 'MIT'], ['@noble/hashes', 'MIT'], ['@solar-icons/react-native', 'MIT'], ['react-native-reanimated', 'MIT'], ['react-native-keychain', 'MIT'], ['react-native-mmkv', 'MIT'], ['i18next', 'MIT']]],
]
async function buildLicenses() {
  const page = figma.currentPage
  const old = page.findAll(n => n.type === 'FRAME' && n.name.startsWith('B-S64 오픈소스 라이선스')); for (const o of old) o.remove()
  const s63 = await node('423:15384'), secL = s63.parent, secD = await node('486:17445')
  const band = await node('515:45339'), info = await node('515:45310')
  const f = s63.clone(); secL.appendChild(f); f.name = 'B-S64 오픈소스 라이선스'
  const content = kid(kid(f, 'Body'), 'Content')
  for (const c of [...content.children]) if (c.name !== 'Title block') c.remove()
  content.setBoundVariable('itemSpacing', null); content.itemSpacing = 0
  const tb = kid(content, 'Title block'); bind(tb, 'paddingBottom', 'layout/sectionGap/product')
  await setText(kid(tb, 'Title'), '오픈소스 라이선스')
  await setText(kid(tb, 'Body'), 'VaultMe가 쓰는 오픈소스와 라이선스예요.')
  for (const [title, rows] of GROUPS) {
    const b = band.clone(); content.appendChild(b); b.layoutSizingHorizontal = 'FILL'
    const blk = info.clone(); content.appendChild(blk); blk.layoutSizingHorizontal = 'FILL'; blk.name = 'Block ' + title
    props(kid(blk, 'Header 정보'), { Title: title }); kid(blk, 'Header 정보').name = 'Header ' + title
    const tpl = kid(blk, 'Settings 버전')
    for (const c of [...blk.children]) if (c.name.startsWith('Settings') && c !== tpl) c.remove()
    for (const [name, lic] of rows) {
      const r = tpl.clone(); blk.appendChild(r); r.name = 'License ' + name
      if (lic) props(r, { Title: name, Value: lic, 'Show value': true, 'Show chevron': false, 'Show icon': false })
      else {
        props(r, { Title: name, 'Show value': false, 'Show chevron': true, 'Show icon': false })
        const ch = r.findOne(n => n.type === 'INSTANCE' && n.name === 'Chevron'); if (ch) ch.swapComponent(await node(ICON_EXT))
      }
    }
    tpl.remove()
  }
  const right = Math.max(...secL.children.filter(c => c.type === 'FRAME').map(c => c.x + c.width))
  f.x = right + 80; f.y = s63.y; f.clipsContent = true
  const full = f.clone(); secL.appendChild(full); full.name = 'B-S64 오픈소스 라이선스 · full'; full.x = f.x + 470; full.y = f.y
  kid(full, 'Body').layoutSizingVertical = 'HUG'; kid(kid(full, 'Body'), 'Content').layoutSizingVertical = 'HUG'; full.primaryAxisSizingMode = 'AUTO'
  const grow = full.x + 390 + 100 - secL.width
  if (grow > 0) { secL.resizeWithoutConstraints(secL.width + grow, secL.height); secD.x += grow; secD.resizeWithoutConstraints(secD.width + grow, secD.height) }
  const darks = []
  for (const l of [f, full]) {
    const d = l.clone(); secD.appendChild(d); d.name = l.name + ' · Dark'; d.x = l.x; d.y = l.y
    d.setExplicitVariableModeForCollection(L.sem, DARK); d.fills = [paint('screenB/bg')]; darks.push(d.id)
  }
  return { light: [f.id, full.id], dark: darks, fullH: full.height }
}

// ---- S20a recent addresses: rows keep 16 px screen padding (meta line and chevron touched the screen edges).
async function recentsFix(frameId) {
  const f = await node(frameId), out = []
  for (const row of f.findAll(n => n.type === 'FRAME' && n.name === 'Recent row')) {
    const text = kid(row, 'Text'); const meta = text.children.find(c => c.type === 'TEXT' && c.name === 'Meta')
    if (!meta) { out.push('skip'); continue }
    bind(row, 'paddingRight', 'layout/screen/padding')
    const w = figma.createFrame(); w.name = 'Meta wrap'; w.fills = []; w.layoutMode = 'HORIZONTAL'; text.appendChild(w)
    w.layoutSizingHorizontal = 'FILL'; w.layoutSizingVertical = 'HUG'; bind(w, 'paddingLeft', 'layout/screen/padding')
    w.appendChild(meta); meta.layoutSizingHorizontal = 'FILL'; out.push(row.id)
  }
  return out
}

async function run() {
  await init()
  const out = {}
  const step = async (name, pageId, fn) => { try { await figma.setCurrentPageAsync(await node(pageId)); out[name] = await fn() } catch (e) { out[name] = 'ERROR ' + String(e && e.stack || e).slice(0, 300) } }
  await step('s90', '486:17443', async () => ({ light: await lockFix('423:15412', '515:33081'), dark: await lockFix('430:16073', '515:33242') }))
  await step('s92', '486:17443', async () => ({ light: await rootFix('423:15474', '423:15443'), dark: await rootFix('430:16113', '430:16093') }))
  await step('s60', '486:17443', async () => ({ a: await settingsRow('423:13797'), b: await settingsRow('430:15642'), c: await settingsRow('515:45343', true), d: await settingsRow('515:45681', true) }))
  await step('s64', '486:17443', buildLicenses)
  await step('recents', '486:17419', async () => ({ light: await recentsFix('423:848'), dark: await recentsFix('430:14779') }))
  await step('clearSheet', '486:17436', async () => {
    const l = await node('457:17644'), d = twin(l), body = '이 기기에서 만든 예시 거래예요.\n지우면 다시 보내기를 시험할 수 있어요.'
    props(l, { Body: body }); if (d) props(d, { Body: body }); return [l.id, d && d.id]
  })
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
