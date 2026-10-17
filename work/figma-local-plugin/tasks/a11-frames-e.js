// VaultMe Local Runner: TASK a11-frames-e (#54). Receive network fact in the title row, S30B copy, frame annotations (Mobbin links).
const TASK = 'a11-frames-e'
const PAIRS = []
const PAGES = { p2: '486:76', p3: '486:17419', p4: '486:17436', p5: '486:17443', p1: '485:76' }
const PAGE_OF = { fixrecv: '486:17419' }
const M = {
  phantomTokens: 'https://mobbin.com/screens/c8f09680-22fc-48f4-9788-925b8b22cee5', coinbaseHome: 'https://mobbin.com/screens/9cc67605-c277-4edc-816d-0c50d010d0b3',
  coinbaseAsset: 'https://mobbin.com/screens/452ef54c-2182-4401-9568-2f19d78a1c61', cashApp: 'https://mobbin.com/screens/bdbb41fb-1c05-4d95-bfeb-f2d1ec272edd',
  talabatAmount: 'https://mobbin.com/screens/6e9ef288-dffb-4df8-a759-837b7ac16393', publicAmount: 'https://mobbin.com/screens/02eb5050-dc11-4754-a248-078f59ef8756',
  revolutReview: 'https://mobbin.com/screens/160eff79-448b-4ab3-a6de-bb4f406975af', coinbaseBefore: 'https://mobbin.com/screens/063f1aad-dc7a-4b45-96bf-dae60b56ac66',
  lloyds: 'https://mobbin.com/screens/2b966b9f-f6f5-461a-aa99-7c942a862619', toss: 'https://mobbin.com/screens/5faf70d5-f007-4bfa-86ff-55802a53c121',
  talabatFail: 'https://mobbin.com/screens/ce8b2238-1b89-4d12-9174-03d175a98b2c', klarna: 'https://mobbin.com/screens/8378e4d7-d17f-4fc1-8146-969e5c1a85a9', rodeo: 'https://mobbin.com/screens/0918d7b7-2c6f-4848-b8dd-6ffd632674bd',
  phantomReceive: 'https://mobbin.com/screens/c0b35d9a-68d9-4d0c-becb-62815fde60ba', publicReceive: 'https://mobbin.com/screens/900ae0d0-fc11-4e3c-a596-619ab18dc58e',
  revolutTx: 'https://mobbin.com/screens/ea30b847-be1c-4858-aaac-4f01cca1a9ea',
}
const NOTES = {
  home: [['home-s10', `재검수 반영 (2026-10-17): 칩은 1개("Sepolia"), 오른쪽 위 고정. 탭하면 안내 sheet. 파랑은 Primary와 선택 탭만. 링크는 Ink + 밑줄, 받은 금액은 Ink + "+". 큰 숫자(Sepolia ETH)와 목록이 같은 값을 두 번 보이지 않게, 목록은 "다른 자산". 큰 숫자를 누르면 ETH 자산 상세.\nMobbin: Phantom Tokens ${M.phantomTokens} · Coinbase Home ${M.coinbaseHome}`],
    ['home-s10-testmode', '테스트 데이터 모드: 같은 칩에 "· 테스트 데이터"를 더해요. 칩이 2개가 되지 않아요. 같은 자리, 탭하면 같은 안내 sheet.'],
    ['home-s10-newwallet', 'S10N = 백업 전 새 지갑. 백업 경고 행이 계속 보여요(Q14 변경, 2026-10-17). 받기는 Primary로 열려 있어요.'],
    ['home-s10-empty-faucet', 'S10E = 백업을 마친 빈 지갑. 백업 경고 행 없음. faucet 행이 가장 아래 행동.'],
    ['asset-s11-eth', `자산 상세(§9): 네트워크, 컨트랙트, 소수 자릿수, 이 자산의 내역. 사실 값은 Product B/Fact(mono). ETH는 컨트랙트가 없어요(네이티브).\nMobbin: Coinbase asset detail ${M.coinbaseAsset} · Cash App 사실 행 ${M.cashApp}`],
    ['asset-s11-usdc', `USDC: 컨트랙트 전체 주소 + 복사. 소수 자릿수 6. Mobbin: ${M.cashApp}`]],
  send: [['send-s20b-amount', `금액·빠른 칩·키패드를 한 열로 아래쪽에 모았어요. 제목 아래 빈 공간은 한 곳(설계된 쉼). 금액은 가운데.\nMobbin: talabat ${M.talabatAmount} · Public ${M.publicAmount}`],
    ['send-s22-review', `검토 순서: 받는 사람 → 비용(수수료, 총 차감액) → 보내는 것. 수수료와 총액이 첫 화면 안에 있어요. 하단 안내는 Body Small + Ink(가장 중요한 문장).\nMobbin: Revolut Review transfer ${M.revolutReview} · Coinbase Before you send ${M.coinbaseBefore}`],
    ['send-s23-confirmed', `확정 결과: 큰 hero(자산 96 + 확정 badge 32) + 한 문장. 확정 motion(1회): 체크 badge scale 0.6 → 1.0, 링 채움, 400 ms ease-out + haptic success. 움직임 줄이기: 최종 상태만. 보냄·블록 포함 상태는 작은 badge 그대로(정직한 상태).\nMobbin: Lloyds ${M.lloyds} · Toss ${M.toss}`],
    ['send-s23-failed', `실패 결과 버튼 위계: Primary "다시 보내기", Secondary "확인", 링크 "거래 상세 보기". 다시 보내기는 같은 주소·금액으로 S22를 열고 Face ID부터 다시 거쳐요. 자동 전송 없음.\nMobbin: talabat ${M.talabatFail}`],
    ['send-s30-receive-faucet', `받기는 백업 전에도 열려요(Q14 변경). 네트워크 사실은 제목 줄 오른쪽 mono. 백업 전 변형은 B-S30B.\nMobbin: Phantom Receive ${M.phantomReceive} · Public Receive ${M.publicReceive}`],
    ['send-s31-backup-required', '보내기 게이트(S31 재사용): 백업 전에 보내기를 누르면 이 화면. "백업 시작" → S03. "나중에" → 닫기(보내기는 열리지 않아요).']],
  act: [['activity-s41-confirmed', `거래 상세: 해시를 첫 화면에 올렸어요. 시각·네트워크·해시·블록은 Product B/Fact(mono). Mobbin: Revolut ${M.revolutTx} · Cash App ${M.cashApp}`]],
  set: [['settings-s60', '설정: "0원 거래 표시"를 "수량 0 거래 표시"로 바꿨어요("원"은 KRW로 읽혀요). 네트워크·버전 값은 Fact(mono). 오너 확인 필요(ux-copy.md).']],
  ob: [['brand-s01-start', `시작: 약속 한 줄(계정 없이, 열쇠는 이 기기에만) + 사실 mono 한 줄(버전·네트워크). 빈 영역은 가운데 한 곳.\nMobbin: Klarna ${M.klarna} · Rodeo ${M.rodeo}`]],
}
const STEPS = {
  async fixrecv() {
    const out = {}
    for (const id of [pairN('send-s30-receive-faucet'), pairN('copy-feedback'), '586:97529']) {
      const f = await node(id); const nf = f.findAll(n => n.name === 'Network fact')[0]
      if (nf && nf.parent.name !== 'Title row') { const wrap = nf.parent; nf.remove(); wrap.setBoundVariable('itemSpacing', null); wrap.itemSpacing = 0 }
      const tr = f.findOne(n => n.type === 'FRAME' && n.name === 'Title row')
      if (!tr.findOne(n => n.name === 'Network fact')) { const t = await txt('Sepolia · 11155111', 'Product B/Fact upper', 'text/tertiary', 'Network fact'); tr.appendChild(t); tr.primaryAxisAlignItems = 'SPACE_BETWEEN'; bind(tr, 'paddingRight', 'layout/screen/padding') }
      out[id] = tr.height
    }
    PAIRS.push(['586:97529', '586:97960'])
    const n = (await node('586:97529')).findOne(x => x.type === 'INSTANCE' && /^Inline Warning|Inline/.test(x.name) && x.visible !== false && x.findOne(t => t.type === 'TEXT' && /백업/.test(t.characters)))
    if (n) setP(n, { Message: '복구 구문을 아직 백업하지 않았어요.\n기기를 잃으면 자산을 되찾을 수 없어요.' })
    return out
  },
}
for (const [k, list] of Object.entries(NOTES)) {
  PAGE_OF['notes_' + k] = { home: '486:76', send: '486:17419', act: '486:17436', set: '486:17443', ob: '485:76' }[k]
  STEPS['notes_' + k] = async () => { const out = []; for (const [name, text] of list) out.push(await refNote(await node(MAP[name][0]), text)); return out }
}
PAGE_OF.notes_homeb = '486:76'; PAGE_OF.notes_s30b = '486:17419'
STEPS.notes_homeb = async () => [
  await refNote(await node('586:97173'), 'S10B = 백업 전에 첫 입금이 들어온 Home(신규 2026-10-17, Q14 변경). 백업 경고 행이 백업 전까지 계속 보여요(Ink 글자, 경고 아이콘만 amber). 칩 1개.'),
  await refNote(await node('586:97341'), `첫 입금 백업 sheet(신규): 첫 입금을 감지하면 1회. "지금 백업" → S03(복구 구문 보기). "나중에" → 닫기, Home 경고 행은 그대로. 보내기는 백업 전까지 S31 게이트로 막혀요.\nMobbin: Public Receive 안내 ${M.publicReceive}`)]
STEPS.notes_s30b = async () => [await refNote(await node('586:97529'), '받기 · 백업 전(신규): 주소와 QR은 그대로 열려요. 위에 경고 한 줄 + "백업하기" 링크. 백업 전에는 faucet 행을 숨겨 CTA가 첫 화면에 남아요.')]
