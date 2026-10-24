// VaultMe Figma token audit. Paste into use_figma (skillNames "figma-use").
// Set PAGE_ID (or PAGE by name) and optional ROOT_IDS. Returns counts; the screen is done only when every count is 0.
// Flow pages: Onboarding 485:76, Home 486:76, Send & receive 486:17419, Activity 486:17436, Security & settings 486:17443.
const PAGE_ID = '' // e.g. '486:17419'; wins over PAGE
const PAGE = 'Flow 3 · Send & receive'
const ROOT_IDS = [] // e.g. ['309:666']; empty = whole page
// OS chrome and synthetic art are exempt: they are not product UI.
const EXEMPT = /^(Status bar|Home indicator|Placeholder QR|QR code|Modules|Bracket|Tab hotspots)/
// Documented asset identity artwork keeps its original fills (DESIGN.md, Shapes > Icons):
// Icon / Asset / ETH 137:402, Icon / Asset / USDC 137:429. Nothing else is whitelisted.
const ASSET_ART = new Set(['137:402', '137:429'])

const page = PAGE_ID ? await figma.getNodeByIdAsync(PAGE_ID) : figma.root.children.find((p) => p.name === PAGE)
await figma.setCurrentPageAsync(page)
const roots = ROOT_IDS.length ? await Promise.all(ROOT_IDS.map((id) => figma.getNodeByIdAsync(id))) : [page]
const r = {
  gap: 0,
  pad: 0,
  radius: 0,
  fill: 0,
  stroke: 0,
  textNoStyle: 0,
  detached: 0,
  noticeClip: 0,
  unboundPaint: 0,
  stalePaint: 0,
  samples: [],
}
const hit = (k, n, extra) => {
  r[k]++
  if (r.samples.length < 25) r.samples.push(`${k}: ${n.name} (${n.id})${extra ? ' ' + extra : ''}`)
}
const vars = new Map()
const getVar = async (id) => {
  if (!vars.has(id)) vars.set(id, await figma.variables.getVariableByIdAsync(id))
  return vars.get(id)
}
const near = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.01
for (const root of roots)
  for (const n of (root.type === 'PAGE' ? [] : [root]).concat(root.findAll(() => true))) {
    let p = n.parent,
      inInstance = false,
      exempt = EXEMPT.test(n.name),
      hidden = n.visible === false,
      art = false
    while (p && p.type !== 'PAGE') {
      if (p.type === 'INSTANCE') {
        inInstance = true
        if (p.mainComponent && ASSET_ART.has(p.mainComponent.id)) art = true
      }
      if (EXEMPT.test(p.name)) exempt = true
      if (p.visible === false) hidden = true
      p = p.parent
    }
    if (n.type === 'INSTANCE' && n.mainComponent && ASSET_ART.has(n.mainComponent.id)) art = true
    // Notice text must never be cut off (pd-review batch 1, P0-1): the Message must fit its Text frame and the instance.
    if (n.type === 'INSTANCE' && !exempt && /Notice|Banner|Inline/.test(n.name)) {
      const m = n.findOne((x) => x.type === 'TEXT' && x.name === 'Message')
      const mb = m && m.absoluteBoundingBox,
        nb = n.absoluteBoundingBox,
        pb = m && m.parent.absoluteBoundingBox
      // Bottom edges: the Message must end inside its Text frame and inside the instance (height alone misses a Message offset downward).
      const over = (box) => mb && box && mb.y + mb.height > box.y + box.height + 1
      if (m && m.visible && (m.parent.height < m.height - 1 || n.height < m.height || over(pb) || over(nb)))
        hit('noticeClip', n)
    }
    // Paint check on EVERY visible node, inside instances too (pd-review final, P0-1/P1-2: #000000 text and icons).
    // unboundPaint: a visible solid paint that is not variable-bound and not from a style.
    // stalePaint: bound, but the stored color differs from the resolved value; the desktop export draws the stored color.
    if (!exempt && !hidden && !art && n.type !== 'SECTION' && n.type !== 'PAGE') {
      for (const key of ['fills', 'strokes']) {
        let ps = n[key]
        if (ps === figma.mixed && n.type === 'TEXT') ps = n.getStyledTextSegments(['fills']).flatMap((s) => s.fills)
        if (!Array.isArray(ps)) continue
        if (key === 'fills' && typeof n.fillStyleId === 'string' && n.fillStyleId) continue
        if (key === 'strokes' && (n.strokeStyleId || !(n.strokeWeight === figma.mixed || n.strokeWeight > 0))) continue
        for (const pt of ps) {
          if (pt.type !== 'SOLID' || pt.visible === false || pt.opacity === 0) continue
          const id = pt.boundVariables?.color?.id
          if (!id) {
            hit('unboundPaint', n, key)
            break
          }
          const v = await getVar(id)
          if (!v) {
            hit('unboundPaint', n, key + ' missing variable')
            break
          }
          const res = v.resolveForConsumer(n).value
          if (res && typeof res === 'object' && !near(res, pt.color)) {
            hit('stalePaint', n, key + ' ' + v.name)
            break
          }
        }
      }
    }
    if (inInstance || exempt || n.type === 'INSTANCE' || n.type === 'SECTION') continue
    const bv = n.boundVariables || {}
    if (n.type === 'TEXT') {
      if (!n.textStyleId || n.textStyleId === figma.mixed) hit('textNoStyle', n)
      continue
    }
    if (n.layoutMode && n.layoutMode !== 'NONE') {
      if (n.itemSpacing > 0 && !bv.itemSpacing) hit('gap', n)
      if (['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].some((k) => n[k] > 0 && !bv[k])) hit('pad', n)
    }
    if (['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].some((k) => n[k] > 0 && !bv[k]))
      hit('radius', n)
    if (
      Array.isArray(n.fills) &&
      n.fills.some((f) => f.type === 'SOLID' && f.visible !== false && !f.boundVariables?.color)
    )
      hit('fill', n)
    if (Array.isArray(n.strokes) && n.strokes.some((f) => f.type === 'SOLID' && !f.boundVariables?.color))
      hit('stroke', n)
    // A frame that looks like a component copy (has a component-like name but is not an instance).
    if (
      n.type === 'FRAME' &&
      /^(Button|Input|Status notice|Asset row|Activity row|Transaction panel|Bottom sheet|List item)/.test(n.name)
    )
      hit('detached', n)
  }
return r
