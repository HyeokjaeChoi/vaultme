// VaultMe Local Runner: TASK a11-components (#54). Foundation components for the 2026-10-17 re-review fixes:
// Product B/Link (Ink + underline), one neutral B/Status chip, B/Detail row Kind=Fact, B/Amount hero Kind=Confirmed.
const TASK = 'a11-components'
const PAIRS = []
const PAGE_OF = { link: '398:76', chip: '398:76', fact: '398:76', hero: '398:76' }
const noInst = n => { let p = n.parent; while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return false; p = p.parent } return true }
const STEPS = {
  async link() {
    let st = L.s['Product B/Link'] || figma.createTextStyle()
    const lab = S('Product B/Label')
    st.name = 'Product B/Link'; st.fontName = lab.fontName; st.fontSize = lab.fontSize; st.lineHeight = lab.lineHeight; st.letterSpacing = lab.letterSpacing
    st.textDecoration = 'UNDERLINE'; st.description = 'Link: Ink text with underline. Blue is only for Primary and the selected tab (owner 2026-10-17).'
    L.s[st.name] = st
    const ids = []
    for (const t of figma.currentPage.findAllWithCriteria({ types: ['TEXT'] })) {
      if (!/^(Link|Paste link|Scan link)$/.test(t.name) || !noInst(t)) continue
      for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f)
      await t.setTextStyleIdAsync(st.id); fillR(t, 'text/link'); ids.push(t.id)
    }
    return { style: st.id, ids }
  },
  async chip() {
    const set = await node('494:1067'); const out = []
    for (const v of set.children) {
      fillR(v, 'chip/bg'); v.strokes = []
      const lab = v.children[0]; fillR(lab, 'chip/fg')
      await setText(lab, v.name.includes('Test data') ? 'Sepolia · 테스트 데이터' : 'Sepolia'); out.push(v.id + ' ' + v.width)
    }
    return out
  },
  async fact() {
    const set = await node('399:129')
    let v = set.children.find(c => c.name === 'Kind=Fact, Emphasis=Off')
    if (!v) { v = (await node('399:123')).clone(); set.appendChild(v); v.name = 'Kind=Fact, Emphasis=Off' }
    const val = v.findOne(n => n.type === 'TEXT' && n.name === 'Value')
    for (const f of val.getRangeAllFontNames(0, val.characters.length)) await figma.loadFontAsync(f)
    await val.setTextStyleIdAsync(S('Product B/Fact').id); fillR(val, 'text/secondary')
    return { id: v.id, kids: set.children.length, props: Object.keys(set.componentPropertyDefinitions) }
  },
  async hero() {
    const set = await node('494:1142')
    let v = set.children.find(c => c.name === 'Kind=Confirmed')
    if (!v) { v = (await node('494:1121')).clone(); set.appendChild(v); v.name = 'Kind=Confirmed' }
    const lead = v.findOne(n => n.name === 'Leading'), asset = lead.findOne(n => n.name === 'Asset'), badge = lead.findOne(n => n.name === 'Status badge')
    lead.resize(96, 96); asset.resize(96, 96)
    const rb = (await node('495:358')).children.find(c => c.name === 'Kind=Confirmed'); badge.swapComponent(rb)
    badge.resize(32, 32); badge.x = 64; badge.y = 64
    const title = v.findOne(n => n.type === 'TEXT' && n.name === 'Title')
    for (const f of title.getRangeAllFontNames(0, title.characters.length)) await figma.loadFontAsync(f)
    await title.setTextStyleIdAsync(S('Product B/Title 1').id); await setText(title, '보냈어요')
    // bigger top space: bind to a space variable of 40 if present
    const sp = Object.values(L.v).find(x => /^space\//.test(x.name) && x.resolvedType === 'FLOAT' && Object.values(x.valuesByMode)[0] === 40)
    if (sp) bind(v, 'paddingTop', sp.name)
    v.itemSpacing = v.itemSpacing
    return { id: v.id, h: v.height, sp: sp && sp.name, lead: [lead.width, badge.width] }
  },
}
