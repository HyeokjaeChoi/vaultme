// VaultMe Local Runner: TASK a11-frames-a (#54). Single chip, Ink amounts, Home dedupe, Asset detail facts.
const TASK = 'a11-frames-a'
const PAIRS = []
const PAGES = { p1: '485:76', p2: '486:76', p3: '486:17419', p4: '486:17436', p5: '486:17443' }
const PAGE_OF = { home: '486:76', asset: '486:76' }
const STEPS = {
  async home() {
    const out = {}
    for (const k of ['home-s10', 'home-s10-pending', 'home-s10-testmode', 'home-s10-testnet-sheet', 'home-s10-testdata-sheet', 'home-s50-push-optin']) {
      const f = await node(pairN(k)); const content = f.findOne(n => n.name === 'Content' && n.type === 'FRAME')
      const eth = content.findOne(n => n.type === 'INSTANCE' && n.name === 'Asset eth'); if (eth) eth.remove()
      const sec = content.findOne(n => n.type === 'INSTANCE' && n.name === 'Section 자산'); if (sec) { setP(sec, { Title: '다른 자산' }); sec.name = 'Section 다른 자산' }
      const hero = content.findOne(n => n.type === 'INSTANCE' && n.name === 'Balance hero'); if (hero) await setNamed(hero, 'Label', 'Sepolia ETH ›')
      out[k] = [!!eth, !!sec, !!hero]
    }
    return out
  },
  async asset() {
    const out = {}
    const add = async (block, after, label, value) => {
      const c = after.clone(); block.insertChild(block.children.indexOf(after) + 1, c)
      setP(c, { Kind: 'Fact' }); await setNamed(c, 'Label', label); await setNamed(c, 'Value', value); c.name = 'Detail ' + label; return c
    }
    {
      const f = await node(pairN('asset-s11-eth')); const block = f.findOne(n => n.type === 'FRAME' && n.name === 'Block 자산 정보')
      const net = await factRow(f, '네트워크', 'Sepolia · 11155111')
      const c1 = await add(block, net, '컨트랙트', '없음 · 네이티브 ETH'); await add(block, c1, '소수 자릿수', '18')
      out.eth = block.height
    }
    {
      const f = await node(pairN('asset-s11-usdc')); const block = f.findOne(n => n.type === 'FRAME' && n.name === 'Block 자산 정보')
      await factRow(f, '네트워크', 'Sepolia · 11155111')
      const cr = block.findOne(n => n.name === 'Contract row')
      const dec = await add(block, detailRow(f, '네트워크'), '소수 자릿수', '6')
      block.insertChild(block.children.indexOf(cr) + 1, dec)
      out.usdc = block.height
    }
    return out
  },
}
for (const [k, id] of Object.entries(PAGES)) { STEPS['chips_' + k] = chipsPass; STEPS['ink_' + k] = inkPass; PAGE_OF['chips_' + k] = id; PAGE_OF['ink_' + k] = id }
for (const [k, id] of Object.entries(PAGES)) { STEPS['chipsB_' + k] = chipsPass2; PAGE_OF['chipsB_' + k] = id }
