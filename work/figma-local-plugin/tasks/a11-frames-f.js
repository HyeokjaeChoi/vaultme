// VaultMe Local Runner: TASK a11-frames-f (#54). S63 wording without KRW: "0원 거래 표시" -> "수량 0 거래 표시".
const TASK = 'a11-frames-f'
const PAIRS = []
const PAGE_OF = { s63: '486:17443' }
const STEPS = {
  async s63() {
    const out = []
    for (const t of figma.currentPage.findAllWithCriteria({ types: ['TEXT'] })) {
      if (!/0원/.test(t.characters) || /^복사:/.test(t.characters)) continue
      let top = t; while (top.parent && top.parent.type !== 'SECTION') top = top.parent
      await setText(t, t.characters.replace(/0원 거래/g, '수량 0 거래')); out.push(top.id + ' ' + top.name)
    }
    for (const n of figma.currentPage.findAll(n => /0원/.test(n.name) && n.type !== 'TEXT')) n.name = n.name.replace('0원 거래', '수량 0 거래')
    return out
  },
}
PAGE_OF.actchip = '486:17436'
STEPS.actchip = async () => {
  const out = []
  for (const id of ['471:5163', '494:17854']) {
    const f = await node(id)
    for (const c of f.findAll(n => n.type === 'INSTANCE' && /^Chip /.test(n.name) && n.parent.name !== 'Chips')) { out.push('rm ' + c.id); c.remove() }
    const ch = f.findOne(n => n.type === 'FRAME' && n.name === 'Chips'); const inst = ch.children.find(k => k.type === 'INSTANCE')
    setP(inst, { Tone: 'Test data' }); await setNamed(inst, 'Label', 'Sepolia · 테스트 데이터'); ch.primaryAxisSizingMode = 'AUTO'; out.push(ch.width)
  }
  return out
}
