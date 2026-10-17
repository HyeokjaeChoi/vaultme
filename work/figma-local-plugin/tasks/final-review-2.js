// VaultMe Local Runner: TASK final-review-2 (#54). S20b "보낼 수 있는 금액" = balance - max fee (1.284658 ETH); export S20b PNGs + two compare PNGs (S05 empty, S04 check).
const TASK = 'final-review-2'
const TEXTS = ['I429:2176;399:116']
const EXPORTS = [['send-s20b-amount', 'send-s20b-amount-dark', '423:929', '430:14826'], ['send-s20b-amount-full', 'send-s20b-amount-full-dark', '423:1000', '430:14855'], ['send-s20b-amount-error', 'send-s20b-amount-error-dark', '423:1071', '430:14884'],
  ['compare--restore-figma', null, '423:15293', null], ['compare--backup-check-figma', null, '423:15243', null]]
async function post(id, file) {
  const n = await figma.getNodeByIdAsync(id); let p = n; while (p.type !== 'PAGE') p = p.parent
  if (figma.currentPage !== p) await figma.setCurrentPageAsync(p)
  const bytes = await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } })
  const r = await fetch('http://localhost:8765/?name=' + encodeURIComponent(file + '.png'), { method: 'POST', body: bytes }); if (!r.ok) throw new Error('http ' + r.status)
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: [], error: null }
  try {
    await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('486:17419'))
    for (const id of TEXTS) { const t = await figma.getNodeByIdAsync(id); if (!t) { log.out.push('missing ' + id); continue }
      for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f)
      t.characters = t.characters.replace('1.284732', '1.284658'); log.out.push(id + ' ' + t.characters.replace('\n', '|')) }
    for (const [a, b, l, d] of EXPORTS) { await post(l, a); log.out.push(a); if (d) { await post(d, b); log.out.push(b) } }
  } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log)); figma.closePlugin('final-review-2')
})()
