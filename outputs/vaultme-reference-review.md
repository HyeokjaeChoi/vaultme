# VaultMe v2 Reference 검토

상태: 연구·결정 근거 · 문서 갱신: 2026-10-04

범위: 관측, 문서 설명, VaultMe 결정, 확인 한계

[문서 홈](README.md) · [현재 release](vaultme-release.json) · [변경 이력](vaultme-v2-change-log.md)


기준일: 2026-10-03. **제공된 landing image가 색과 브랜드의 source다.** 타사 자료는 정보 위계·행동·상태 설명에만 사용한다.

## Evidence 등급

| 등급 | 의미 | 사용 제한 |
| --- | --- | --- |
| 직접 UI 관찰 | 공개 live page/calculator/component 또는 접근 가능한 preview | 관찰한 범위만 설명. 타사 전체 flow·보안 성능 추론 금지 |
| 공식 screenshot/promotional UI | 공식 도움말/Store/제품 렌더 | 촬영 version과 최신 동작을 단정하지 않음 |
| 공식 문서 설명 | 행동·API의 원문 설명 | 화면 또는 실행 결과를 직접 관찰했다고 쓰지 않음 |
| 코드 정적 확인 | 고정 SHA의 실제 source | build/runtime·출시 commit 일치 주장 없음 |
| Catalog/제3자 분석 | 출처 탐색과 문서 구조 | 공식 brand specification 또는 token source로 쓰지 않음 |
| VaultMe 제안 | evidence를 현재 contract에 맞게 해석 | 적용 증거가 없으면 구현 완료로 쓰지 않음 |

## 채택 결정과 출처

| 근거 | 관찰 / 설명 | VaultMe 결정 |
| --- | --- | --- |
| [Coinbase CDS ListCell](https://cds.coinbase.com/components/data-display/ListCell/) | 공식 live example와 source. fixed leading/accessory, fill body, trailing value | Flat asset/Activity list. 금액·unit·quote 분리 |
| [Rabby simulation](https://support.rabby.io/en/articles/14124199-understanding-rabby-s-transaction-simulation) | 공식 도움말의 자산 변화, contract, fee, raw detail | Review 순서 보완, warning 이유·다음 행동 |
| [MetaMask spending cap](https://support.metamask.io/configure/tokens/how-to-customize-token-approvals-with-a-spending-cap/) | 공식 cap request/editor 예시 | Limited/Unlimited/Editing limit 분리 |
| [Phantom official Store](https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa) | promotional approval UI | Estimate caveat와 full contract detail. 보호 성능은 채택 안 함 |
| [Wise Calculator](https://wise.com/gb/pricing/send-money) | 가상 quote와 fee detail 직접 확인 | Amount/fee/total deduction 관계 |
| [Monzo engineering](https://monzo.com/blog/how-we-unified-our-customers-activity-on-the-new-home-screen) | 2024 공식 feed screenshot | 날짜 grouping, account source, right amount |
| [Revolut 10](https://www.revolut.com/blog/post/revolut-10/) | 2023 공식 account 렌더 | Balance 주변 account/currency context. 최신 앱 판단 아님 |
| [Mobbin 공개 preview](https://mobbin.com/explore/mobile/screens/wallet-balance) / [로그인 후 기록](../work/research-v2/catalog/mobbin-logged-in.md) | 제한된 Wise/Monzo/Revolut/Coinbase/Public 화면 | Compact header, flat list, 독립 onboarding task |
| [DesignSystems.one](https://www.designsystems.one/) | Catalog와 공식 링크 | 출처 탐색용. Token snapshot import 안 함 |
| [shadcn/ui](https://ui.shadcn.com/docs) / [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) | 받은 source와 공식 API | 행동 구조의 reference. 기본 theme와 36 px target 복제 안 함 |
| [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | Control/focus contrast 기준 | 기존 `neutral.450` provenance 유지. 실제 pair 재계산 |

[Wallet 연구](../work/research-v2/wallet/research.md), [Finance 연구](../work/research-v2/finance/research.md), [Catalog 연구](../work/research-v2/catalog/research.md), [shadcn 연구](../work/research-v2/shadcn/research.md)에 캡처·source URL·실패 기록이 있다.

## 정적 source 교차 확인

- [Rabby TokenApprove](https://github.com/RabbyHub/Rabby/blob/7794bfb54e9cf26a72738d3bd8c2058961663d0c/src/ui/views/Approval/components/Actions/TokenApprove.tsx): amount edit, balance, spender detail, 검사별 행.
- [Rainbow FastBalanceCoinRow](https://github.com/rainbow-me/rainbow/blob/9d718934e9f008cd3a5277bcfa69df153a542969/src/components/asset-list/RecyclerAssetList2/FastComponents/FastBalanceCoinRow.tsx): identity/balance/currency/icon 분리.

코드는 실행하지 않았다. Rainbow의 `height: 59`는 icon container이며 전체 row 높이 측정값이 아니다.

## 도구와 접근 한계

- Mobbin 로그인은 성공했으나 full Flow/download에는 Pro 안내가 있었다. Login, Pro, MCP는 별도 권한이다. Mobbin MCP 호출을 완료했다고 기록하지 않는다.
- 필수 content가 login으로 막히면 사용자가 특정 site에 직접 로그인하도록 요청한다. 제한을 우회하거나 limited preview를 전체 flow로 보고하지 않는다.
- `https://designsystem.one`은 certificate 오류였다. 확인한 catalog는 `https://www.designsystems.one/`다. Coinbase CDS는 이 catalog에서 발견한 것이 아니다.
- Wise Design Docs는 접근되지 않았다. Kraken 개인 Portfolio는 authentication gate였다. Revolut은 공식 과거 렌더만 사용했다.
- shadcn CLI 4.21.1과 stdio MCP 조사에는 source lookup만 포함된다. 제품 설치·Codex Connector 설치가 아니다. 실제 Prototype가 shadcn을 import하지 않으면 shadcn 구현이라고 부르지 않는다.
- Impeccable source clone과 detect는 조사다. Skill install/hook 활성화가 아니다. Detector 성공은 contrast·wallet state 검증이 아니다.
- v1 Rabby `designlang` 추출은 marketing 보조 근거다. Coinbase challenge와 미완료 Phantom 추출은 성공 evidence로 쓰지 않는다.

## 보존한 결정

Inter와 IBM Plex Mono, image color anchors, Primitive → Semantic → Component, 44 px target, full address, reduced motion, estimates/unknown을 유지한다. 타사 palette/custody model/network/feature를 가져오지 않는다. 승인된 Blue A raw 확장은 [디자인 언어](VaultMe-DESIGN.md)를 따른다. 다른 palette 변경은 별도 결정이 필요하다.

`design-taste-frontend`는 landing/brand에만 적용한다. 금융 제품은 상태·금액·정보 밀도를 우선한다. `emil-design-eng`의 빠른 피드백과 reduced motion을 적용한다. 금액 blur/bounce/stagger는 제외한다.

## 미정인 실제 제품 결정

Target market, native platform, supported chains, key storage, recovery 절차, simulation provider/coverage, identity source, alert freshness, revoke implementation, open-source/security claim evidence는 design만으로 확정하지 않는다.

v2 적용과 검사 완료 여부는 [변경 기록](vaultme-v2-change-log.md), compatibility는 [Migration](vaultme-v2-migration.md), component requirement는 [Component 계약](wallet-component-contracts.md)에 있다.

## Icons 연구 연결

Phosphor regular와 자산 identity의 선택 근거는 [Icons 연구](../work/research-v2/icons/research.md), 제한된 UI 관측은 [21st.dev 관측](../work/research-v2/icons/21st-browser-observations.json)에 있다. 역할·크기·색·license는 [Icons 안내](wallet-icon-guide.md)를 따른다.

이 문서의 링크는 기존 조사 근거다. 2026-10-04에 외부 사이트를 다시 검증한 기록이 아니다. 실제 채택과 publication 상태는 [release record](vaultme-release.json), 과거 검증은 [변경 이력](vaultme-v2-change-log.md)을 따른다.
