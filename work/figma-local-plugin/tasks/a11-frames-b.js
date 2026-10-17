// VaultMe Local Runner: TASK a11-frames-b (#54). Review (fee + total first), Send amount column, Result hero + failed hierarchy.
const TASK = 'a11-frames-b'
const PAIRS = []
const PAGE_OF = { amountComp: '398:76', review: '486:17419', amount: '486:17419', result: '486:17419' }
const STEPS = {
  async amountComp() {
    const set = await node('422:636'); const out = []
    for (const v of set.children) {
      v.counterAxisAlignItems = 'CENTER'
      const sub = v.findOne(n => n.type === 'TEXT' && n.name === 'Sub'); for (const f of sub.getRangeAllFontNames(0, sub.characters.length)) await figma.loadFontAsync(f)
      sub.textAlignHorizontal = 'CENTER'; out.push(v.id)
    }
    return out
  },
  async review() {
    const out = {}
    for (const k of Object.keys(MAP).filter(k => /^send-s22/.test(k))) {
      const f = await node(pairN(k)); const content = f.findOne(n => n.type === 'FRAME' && n.name === 'Content'); const r = []
      if (content) {
        const ch = content.children, iS = ch.findIndex(c => c.name === 'Block 보내는 것'), iC = ch.findIndex(c => c.name === 'Block 비용')
        if (iS >= 0 && iC > iS) {
          const bandS = ch[iS - 1], bandC = ch[iC - 1], cost = ch[iC]
          content.insertChild(iS - 1, bandC); content.insertChild(iS, cost); r.push('reordered')
        }
      }
      for (const t of f.findAll(n => n.type === 'TEXT' && n.name === 'Caption' && /^보내면 취소할 수 없어요/.test(n.characters))) {
        for (const x of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(x)
        await t.setTextStyleIdAsync(S('Product B/Body Small').id); fillR(t, 'text/primary'); t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; r.push('caption')
      }
      out[k] = r
    }
    return out
  },
  async amount() {
    const out = {}
    for (const k of ['send-s20b-amount', 'send-s20b-amount-full', 'send-s20b-amount-error']) {
      const f = await node(pairN(k)); const content = f.findOne(n => n.type === 'FRAME' && n.name === 'Content')
      const top = content.findOne(n => n.name === 'Spacer top'), bot = content.findOne(n => n.name === 'Spacer bottom'), chips = content.findOne(n => n.name === 'Chips' && n.children.some(c => /^B\/Chip/.test(c.name)))
      top.layoutSizingVertical = 'FILL'; bot.visible = false; chips.primaryAxisAlignItems = 'CENTER'
      out[k] = [top.height, chips.x, content.height]
    }
    return out
  },
  async result() {
    const out = {}
    const heroC = await node('586:90268')
    { // confirmed: bigger hero
      const f = await node(pairN('send-s23-confirmed')); const h = f.findOne(n => n.type === 'INSTANCE' && n.name === 'Amount hero')
      h.swapComponent(heroC); await setNamed(h, 'Body', '이 거래는 네트워크에서 확정됐어요.'); out.confirmed = h.height
    }
    for (const k of ['send-s23-failed', 'send-s23-failed-reason']) {
      const f = await node(pairN(k)); const acts = f.findOne(n => n.name === 'Actions')
      const p = acts.findOne(n => n.type === 'INSTANCE' && /^Button \/ Primary/.test(n.name)), s = acts.findOne(n => n.type === 'INSTANCE' && /^Button \/ Secondary/.test(n.name))
      await setNamed(p, 'Label', '다시 보내기'); await setNamed(s, 'Label', '확인'); s.name = 'Button / Secondary 확인'
      const h = f.findOne(n => n.type === 'INSTANCE' && n.name === 'Amount hero'); await setNamed(h, 'Title', '보내지 못했어요')
      out[k] = 'ok'
    }
    for (const k of Object.keys(MAP).filter(k => /^send-s23/.test(k))) {
      const f = await node(pairN(k))
      for (const b of f.findAll(n => n.type === 'INSTANCE' && /^(Button \/ Ghost|B\/Button|Detail link)/.test(n.name) && n.visible !== false)) {
        const lab = b.findOne(t => t.type === 'TEXT' && t.name === 'Label'); if (lab && lab.characters === '거래 상세 보기') await setNamed(b, 'Label', null, { style: 'Product B/Link' })
      }
      for (const r of f.findAll(n => n.type === 'INSTANCE' && /^Detail/.test(n.name))) {
        const l = r.findOne(t => t.type === 'TEXT' && t.name === 'Label'), v = r.findOne(t => t.type === 'TEXT' && t.name === 'Value')
        if (l && v && l.characters === '네트워크' && v.characters === 'Sepolia') { setP(r, { Kind: 'Fact' }); await setNamed(r, 'Label', '네트워크'); await setNamed(r, 'Value', 'Sepolia · 11155111') }
      }
    }
    return out
  },
}
