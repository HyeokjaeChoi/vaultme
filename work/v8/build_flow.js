const FLOW = __FLOW__; // {page, flow, rows:[{label,L,D}]}
const PITCH = 470, FW = 390, PADX = 100, LABEL_H = 48, ROWGAP = 140;
const styles = await figma.getLocalTextStylesAsync();
const mono = styles.find(s => s.name === 'type/data');
await figma.loadFontAsync({ family: 'IBM Plex Mono', style: 'Medium' });
const vars = await figma.variables.getLocalVariablesAsync();
const tsec = vars.find(v => v.name === 'text/secondary');
const page = figma.createPage(); page.name = FLOW.page;
await figma.setCurrentPageAsync(page);
const maxCols = Math.max(...FLOW.rows.map(r => Math.max(r.L.length, r.D.length)));
const W = PADX * 2 + maxCols * PITCH - (PITCH - FW);
const heights = [];
for (const r of FLOW.rows) {
  let h = 0;
  for (const id of [...r.L, ...r.D]) if (id) { const n = await figma.getNodeByIdAsync(id); h = Math.max(h, n.height); }
  heights.push(h);
}
const H = 100 + FLOW.rows.reduce((a, _, i) => a + LABEL_H + heights[i] + ROWGAP, 0);
const mk = (name, x) => { const s = figma.createSection(); s.name = name; s.x = x; s.y = 0; s.resizeWithoutConstraints(W, H); return s; };
const light = mk(FLOW.flow + ' · Light', 0), dark = mk(FLOW.flow + ' · Dark', W + 240);
const moved = [], labels = [];
async function label(sec, text, y) {
  const t = figma.createText(); sec.appendChild(t);
  await t.setTextStyleIdAsync(mono.id);
  t.characters = text;
  const f = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', tsec);
  t.fills = [f]; t.name = 'Row label'; t.x = PADX; t.y = y; labels.push(t.id);
}
let y = 100;
for (let i = 0; i < FLOW.rows.length; i++) {
  const r = FLOW.rows[i];
  await label(light, r.label, y); await label(dark, r.label + ' · Dark', y);
  for (const [sec, arr] of [[light, r.L], [dark, r.D]]) {
    for (let c = 0; c < arr.length; c++) {
      if (!arr[c]) continue;
      const n = await figma.getNodeByIdAsync(arr[c]);
      sec.appendChild(n); n.x = PADX + c * PITCH; n.y = y + LABEL_H; moved.push(n.id);
    }
  }
  y += LABEL_H + heights[i] + ROWGAP;
}
return { pageId: page.id, light: light.id, dark: dark.id, W, H, moved: moved.length, labels };
