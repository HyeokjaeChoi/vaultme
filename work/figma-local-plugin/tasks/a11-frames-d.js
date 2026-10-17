// VaultMe Local Runner: TASK a11-frames-d (#54). New frames for the revised backup timing (Q14):
// S10B Home funded + backup pending, S10B first-deposit backup sheet, S30B Receive before backup. Light + Dark twins.
const TASK = 'a11-frames-d'
const PAIRS = []
const PAGE_OF = { homeb: '486:76', s30b: '486:17419' }
async function homeB(f) {
  const content = f.findOne(n => n.type === 'FRAME' && n.name === 'Content')
  const hero = content.findOne(n => n.type === 'INSTANCE' && n.name === 'Balance hero'); await setNamed(hero, 'Amount', '0.5')
  for (const nm of ['Section 다른 자산', 'Asset usdc', 'Tx 보냄', 'Tx 보내기 실패']) { const x = content.findOne(n => n.type === 'INSTANCE' && n.name === nm); if (x) x.remove() }
  const row = content.findOne(n => n.type === 'INSTANCE' && n.name === 'Tx 받음')
  const ic = row.findOne(n => n.type === 'INSTANCE' && /^Icon \/ Asset/.test(n.name)); ic.swapComponent(await node('137:402'))
  await setNamed(row, 'Subtitle', 'Sepolia ETH · 방금'); await setNamed(row, 'Value', '+0.5 ETH')
  const b = (await node('515:42569')).clone(); content.insertChild(2, b); b.layoutSizingHorizontal = 'FILL'
  return content.height
}
async function placeNew(src, name, sec, dsec) {
  const x = 100, y = newRowY(sec)
  const f = await ensureClone(src, sec, name, x, y); PAIRS.push([f.id, null, dsec]); return f
}
const STEPS = {
  async homeb() {
    const sec = await node('486:77'), dsec = await node('486:78'); const out = {}
    const a = await placeNew('404:163', 'B-S10B Home · 백업 전 첫 입금', sec, dsec); out.home = [a.id, await homeB(a)]
    const b = await ensureClone('555:67287', sec, 'B-S10B Home · 첫 입금 백업 시트', a.x + 470, a.y); PAIRS.push([b.id, null, dsec]); out.sheetFrame = b.id
    await homeB(b)
    const sheet = b.findOne(n => n.type === 'INSTANCE' && n.name === 'B/Bottom sheet')
    await setNamed(sheet, 'Title', '입금이 도착했어요'); await setNamed(sheet, 'Body', '복구 구문을 아직 백업하지 않았어요.\n기기를 잃으면 이 자산을 되찾을 수 없어요.')
    const sec2 = sheet.findAll(n => n.type === 'INSTANCE' && /^Button \/ Secondary/.test(n.name))[0]; sec2.visible = true
    await setNamed(sec2, 'Label', '나중에'); await setNamed(sheet.findAll(n => n.type === 'INSTANCE' && /^Button \/ Primary/.test(n.name))[0], 'Label', '지금 백업')
    sheet.y = 844 - sheet.height; out.sheetH = sheet.height
    // chip is part of the clone; refresh note
    growSection(sec); return out
  },
  async s30b() {
    const sec = await node('486:17420'), dsec = await node('486:17421'); const out = {}
    const f = await placeNew('423:14163', 'B-S30B 받기 · 백업 전', sec, dsec)
    const content = f.findOne(n => n.type === 'FRAME' && n.name === 'Content')
    const n = (await node('494:26653')).clone(); content.insertChild(2, n); n.visible = true; n.layoutSizingHorizontal = 'FILL'
    setP(n, { Message: '복구 구문을 아직 백업하지 않았어요. 기기를 잃으면 이 주소의 자산을 되찾을 수 없어요.', 'Show link': true, Link: '백업하기' })
    const faucet = f.findOne(x => x.name === 'Faucet' && x.type === 'FRAME'); if (faucet) faucet.visible = false
    out.id = f.id; out.notice = n.height; growSection(sec); return out
  },
}
