// VaultMe Local Runner: TASK final-review (#54). Run with `const MODE = 'scan'|'repaint'|'audit'` prepended.
// scan: report Korean wrapped texts whose last line is <= 3 chars (orphan) on flow pages. repaint: refresh stale bound paints. audit: token audit on IDS.
const TASK = 'final-review-' + MODE
const STAT = { cand: 0, wrapped: 0 }
const FLOW = ['485:76', '486:76', '486:17419', '486:17436', '486:17443']
async function scan(pageId) {
  const page = await figma.getNodeByIdAsync(pageId); await figma.setCurrentPageAsync(page)
  const out = []
  const probe = figma.createText(); page.appendChild(probe); probe.x = -100000
  const texts = page.findAll(n => n.type === 'TEXT' && n.visible && /[가-힣]/.test(n.characters) && n.height > 1.6 * (n.lineHeight && n.lineHeight.value || 14))
  STAT.cand += texts.length
  for (const t of texts) {
    let p = t.parent, hid = false; while (p && p.type !== 'PAGE') { if (p.visible === false) hid = true; p = p.parent }; if (hid) continue
    try {
      for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f)
      await probe.setTextStyleIdAsync(t.textStyleId); probe.resize(t.width, 20); probe.textAutoResize = 'HEIGHT'
      const paras = t.characters.split('\n')
      for (const para of paras) {
        probe.characters = para; const total = probe.height; probe.characters = '가'; const one = probe.height
        const N = Math.round(total / one); if (N < 2) continue; STAT.wrapped++
        probe.characters = para
        let lo = 1, hi = para.length
        while (lo < hi) { const mid = (lo + hi) >> 1; probe.characters = para.slice(0, mid); const n = Math.round(probe.height / one); if (n >= N) hi = mid; else lo = mid + 1 }
        const last = para.slice(lo - 1).trim()
        if (last.replace(/[\s.,!?]/g, '').length <= 4) out.push({ id: t.id, last, para: para.slice(0, 40), w: Math.round(t.width) })
      }
    } catch (e) { out.push({ id: t.id, err: String(e).slice(0, 80) }) }
  }
  probe.remove(); return out
}
const FIX = {
  '423:15368': '켜면 이 주소가 VaultMe 알림 서버에 등록돼요.\n끄면 등록을 지워요.',
  '430:16046': '켜면 이 주소가 VaultMe 알림 서버에 등록돼요.\n끄면 등록을 지워요.',
  '423:15403': '0원 거래는 주소 오염 공격에 자주 쓰여요.\n기본으로 숨겨요.',
  '430:16069': '0원 거래는 주소 오염 공격에 자주 쓰여요.\n기본으로 숨겨요.'
}
async function fix() {
  await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('486:17443')); const r = []
  for (const [id, s] of Object.entries(FIX)) { const t = await figma.getNodeByIdAsync(id); for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = s; r.push(id + ' h' + Math.round(t.height)) }
  return r
}
async function repaint(pageId) {
  const page = await figma.getNodeByIdAsync(pageId); await figma.setCurrentPageAsync(page)
  const vars = await figma.variables.getLocalVariablesAsync(); const byId = Object.fromEntries(vars.map(v => [v.id, v]))
  const near = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.01
  let n = 0; const errs = []
  for (const x of page.findAll(k => 'fills' in k)) for (const key of ['fills', 'strokes']) {
    const ps = x[key]; if (!Array.isArray(ps) || !ps.length) continue
    let ch = false
    const np = ps.map(p => {
      const id = p.type === 'SOLID' && p.boundVariables && p.boundVariables.color && p.boundVariables.color.id; if (!id) return p
      const v = byId[id]; if (!v) return p
      const res = v.resolveForConsumer(x).value
      if (!res || typeof res !== 'object' || near(res, p.color)) return p
      ch = true; return figma.variables.setBoundVariableForPaint({ ...p, color: { r: res.r, g: res.g, b: res.b } }, 'color', v)
    })
    if (ch) { try { if (x.type === 'TEXT') for (const f of x.getRangeAllFontNames(0, x.characters.length)) await figma.loadFontAsync(f); x[key] = np; n++ } catch (e) { errs.push(x.id + ' ' + String(e).slice(0, 60)) } }
  }
  return { n, errs: errs.slice(0, 10) }
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: {}, error: null }
  try {
    if (/fix/.test(MODE)) log.out.fix = await fix()
    if (/scan/.test(MODE)) for (const id of FLOW) log.out[id] = await scan(id)
    if (/repaint/.test(MODE)) for (const id of FLOW) log.out['R' + id] = await repaint(id)
    log.stat = STAT
    if (MODE === 'audit') log.out = 'use audit-all'
    log.stat = STAT
  } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin('final-review ' + MODE)
})()
