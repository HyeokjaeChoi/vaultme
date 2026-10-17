// Repaint bound paints whose stored color differs from the resolved value (whole page).
async function repaint(page) {
  await figma.setCurrentPageAsync(page)
  let n = 0; const ids = []
  const near = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.01
  for (const x of page.findAll(k => 'fills' in k)) {
    for (const key of ['fills', 'strokes']) {
      const ps = x[key]; if (!Array.isArray(ps) || !ps.length) continue
      let changed = false
      const np = ps.map(p => {
        const id = p.type === 'SOLID' && p.boundVariables?.color?.id; if (!id) return p
        const v = L.byId[id]; if (!v) return p
        const res = v.resolveForConsumer(x).value
        if (!res || typeof res !== 'object' || near(res, p.color)) return p
        changed = true; return figma.variables.setBoundVariableForPaint({ ...p, color: rgb(res) }, 'color', v)
      })
      if (changed) { try { if (x.type === 'TEXT') for (const f of x.getRangeAllFontNames(0, x.characters.length)) await figma.loadFontAsync(f); x[key] = np; n++; if (ids.length < 20) ids.push(x.id) } catch (e) { ids.push('ERR ' + x.id + ' ' + String(e).slice(0, 60)) } }
    }
  }
  return { n, ids }
}
async function run() {
  await init()
  const out = { steps: {}, errors: {}, dark: {}, repaint: {} }
  const only = typeof ONLY !== 'undefined' ? ONLY : Object.keys(STEPS)
  for (const k of only) {
    try { if (PAGE_OF[k]) await figma.setCurrentPageAsync(await node(PAGE_OF[k])); out.steps[k] = await STEPS[k]() } catch (e) { out.errors[k] = String(e && e.stack || e).slice(0, 500) }
  }
  if (typeof NO_DARK === 'undefined') {
    const seen = new Set()
    for (const [l, d, sec] of PAIRS) {
      if (seen.has(l)) continue; seen.add(l)
      try {
        const ln = await node(l); let p = ln; while (p.type !== 'PAGE') p = p.parent
        if (figma.currentPage !== p) await figma.setCurrentPageAsync(p)
        const dsec = sec || (d ? (await node(d)).parent : null)
        out.dark[l] = await syncDark(l, d, dsec)
        if (sec) growSection(sec)
      } catch (e) { out.errors['dark ' + l] = String(e).slice(0, 200) }
    }
  }
  if (typeof NO_REPAINT === 'undefined') for (const id of ['485:76', '486:76', '486:17419', '486:17436', '486:17443', '398:76']) { try { out.repaint[id] = await repaint(await node(id)) } catch (e) { out.errors['repaint ' + id] = String(e).slice(0, 200) } }
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
