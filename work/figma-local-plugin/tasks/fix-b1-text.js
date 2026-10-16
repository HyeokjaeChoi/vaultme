// VaultMe Local Runner: runs one task in the desktop app (local fonts load here), logs to sharedPluginData 'vaultme'/'log'.
// TASK fix-b1-text: Phase B of the batch 1 product-review fixes (#54). Text, text-style and new text-property writes
// that the remote MCP could not do (no Pretendard). Source list: work/v9/fix-b1-text-queue.json (same entries, with "before").
// Drop-in replacement for code.js. Run once in the desktop app; then read the log with use_figma
// (figma.root.getSharedPluginData('vaultme','log')).
const TASK = 'fix-b1-text'
const L = {}
async function init() {
  const vars = await figma.variables.getLocalVariablesAsync()
  L.v = Object.fromEntries(vars.map(v => [v.name, v]))
  const ts = await figma.getLocalTextStylesAsync()
  L.s = Object.fromEntries(ts.map(s => [s.name, s]))
  const seen = new Set()
  for (const s of ts) { const k = s.fontName.family + '|' + s.fontName.style; if (!seen.has(k)) { seen.add(k); try { await figma.loadFontAsync(s.fontName) } catch (e) {} } }
  for (const st of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync({ family: 'Pretendard', style: st })
  for (const st of ['Regular', 'Medium', 'SemiBold']) await figma.loadFontAsync({ family: 'IBM Plex Mono', style: st })
  for (const st of ['Regular', 'Medium', 'Semi Bold', 'Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }) } catch (e) {} }
  const cols = await figma.variables.getLocalVariableCollectionsAsync()
  L.sem = cols.find(c => c.name === '02 Semantic')
}
const V = n => { const v = L.v[n]; if (!v) throw new Error('missing var ' + n); return v }
const S = n => { const s = L.s[n]; if (!s) throw new Error('missing style ' + n); return s }
const node = async id => { const n = await figma.getNodeByIdAsync(id); if (!n) throw new Error('missing node ' + id); return n }
function paint(name) { return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(name)) }
async function loadNodeFonts(t) { for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f) }
function propKey(inst, short) { return Object.keys(inst.componentProperties).find(d => d.split('#')[0] === short) }

// P1-2: B/Notice inline Banner variants get a Title layer (Product B/Headline) + Message body (Body Small, text/secondary).
// New set properties: Title (TEXT), Show title (BOOLEAN, default false so Banners on other pages stay unchanged until split).
async function bannerTitle() {
  const set = await node('399:122')
  const defs = set.componentPropertyDefinitions
  let tKey = Object.keys(defs).find(k => k.split('#')[0] === 'Title')
  let sKey = Object.keys(defs).find(k => k.split('#')[0] === 'Show title')
  if (!tKey) tKey = set.addComponentProperty('Title', 'TEXT', 'Title')
  if (!sKey) sKey = set.addComponentProperty('Show title', 'BOOLEAN', false)
  const done = []
  for (const v of set.children.filter(c => c.name.startsWith('Tier=Banner'))) {
    const box = v.findOne(n => n.type === 'FRAME' && n.name === 'Text'); const msg = box.findOne(n => n.type === 'TEXT' && n.name === 'Message')
    let t = box.findOne(n => n.type === 'TEXT' && n.name === 'Title')
    if (!t) { t = msg.clone(); t.name = 'Title'; box.insertChild(0, t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT' }
    await t.setTextStyleIdAsync(S('Product B/Headline').id)
    t.fills = msg.fills
    t.componentPropertyReferences = { characters: tKey, visible: sKey }
    await msg.setTextStyleIdAsync(S('Product B/Body Small').id)
    msg.fills = [paint('text/secondary')]
    box.setBoundVariable('itemSpacing', V('space/1'))
    done.push(v.id)
  }
  return done
}

// [nodeId, kind, propName, after]
const Q = [["494:19377", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:19465", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:19556", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:19655", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:19751", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:19847", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:19943", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20039", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20135", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20516", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20612", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20708", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20804", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20899", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20994", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20230", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20325", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:20420", "characters", null, "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."], ["494:19343", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:19431", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:19522", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:19613", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:19709", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:19805", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:19901", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:19997", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20093", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20482", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20578", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20674", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20770", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20865", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20960", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20189", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20284", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:20379", "property", "Body", "계정 1에서 아래 주소로 보내요\n총 0.050042 ETH 차감 예상"], ["494:19635", "property", "Title", "비슷한 주소예요"], ["494:19635", "property", "Show title", true], ["494:19635", "property", "Message", "전에 보낸 주소와 앞뒤는 같고 가운데가 달라요.\n주소 오염 공격일 수 있어요."], ["494:19731", "property", "Title", "비슷한 주소예요"], ["494:19731", "property", "Show title", true], ["494:19731", "property", "Message", "전에 보낸 주소와 앞뒤는 같고 가운데가 달라요.\n주소 오염 공격일 수 있어요."], ["494:19827", "property", "Title", "소각 주소예요"], ["494:19827", "property", "Show title", true], ["494:19827", "property", "Message", "이 주소로 보낸 자산은 누구도 되찾을 수 없어요."], ["494:19923", "property", "Title", "소각 주소예요"], ["494:19923", "property", "Show title", true], ["494:19923", "property", "Message", "이 주소로 보낸 자산은 누구도 되찾을 수 없어요."], ["494:20019", "property", "Title", "토큰 컨트랙트 주소예요"], ["494:20019", "property", "Show title", true], ["494:20019", "property", "Message", "지갑 주소가 아니에요. 보낸 자산을 되찾기 어려워요."], ["494:20115", "property", "Title", "토큰 컨트랙트 주소예요"], ["494:20115", "property", "Show title", true], ["494:20115", "property", "Message", "지갑 주소가 아니에요. 보낸 자산을 되찾기 어려워요."], ["494:20474", "property", "Title", "인증하지 못했어요"], ["494:20474", "property", "Show title", true], ["494:20474", "property", "Message", "다시 시도하세요."], ["494:20570", "property", "Title", "네트워크 정보를 가져오지 못했어요"], ["494:20570", "property", "Show title", true], ["494:20570", "property", "Message", "잠시 뒤에 다시 시도하세요."], ["494:20666", "property", "Title", "내용이 바뀌었어요"], ["494:20666", "property", "Show title", true], ["494:20666", "property", "Message", "수수료나 거래 순서가 바뀌어서 보내지 않았어요.\n새 내용을 확인한 뒤 다시 보내세요."], ["494:20762", "property", "Title", "보낼 수 없어요"], ["494:20762", "property", "Show title", true], ["494:20762", "property", "Message", "받는 주소와 금액을 확인하세요."], ["494:20857", "property", "Title", "진행 중인 보내기가 있어요"], ["494:20857", "property", "Show title", true], ["494:20857", "property", "Message", "이전 거래가 아직 처리되지 않았어요.\n끝난 뒤에 다시 보내세요.\n지금 보내면 같은 금액이 두 번 나갈 수 있어요."], ["494:20952", "property", "Title", "수수료가 너무 높아요"], ["494:20952", "property", "Show title", true], ["494:20952", "property", "Message", "정해 둔 최대 수수료를 넘어서 보내지 않았어요.\n나중에 다시 시도하세요."], ["423:16251", "property", "Title", "내역을 불러오지 못했어요"], ["423:16251", "property", "Show title", true], ["423:16251", "property", "Message", "아래는 10월 13일 09:12에 받은 내역이에요."], ["494:25952", "property", "Title", "서버에 연결하지 못했어요"], ["494:25952", "property", "Show title", true], ["494:25952", "property", "Message", "인터넷 연결을 확인하고 다시 시도하세요."], ["494:21048", "property", "Message", "이미 네트워크에 보냈어요. 같은 거래를 다시 보내지 마세요."], ["494:21131", "property", "Message", "이미 네트워크에 보냈어요. 같은 거래를 다시 보내지 마세요."], ["494:21500", "property", "Message", "테스트 거래예요. 네트워크로 보내지 않았어요."], ["494:21155", "property", "Label", "네트워크 수수료"], ["494:21231", "property", "Label", "네트워크 수수료"], ["494:21309", "property", "Label", "네트워크 수수료"], ["494:25555", "property", "Label", "네트워크 수수료"], ["494:25719", "property", "Label", "네트워크 수수료"], ["494:21108", "property", "Label", "확인"], ["494:21191", "property", "Label", "확인"], ["494:21269", "property", "Label", "확인"], ["494:21336", "property", "Label", "확인"], ["494:21470", "property", "Label", "확인"], ["494:21560", "property", "Label", "확인"], ["494:21114", "property", "Label", "거래 상세 보기"], ["494:21197", "property", "Label", "거래 상세 보기"], ["494:21275", "property", "Label", "거래 상세 보기"], ["494:21342", "property", "Label", "거래 상세 보기"], ["494:21409", "property", "Label", "거래 상세 보기"], ["494:21476", "property", "Label", "거래 상세 보기"], ["494:21566", "property", "Label", "거래 상세 보기"], ["520:24629", "property", "Label", "다시 보내기"], ["494:20841", "property", "Label", "금액 수정"], ["I423:15047;301:609", "characters", null, "전에 보낸 주소와 앞뒤는 같고 가운데가 달라요.\n주소 오염 공격일 수 있어요."], ["I423:15047;305:82;477:5146;85:4269", "characters", null, "아래 빨간 글자가 다른 부분이에요"], ["520:27810", "characters", null, "10월 12일 · 0.02 ETH 보냄"], ["520:27827", "characters", null, "10월 3일 · 0.1 ETH 보냄"], ["520:27844", "characters", null, "9월 28일 · 1 USDC 보냄"], ["520:27816", "property", "Group 1", "0x7c3a"], ["520:27816", "property", "Group 2", "91d2"], ["520:27816", "property", "Group 3", "e5f0"], ["520:27816", "property", "Group 4", "4b88"], ["520:27816", "property", "Group 5", "a1c6"], ["520:27816", "property", "Group 6", "03d9"], ["520:27816", "property", "Group 7", "5e72"], ["520:27816", "property", "Group 8", "bb14"], ["520:27816", "property", "Group 9", "9f20"], ["520:27816", "property", "Group 10", "6a1d"], ["520:27833", "property", "Group 1", "0x2f9e"], ["520:27833", "property", "Group 2", "0c41"], ["520:27833", "property", "Group 3", "8d73"], ["520:27833", "property", "Group 4", "b6a5"], ["520:27833", "property", "Group 5", "e912"], ["520:27833", "property", "Group 6", "47cd"], ["520:27833", "property", "Group 7", "3a08"], ["520:27833", "property", "Group 8", "f5b1"], ["520:27833", "property", "Group 9", "6c2e"], ["520:27833", "property", "Group 10", "91d4"], ["429:2176", "property", "Message", "보낼 수 있는 금액보다 많아요\n보낼 수 있는 금액 1.284732 ETH"], ["527:4537", "property", "Title", "먼저 복구 구문을 백업하세요"], ["527:4537", "property", "Body", "기기를 잃어도 이 지갑을 되찾으려면 복구 구문이 필요해요.\n백업을 마치면 받기 주소가 보여요."], ["520:27860", "property", "Label", "시각"], ["520:27860", "property", "Value", "10월 16일 (금) 09:41"], ["520:27863", "property", "Label", "시각"], ["520:27863", "property", "Value", "10월 16일 (금) 09:41"], ["520:27866", "property", "Label", "시각"], ["520:27866", "property", "Value", "10월 16일 (금) 09:41"], ["520:27869", "property", "Label", "시각"], ["520:27869", "property", "Value", "10월 16일 (금) 09:41"], ["520:27872", "property", "Label", "시각"], ["520:27872", "property", "Value", "10월 16일 (금) 09:41"], ["520:27875", "property", "Label", "시각"], ["520:27875", "property", "Value", "10월 16일 (금) 09:41"], ["494:25816", "property", "Title", "테스트 거래예요"], ["494:25816", "property", "Body", "이 기기에서 만든 예시예요.\n네트워크로 보내지 않았어요."], ["494:25800", "property", "Value", "예시"], ["494:25908", "property", "Title", "테스트 거래예요"], ["494:25908", "property", "Body", "이 기기에서 만든 예시예요.\n네트워크로 보내지 않았어요."], ["494:25892", "property", "Value", "예시"], ["520:27889", "property", "Title", "테스트 거래 지우기"], ["520:27900", "property", "Title", "테스트 거래 지우기"], ["520:27878", "property", "Title", "Etherscan에서 보기"], ["457:17644", "property", "Body", "이 기기에서 만든 예시 거래예요. 지우면 다시 보내기를 시험할 수 있어요."], ["I457:17644;301:611", "property", "Label", "취소"], ["I457:17644;301:622", "property", "Label", "지우기"], ["460:5091", "property", "Subtitle", "Sepolia ETH · 07:20 · 상태를 확인해 주세요"], ["460:5102", "decoration", "Value", "STRIKETHROUGH"], ["520:27907", "property", "Title", "내역을 불러오지 못했어요"], ["520:27907", "property", "Body", "연결을 확인하고 다시 시도하세요."], ["I520:27907;422:680", "property", "Label", "다시 시도"], ["85:605", "style", null, "Product B/Label"], ["85:609", "style", null, "Product B/Label"], ["85:613", "style", null, "Product B/Label"], ["85:621", "style", null, "Product B/Label"], ["85:625", "style", null, "Product B/Label"], ["85:629", "style", null, "Product B/Label"]]

async function apply() {
  const res = { ok: 0, fail: [] }
  for (const [id, kind, prop, after] of Q) {
    try {
      const n = await node(id)
      if (kind === 'characters') { await loadNodeFonts(n); n.characters = after }
      else if (kind === 'property') { const k = propKey(n, prop); if (!k) throw new Error('no prop ' + prop); n.setProperties({ [k]: after }) }
      else if (kind === 'decoration') { const t = n.findOne(x => x.type === 'TEXT' && x.name === prop); await loadNodeFonts(t); t.textDecoration = after }
      else if (kind === 'style') { await n.setTextStyleIdAsync(S(after).id) }
      res.ok++
    } catch (e) { res.fail.push(id + ' ' + (prop || kind) + ': ' + String(e).slice(0, 160)) }
  }
  return res
}

// Dark frames are clones of Light (explicit 02 Semantic Dark mode). Re-clone after the Light text edits.
const RESYNC = {
  '486:17419': ['423:848', '423:1071', '404:315', '419:12973', '461:5074', '423:14763', '423:15006', '423:14844', '430:7672', '423:14925', '430:7737', '457:16902', '457:16988', '457:17074', '457:17160', '457:17246', '457:17332', '494:4103', '494:4242', '494:4381', '423:15795', '423:15852', '423:15909', '423:15959', '423:16009', '423:16059', '457:4366'],
  '486:17436': ['423:16236', '457:17502', '460:5024', '423:16327', '423:16381', '460:4988', '457:4412', '457:17613', '457:17668'],
  '485:76': ['423:13750'],
}
async function resyncAll() {
  const out = {}
  for (const [pid, ids] of Object.entries(RESYNC)) {
    const page = await node(pid); await figma.setCurrentPageAsync(page)
    for (const id of ids) {
      const l = await node(id); const d = page.findOne(n => n.type === 'FRAME' && n.name === l.name + ' · Dark')
      if (!d) { out[id] = 'no dark'; continue }
      for (const c of [...d.children]) c.remove()
      d.layoutMode = l.layoutMode; d.primaryAxisSizingMode = 'FIXED'; d.resize(l.width, l.height); d.clipsContent = l.clipsContent
      for (const k of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'itemSpacing']) { d[k] = l[k]; const b = l.boundVariables && l.boundVariables[k]; if (b) d.setBoundVariable(k, await figma.variables.getVariableByIdAsync(b.id)) }
      for (const c of l.children) { const cl = c.clone(); d.appendChild(cl); if (c.layoutPositioning === 'ABSOLUTE') { cl.layoutPositioning = 'ABSOLUTE'; cl.x = c.x; cl.y = c.y } }
      d.setExplicitVariableModeForCollection(L.sem, '298:0'); d.fills = [paint('screenB/bg')]
      out[id] = d.id
    }
  }
  return out
}

async function run() {
  await init()
  const out = {}
  out.banner = await bannerTitle()
  out.apply = await apply()
  out.dark = await resyncAll()
  return out
}
;(async () => {
  const log = { task: TASK, at: new Date().toISOString(), out: null, error: null }
  try { log.out = await run() } catch (e) { log.error = String(e && e.stack || e) }
  figma.root.setSharedPluginData('vaultme', 'log', JSON.stringify(log))
  figma.closePlugin(log.error ? 'VaultMe runner: error' : 'VaultMe runner: ok')
})()
