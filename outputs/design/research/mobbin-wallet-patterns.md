# 지갑 앱 레퍼런스 관찰 (2026-10-13)

출처: Mobbin 웹(free 계정, 앱별 Highlight 화면만 공개), App Store 공개 스크린샷. Flow는 Pro 전용이라 보지 못했다.
이미지는 저장하지 않았다 (저작권). 링크만 남긴다.

- [Phantom (Mobbin)](https://mobbin.com/apps/phantom-ios-28f44562-240b-48eb-997f-8a1a731499cb/689aadcf-d2e3-49bb-8ebb-e135252e28bd/screens)
- [Coinbase Wallet (Mobbin)](https://mobbin.com/apps/coinbase-wallet-ios-35ec24a0-7020-45bd-9f1e-96f35b5f411d/06470d31-27c5-4351-8d95-64e9bdd34d13/screens)
- Rainbow, Toss: Mobbin 검색 결과 미리보기 4장

## 관찰

| 항목 | Phantom | Rainbow | Coinbase Wallet | Toss |
|---|---|---|---|---|
| 뒤로가기 | 배경 없는 ×/‹ | 배경 없는 ‹ | 배경 없는 ← | 배경 없는 ‹, 가운데 제목, 오른쪽 텍스트 버튼 |
| 홈 상단 | 아바타 + 계정명, 오른쪽 아이콘 2개 | 가운데 아바타 + 짧은 주소 ▾ | 계정 ▾ + 아이콘 3개 | 알림 아이콘 |
| 잔액 | 왼쪽 정렬, 큰 숫자 + 변화량 pill | 카드 안 | 왼쪽 정렬 큰 숫자 | 왼쪽 정렬 큰 숫자 |
| 주요 행동 | 4개 정사각 tinted tile (아이콘 위, 라벨 아래) | 4개 원형 tinted 버튼 + 라벨 | 원형 아이콘 버튼 | 같은 폭 버튼 2개: 채우기(tonal) + 보내기(primary) |
| 목록 | 행마다 둥근 tile, 아이콘 40 | 흰 카드 + 약한 그림자 | 평평한 행, 구분선 없음 | 날짜별 그룹, 평평한 흰 행, 금액 오른쪽 + 잔액 아래 |
| 금액 입력 | 가운데 큰 숫자 + preset chip + 숫자 키패드 + 하단 Continue | 시트, 둥근 tinted 필드, Max pill, Review 버튼, 수수료 행 | – | – |
| 상세 화면 | – | 시트(grabber) | 큰 왼쪽 제목, 오른쪽 원형 검색 | – |

## 공통 규칙 (VaultMe 적용안)

1. 뒤로가기·닫기는 배경 없는 아이콘이다. 44 pt 터치 영역은 유지한다. 누를 때만 반응한다.
2. 잔액은 왼쪽 정렬 큰 숫자다. 카드에 가두지 않는다.
3. 주요 행동은 같은 폭 버튼 2개(보내기 Primary, 받기 Secondary tonal)다. VaultMe는 행동이 2개라 Toss 방식이 맞는다.
4. 목록은 평평한 행이다. 행 사이 구분선이 없다. 기록은 날짜로 묶는다.
5. 금액 입력은 가운데 큰 숫자다. Max는 작은 pill이다. 하단에 고정 CTA가 있다.
6. 필드는 테두리 없는 tinted 면이다. Borderless 규칙(docs/agents/foundation.md rule 10)과 맞는다. focus·error일 때만 테두리를 쓴다.
7. 상세·보조 작업은 시트로 연다. 시트에는 grabber와 가운데 제목이 있다.
