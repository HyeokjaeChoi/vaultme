// VaultMe Local Runner: TASK a12-last-leaks (#54). Last foundation leaks: info tone neutral, one quiet input style, Restore uses Segmented + Link,
// empty Home faucet block, Start single pause, contiguous test-mode tx hash. Build: tasks/build.sh a11-common.js a12-last-leaks.js
// (PREPEND='const ONLY=["tokens"]; const NO_DARK=1' runs a subset).
const TASK = 'a12-last-leaks'
const PAIRS = []
const PAGE_OF = { tokens: '398:76', inputs: '398:76', restore: '485:76', empty: '486:76', start: '485:76', hash2: '486:76', hash3: '486:17419', hash4: '486:17436', hash5: '486:17443', hash1: '485:76', comps: '398:76' }
const STEPS = {}
const alias = (n, t) => { const v = V(n), tv = V(t); for (const m of Object.keys(v.valuesByMode)) v.setValueForMode(m, { type: 'VARIABLE_ALIAS', id: tv.id }); return n + ' -> ' + t }

// P1-B: the info tone is neutral. Blue stays for Primary and the selected tab only.
STEPS.tokens = async () => [alias('status/info/fg', 'text/secondary'), alias('status/info/bg', 'surface/subtle'), alias('status/info/border', 'border/subtle'), alias('icon/status/info', 'icon/secondary')]

// P1-C: one quiet input style. Default and Filled: tone fill, no border. Focus and Error keep the border (Borderless rule 10).
STEPS.inputs = async () => {
  const out = []
  const cell = await node('565:73619')
  for (const c of cell.children) if (/State=(Empty|Filled)/.test(c.name)) { c.strokes = []; fillR(c, 'surface/pressed'); out.push(c.name) }
  const inp = await node('421:805')
  for (const c of inp.children) {
    const m = /State=(Default|Disabled)/.exec(c.name); if (!m) continue
    const f = byName(c, 'Field'); f.strokes = []; fillR(f, m[1] === 'Default' ? 'surface/pressed' : 'surface/subtle'); out.push(c.name)
  }
  return out
}

// P1-C: Restore count row = standard Segmented (neutral) + Ink link "붙여넣기".
STEPS.restore = async () => {
  const out = []; const seg = await node('300:622'); const dv = seg.children[0]
  for (const k of Object.keys(MAP).filter(k => k.startsWith('onboarding-s05'))) {
    const f = await node(pairN(k)); const row = f.findOne(n => n.type === 'FRAME' && n.name === 'Count row'); if (!row) { out.push('no row ' + k); continue }
    const wc = row.findOne(n => n.name === 'Word count'); if (!wc) { out.push('done ' + k); continue }
    const sel = wc.findAll(n => n.type === 'INSTANCE' && /^Chip /.test(n.name)).find(c => c.componentProperties.State && c.componentProperties.State.value === 'Selected')
    const second = sel && /24/.test(sel.name)
    const inst = dv.createInstance(); row.insertChild(0, inst); setP(inst, { Selected: second ? 'Second' : 'First' })
    await setNamed(inst, 'First label', '12단어'); await setNamed(inst, 'Second label', '24단어')
    inst.name = 'Segmented 12/24'; inst.layoutSizingHorizontal = 'FIXED'; inst.resize(220, inst.height)
    const old = row.findOne(n => n.type === 'INSTANCE' && /붙여넣기/.test(n.name)); if (old) old.remove()
    const lk = al('HORIZONTAL', 'Paste link', { cross: 'CENTER' }); pad(lk, 'space/3', 'space/2', 'space/3', 'space/2'); lk.primaryAxisSizingMode = 'AUTO'
    const t = await txt('붙여넣기', 'Product B/Link', 'text/link', 'Paste link text'); lk.appendChild(t); row.appendChild(lk)
    wc.remove(); row.counterAxisAlignItems = 'CENTER'
    out.push(k + ' ' + (second ? 'Second' : 'First') + ' rowW=' + row.width + ' h=' + row.height + ' pa=' + row.primaryAxisAlignItems + ' segW=' + inst.width)
  }
  return out
}

// P1-D: empty Home. Faucet = full-width action block (icon, title, one-line reason, external arrow). One left-aligned direction.
STEPS.empty = async () => {
  const f = await node(pairN('home-s10-empty-faucet')); const content = byName(f, 'Content')
  const oldE = content.findOne(n => n.type === 'INSTANCE' && n.name === 'Empty state'); if (oldE) oldE.remove()
  const oldF = content.children.find(n => n.name === 'Faucet'); if (oldF) oldF.remove()
  content.children.filter(n => /^(Empty guide|Faucet block)$/.test(n.name)).forEach(n => n.remove())
  const rad = L.v['radius/lg'] ? 'radius/lg' : 'radius/md'
  const guide = al('VERTICAL', 'Empty guide', { gap: 'space/1', pad: ['layout/sectionGap/product', 'layout/screen/padding', 0, 'layout/screen/padding'] }); content.appendChild(guide); guide.layoutSizingHorizontal = 'FILL'
  await wrapTxt(guide, '아직 자산이 없어요', 'Product B/Headline', 'text/primary', 'Title', 'LEFT')
  await wrapTxt(guide, 'ETH나 USDC를 받으려면 주소를 공유하세요.', 'Product B/Body Small', 'text/secondary', 'Body', 'LEFT')
  const wrap = al('VERTICAL', 'Faucet block', { pad: ['layout/groupGap', 'layout/screen/padding', 0, 'layout/screen/padding'] }); content.appendChild(wrap); wrap.layoutSizingHorizontal = 'FILL'
  const card = al('HORIZONTAL', 'Faucet action', { gap: 'layout/rowGap', pad: ['space/4', 'space/4', 'space/4', 'space/4'], cross: 'CENTER' })
  wrap.appendChild(card); card.layoutSizingHorizontal = 'FILL'; fillR(card, 'surface/pressed')
  for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bind(card, k, rad)
  const tile = figma.createFrame(); tile.name = 'Icon tile'; tile.layoutMode = 'HORIZONTAL'; tile.primaryAxisAlignItems = 'CENTER'; tile.counterAxisAlignItems = 'CENTER'; tile.resize(44, 44); tile.clipsContent = false
  fillR(tile, 'surface/default'); for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) bind(tile, k, L.v['radius/full'] ? 'radius/full' : rad)
  card.appendChild(tile); tile.appendChild((await node('137:24')).createInstance())
  const col = al('VERTICAL', 'Text', { gap: 'space/1' }); card.appendChild(col); col.layoutSizingHorizontal = 'FILL'
  await wrapTxt(col, '테스트 ETH 받기', 'Product B/Row title', 'text/primary', 'Title', 'LEFT')
  await wrapTxt(col, '받기 주소를 복사하고 외부 사이트(faucet)를 열어요.', 'Product B/Body Small', 'text/secondary', 'Caption', 'LEFT')
  card.appendChild((await node('520:27859')).createInstance())
  await refNote(f, 'Mobbin 참고 (빈 지갑 첫 입금): Cash App "Add money" 행 https://mobbin.com/screens/78523546-a824-4a43-96ce-476669ec6c88 · MoonPay 빈 홈의 아이콘+제목+설명+chevron 카드 https://mobbin.com/screens/8414cbd0-2208-45ea-b31e-433c33404d83. 결정: faucet은 전체 탭 블록 (아이콘, 제목, 이유 한 줄, ↗). 안내와 블록 모두 좌측 정렬 한 방향.')
  return [guide.id, wrap.id, card.id, Math.round(card.height), content.children.map(c => c.name)]
}

// P2: Start has one intended pause (above the cluster). The mono fact line joins the brand block, centered.
STEPS.start = async () => {
  const f = await node(pairN('brand-s01-start')); const body = byName(f, 'Body')
  const fact = body.children.find(n => n.name === 'Fact line'); const content = byName(body, 'Content'); const brand = byName(content, 'Brand')
  if (fact) {
    const t = byName(fact, 'Fact'); brand.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; t.textAlignHorizontal = 'CENTER'; fact.remove()
  }
  bind(brand, 'itemSpacing', 'layout/groupGap'); content.primaryAxisAlignItems = 'MAX'; bind(content, 'paddingBottom', 'layout/sectionGap/product')
  return [brand.height, content.height, brand.children.map(c => c.name)]
}

// S41 test mode: contiguous hash, same as real chain (no 4-char groups).
const HASH = /0x(?:[0-9a-fA-F]{4}\s){3,}[0-9a-fA-F]{1,4}/
async function hashPass() {
  const out = []
  for (const t of figma.currentPage.findAllWithCriteria({ types: ['TEXT'] })) {
    const m = HASH.exec(t.characters); if (!m) continue
    await setText(t, t.characters.replace(HASH, s => s.replace(/\s+/g, ''))); out.push(t.id)
  }
  return out
}
for (const p of ['hash1', 'hash2', 'hash3', 'hash4', 'hash5']) STEPS[p] = hashPass
STEPS.comps = async () => ({ comps: await repaint(await node('398:76')), seg: await repaint(await node('4:19')) })
// Follow-up: one-line guide body (no orphan word). Run alone: PREPEND='const ONLY=["emptyText"]'
PAGE_OF.emptyText = '486:76'
STEPS.emptyText = async () => {
  const f = await node(pairN('home-s10-empty-faucet')); const g = byName(f, 'Empty guide')
  await setNamed(g, 'Body', 'ETH나 USDC를 받으려면 주소를 공유하세요.'); return [g.height]
}
