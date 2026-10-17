// VaultMe Local Runner: TASK a11-frames-c (#54). Fixes after screenshot check, Tx detail facts, Receive, S31 gate, Start, Settings, License.
const TASK = 'a11-frames-c'
const PAIRS = []
const PAGE_OF = { fix1: '398:76', fix2: '486:17419', tx: '486:17436', receive: '486:17419', s31: '486:17419', start: '485:76', settings: '486:17443' }
const dateFact = s => { const m = /(\d+)월 (\d+)일(?: \(.\))? (\d+:\d+)/.exec(s); return m ? `2026-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')} ${m[3]} KST` : null }
const STEPS = {
  async fix1() {
    const hero = await node('586:90268'); const sp = Object.values(L.v).find(x => /^space\//.test(x.name) && x.resolvedType === 'FLOAT' && Object.values(x.valuesByMode)[0] === 24)
    bind(hero, 'paddingTop', sp.name); hero.itemSpacing = hero.itemSpacing
    const out = { hero: hero.height }
    for (const v of (await node('422:636')).children) { const row = v.findOne(n => n.name === 'Amount row'); row.primaryAxisAlignItems = 'CENTER'; row.layoutSizingHorizontal = 'FILL'; out[v.id] = row.width }
    return out
  },
  async fix2() {
    const f = await node(pairN('send-s20b-amount')); const chips = f.findOne(n => n.name === 'Chips' && n.children.some(c => /^B\/Chip/.test(c.name)))
    const c = chips.children[2]; setP(c, { State: 'Default' }); return c.name
  },
  async tx() {
    const out = {}
    for (const k of Object.keys(MAP).filter(k => /^activity-s41/.test(k))) {
      const f = await node(pairN(k)); const r = []
      const block = f.findOne(n => n.type === 'FRAME' && n.name === 'Block 거래 정보'); if (!block) { out[k] = 'no block'; continue }
      const when = detailRow(f, '시각'); if (when) { const v = when.findOne(t => t.type === 'TEXT' && t.name === 'Value'); const d = dateFact(v.characters); if (d) { await factRow(f, '시각', d); r.push('time') } }
      const net = detailRow(f, '네트워크'); if (net && net.findOne(t => t.type === 'TEXT' && t.name === 'Value').characters === 'Sepolia') { await factRow(f, '네트워크', 'Sepolia · 11155111'); r.push('net') }
      const hash = f.findAll(n => n.type === 'INSTANCE' && /^Detail 거래 해시/.test(n.name))[0]
      if (hash && hash.parent.name === 'Block 거래 해시') {
        const hb = hash.parent, hi = hb.parent.children.indexOf(hb), band = hb.parent.children[hi - 1]
        block.insertChild(3, hash); await setNamed(hash, 'Value', null, { style: 'Product B/Fact', fill: 'text/secondary' })
        hb.remove(); if (band && /Section band/.test(band.name)) band.remove(); r.push('hash')
      }
      if (/(Confirmed|confirmed|realchain)/.test(k) && !/testmode|unknown|api|clear/.test(k) && net) {
        const nn = detailRow(f, '네트워크'); const c = nn.clone(); block.insertChild(block.children.indexOf(nn) + 1, c)
        await setNamed(c, 'Label', '블록'); await setNamed(c, 'Value', '5,812,044'); c.name = 'Detail 블록'; r.push('block')
      }
      out[k] = r
    }
    return out
  },
  async receive() {
    const out = {}
    for (const k of ['send-s30-receive-faucet', 'copy-feedback']) {
      const f = await node(pairN(k)); const cap = f.findOne(n => n.type === 'TEXT' && n.name === 'Caption' && /Sepolia 네트워크로만/.test(n.characters))
      if (!cap) { out[k] = 'no caption'; continue }
      for (const x of cap.getRangeAllFontNames(0, cap.characters.length)) await figma.loadFontAsync(x)
      await cap.setTextStyleIdAsync(S('Product B/Body Small').id); fillR(cap, 'text/primary'); cap.textAutoResize = 'HEIGHT'
      const wrap = cap.parent
      if (!wrap.findOne(n => n.name === 'Network fact')) {
        const t = await txt('Sepolia · chain id 11155111', 'Product B/Fact upper', 'text/tertiary', 'Network fact'); wrap.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; bind(wrap, 'itemSpacing', 'space/1')
      }
      out[k] = wrap.height
    }
    return out
  },
  async s31() {
    const f = await node(pairN('send-s31-backup-required')); f.name = 'B-S31 보내기 전 백업 필요 (보내기 게이트)'
    await setNamed(f, 'Title', '보내기')
    const e = f.findOne(n => n.type === 'INSTANCE' && n.name === 'B/Empty state 백업')
    setP(e, { Title: '먼저 복구 구문을 백업하세요', Body: '기기를 잃어도 지갑을 되찾으려면\n복구 구문이 필요해요.\n백업을 마치면 보낼 수 있어요.' })
    return f.name
  },
  async start() {
    const f = await node(pairN('brand-s01-start')); const body = f.findOne(n => n.name === 'Body'), content = body.findOne(n => n.name === 'Content' && n.type === 'FRAME')
    await setNamed(f, 'Body', '계정 없이, 열쇠는 이 기기에만 둬요.\n보내기 전에 받는 주소와 수수료를\n전부 보여 줘요.')
    content.layoutSizingVertical = 'FILL'
    if (!body.findOne(n => n.name === 'Fact line')) {
      const row = al('HORIZONTAL', 'Fact line', { pad: [null, 'layout/screen/padding', null, 'layout/screen/padding'], cross: 'CENTER' })
      const t = await txt('v1.0.0 · sepolia · chain id 11155111', 'Product B/Fact upper', 'text/tertiary', 'Fact'); row.appendChild(t)
      body.insertChild(0, row); row.layoutSizingHorizontal = 'FILL'; row.paddingTop = 0; row.paddingBottom = 0; bind(row, 'paddingTop', 'space/4'); bind(row, 'paddingBottom', 'space/2')
    }
    return content.height
  },
  async settings() {
    const out = {}
    for (const k of ['settings-s60', 'settings-s60-full']) {
      const f = await node(pairN(k))
      const z = f.findOne(n => n.type === 'INSTANCE' && /0원 거래 표시/.test(n.name)); if (z) { await setNamed(z, 'Title', '수량 0 거래 표시'); z.name = 'Settings 수량 0 거래 표시' }
      for (const [lab, val] of [['네트워크', 'Sepolia · 11155111'], ['버전', 'v1.0.0']]) {
        const row = f.findAll(n => n.type === 'INSTANCE' && /^Settings /.test(n.name)).find(r => { const t = r.findOne(x => x.type === 'TEXT' && x.visible !== false); return t && t.characters === lab })
        if (row) await setNamed(row, 'Value', val, { style: 'Product B/Fact', fill: 'text/secondary' })
      }
      out[k] = !!z
    }
    for (const k of ['settings-s64-licenses', 'settings-s64-licenses-full']) {
      const f = await node(pairN(k)); let n = 0
      for (const row of f.findAll(n => n.type === 'INSTANCE' && /^License /.test(n.name))) { const v = row.findOne(x => x.type === 'TEXT' && x.name === 'Value'); if (v && /^(MIT|OFL|CC)/.test(v.characters)) { await setNamed(row, 'Value', null, { style: 'Product B/Fact', fill: 'text/secondary' }); n++ } }
      out[k] = n
    }
    for (const k of ['settings-s65-license-text', 'settings-s65-license-nofile']) {
      const f = await node(pairN(k)); const t = f.findAll(n => n.type === 'TEXT' && n.name === 'Body' && /^버전 /.test(n.characters))[0]
      if (t) { await setNamed(f, 'Body', t.characters.replace(/^버전 /, 'v'), { style: 'Product B/Fact', fill: 'text/tertiary' }); out[k] = 'ok' } else out[k] = 'no body'
    }
    return out
  },
}
