// VaultMe Figma token audit. Paste into use_figma (skillNames "figma-use").
// Set PAGE and optional ROOT_IDS. Returns counts; the screen is done only when every count is 0.
const PAGE = '11 Prototype'
const ROOT_IDS = [] // e.g. ['309:666']; empty = whole page
// OS chrome and synthetic art are exempt: they are not product UI.
const EXEMPT = /^(Status bar|Home indicator|Placeholder QR|Modules|Bracket|Tab hotspots)/

const page = figma.root.children.find((p) => p.name === PAGE)
await figma.setCurrentPageAsync(page)
const roots = ROOT_IDS.length ? await Promise.all(ROOT_IDS.map((id) => figma.getNodeByIdAsync(id))) : [page]
const r = { gap: 0, pad: 0, radius: 0, fill: 0, stroke: 0, textNoStyle: 0, detached: 0, samples: [] }
const hit = (k, n) => { r[k]++; if (r.samples.length < 15) r.samples.push(`${k}: ${n.name} (${n.id})`) }
for (const root of roots) for (const n of root.findAll(() => true)) {
  let p = n.parent, inInstance = false, exempt = EXEMPT.test(n.name)
  while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE') inInstance = true; if (EXEMPT.test(p.name)) exempt = true; p = p.parent }
  if (inInstance || exempt || n.type === 'INSTANCE' || n.type === 'SECTION') continue
  const bv = n.boundVariables || {}
  if (n.type === 'TEXT') { if (!n.textStyleId || n.textStyleId === figma.mixed) hit('textNoStyle', n); continue }
  if (n.layoutMode && n.layoutMode !== 'NONE') {
    if (n.itemSpacing > 0 && !bv.itemSpacing) hit('gap', n)
    if (['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].some((k) => n[k] > 0 && !bv[k])) hit('pad', n)
  }
  if (typeof n.cornerRadius === 'number' && n.cornerRadius > 0 && !bv.topLeftRadius) hit('radius', n)
  if (Array.isArray(n.fills) && n.fills.some((f) => f.type === 'SOLID' && f.visible !== false && !f.boundVariables?.color)) hit('fill', n)
  if (Array.isArray(n.strokes) && n.strokes.some((f) => f.type === 'SOLID' && !f.boundVariables?.color)) hit('stroke', n)
  // A frame that looks like a component copy (has a component-like name but is not an instance).
  if (n.type === 'FRAME' && /^(Button|Input|Status notice|Asset row|Activity row|Transaction panel|Bottom sheet|List item)/.test(n.name)) hit('detached', n)
}
return r
