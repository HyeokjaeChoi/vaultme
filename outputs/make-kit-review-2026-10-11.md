# 기존 Make Kit 검토

검토: GPT-6.1 Sol · low, 2026-10-11. 읽기 전용.

## 현재 라이브 확인

- Preview의 iPhone 형태 시작 화면이 렌더된다.
- Create a new wallet / Import an existing wallet 버튼과 synthetic data / No wallet is connected 안내가 있다.
- 편집기에 Version 27 — Update asset selection logic이 표시된다.
- Ethereum, Bitcoin, Solana, Tron, XRP Ledger 표시는 실제 network 지원 증거가 아니다.
- 버튼 AX 클릭 및 키보드 입력에서 화면 전환을 확인하지 못했다. 이후 Computer Use가 noWindowsAvailable을 반환했다. 버튼 고장으로 확정하지 않는다.
- Publish kit가 disabled다. 이 사실만으로 개인 Prototype 사용이 불가능하다는 의미는 아니다.

## 과거 기록과 확인 한계

Make 대화는 Swap From/To 선택, 같은 자산 선택 방지, Activity 필터, 로고 매핑 구현을 보고한다. 이번 직접 동작 검증 결과는 아니다.

work/v7/make-setup/setup-status.json은 Foundation 2026-10-05-spacing-r1, Library styles import와 Guidelines 5개 readback을 기록한다. 라이브 편집기에도 Import library styles / Provide guidelines 단계가 있다. 현재 모든 화면의 token 연결은 미검증이다.

work/v7/make-setup/browser-proof.json은 Home/Review의 320·390·768·1440 폭, gap 24 px, inset 16 px, Review 480 px 및 합성 Pending → Confirmed의 과거 증거다. 현재 Version 27 전체 검증으로 확대하지 않는다.

로컬 기록에서 팀 공용 Kit 발행은 npm registry access 부족으로 차단됐다. React Native 연결 또는 production SDK의 증거는 없다.

## 재사용 방향

1. Lo-fi: Create/Import 분기와 Home → Send review를 기존 화면 목록의 출발점으로 삼는다.
2. Hi-fi: 기존 Foundation과 화면을 재사용한다. 변경 전에 현재 화면별 token 및 동작을 확인한다.
3. Architecture: 합성 UI와 실제 wallet 기능을 구분한다. C01–C28 계약과 상태 용어를 사용하고, key custody / signing / chain adapter / RPC / fee estimation / transaction tracking 책임은 요구사항 확정 후 설계한다.

## 우선 공백

- Version 27 전체 화면·분기·오류 상태 목록.
- Create/Import, Send, Receive, Swap, Activity의 전환·취소·실패·Unknown 복구 증거.
- 첫 사용자, 첫 핵심 행동, 지원 Testnet 및 복구 모델 결정.

기존 Prototype은 재사용 후보로 채택한다. 전체 흐름이 동작한다는 승인이나 신규 wallet 기능 구현 완료를 뜻하지 않는다.
