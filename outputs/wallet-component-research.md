# VaultMe v2 Component 조사와 적용

상태: 연구·결정 근거 · 문서 갱신: 2026-10-04

범위: 관측, 문서 설명, VaultMe 결정, 확인 한계

[문서 홈](README.md) · [현재 release](vaultme-release.json) · [변경 이력](vaultme-v2-change-log.md)


조사 기준일: 2026-10-03. 기존 2026-09-26 Foundation을 보완한다. 원본 연구는 [Wallet](../work/research-v2/wallet/research.md), [Finance](../work/research-v2/finance/research.md), [Catalog](../work/research-v2/catalog/research.md), [shadcn](../work/research-v2/shadcn/research.md)에 있다.

**목록은 비교 가능하게 만들고, 검토는 행동별로 나눈다.** 아래의 관찰과 문서 설명은 타사 evidence다. 마지막 열은 VaultMe의 설계 결정이다. 실제 wallet 동작 완료를 뜻하지 않는다.

## 공식 evidence와 Component

| 근거와 등급 | 확인한 내용 | VaultMe 결정 / 계약 |
| --- | --- | --- |
| [Coinbase CDS ListCell](https://cds.coinbase.com/components/data-display/ListCell/) · 공식 live example와 source | leading/media, title/body, value, accessory slot. condensed 예제의 60 px 관찰 | C07–C10 flat row. 기존 64/80 px min-height 유지. 타사 60 px를 복제하지 않음 |
| [Rabby simulation](https://support.rabby.io/en/articles/14124199-understanding-rabby-s-transaction-simulation) · 공식 도움말 UI | 자산 변화, network, fee, contract, raw data | C15/C25 review anatomy. 안전 점수·trust 값 복제 없음 |
| [Rabby approvals revoke](https://support.rabby.io/en/articles/14150713-how-to-revoke-approvals) · 공식 도움말 UI | Unlimited, spender, approval time, 개별 status/hash/fee | C20–C21 분리. batch revoke는 문서 설명이며 실행 검증 아님 |
| [MetaMask spending cap](https://support.metamask.io/configure/tokens/how-to-customize-token-approvals-with-a-spending-cap/) · 공식 도움말 UI | token amount, spender, origin, 별도 limit editor | C16 Limited/Unlimited/Editing limit, edit 후 review |
| [Phantom Chrome Web Store](https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa) · 공식 promotional UI | estimate caveat, asset changes, Network Fee/Network, Contract Address | C14–C15 amount/fee/detail 위계. 이미지의 지원망·수치·보호 주장 채택 없음 |
| [Phantom Send](https://help.phantom.com/articles/send-crypto-from-phantom-5530158379539) · 공식 문서 설명 | recipient/network, native fee reserve, watch-only/invalid format | C12–C14 validation. 해당 state의 실제 앱 UI는 이번에 보지 못함 |
| [Rainbow Get Started](https://rainbow.me/support/app/get-started-with-the-rainbow-app) · 공식 도움말 UI | flat 자산 행, recipient→asset→amount→summary | C09/P03/P04. 최종 full address와 fee는 VaultMe 계약으로 보완 |
| [Wise quote calculator](https://wise.com/gb/pricing/send-money) · 공개 live calculator | send/receive, fee breakdown, 도착 estimate 연결 | C13–C14 fee 포함/추가와 total deduction. 은행 fee를 gas와 동일시하지 않음 |
| [Monzo feed](https://monzo.com/blog/how-we-unified-our-customers-activity-on-the-new-home-screen) · 2024 공식 screenshot | 날짜·출처 account badge·우측 amount | C10 source account/network 보존. 최신 앱으로 단정하지 않음 |
| [shadcn Field](https://ui.shadcn.com/docs/components/radix/field) / [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) · source 정적 확인·공식 문서 | label/error 구성, focus, Escape, restore 원칙 | C03/C24. VaultMe 조합의 실제 keyboard 검사는 별도 |

## 기존 Foundation의 보완

| v1 문제 | v2 설계 결정 |
| --- | --- |
| Variant 이름과 실제 copy가 다름 | State마다 문구·값·icon 변경. state copy와 user TEXT property 분리 |
| 모든 목록 행이 독립 card | List surface + divider + selected/focus. Row min-height와 content height |
| marketing h3가 제품 행 제목 역할 | Product title/balance/amount/row/body/address 10개 역할 |
| 420 px 고정 review와 13 px amount | Content에 맞는 review. 28 px 핵심 amount, 14 px full address |
| unavailable quote에 fiat 값 | Token balance 유지 + `Price unavailable` |
| stale fee에 fresh 문구 | 시각·갱신 행동·blocked 상태 구분 |
| Unlimited에 제한 amount | `Unlimited USDC`와 future deposit 의미 |
| check clear가 success처럼 보임 | 중립 `check.clear.*`; 실제 완료만 success |

28개 family와 12개 조립 화면은 [Component 계약](wallet-component-contracts.md)에 전부 나열한다. 이 연구 문서에서 중복 state API를 만들지 않는다. 적용 결과는 [변경 기록](vaultme-v2-change-log.md)을 따른다.

## 구현 전제

Product 화면은 실제 account/chain 데이터, fee quote, copy permission, signing event, broadcast/confirmation 근거에 연결해야 한다. Prototype는 decimal 문자열과 합성 scenario를 사용한다. Readable signature와 성공한 simulation은 안전 보증이 아니다.

Disconnect와 revoke는 별도 행동이다. [MetaMask revoke 안내](https://support.metamask.io/more-web3/learn/how-to-revoke-smart-contract-allowances-token-approvals), [Phantom connected apps](https://help.phantom.com/hc/en-us/articles/29995498642195-Connect-to-apps). Backup confirmed는 실제 제품의 확인 절차를 필요로 한다. [MetaMask recovery 안내](https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys). Recovery phrase와 private key는 산출물에 넣지 않는다.

QR encoder, supported network, security certification, explorer/cancel/retry 기능은 검증 없이 추가하지 않는다. 이번 Receive specimen에는 QR slot도 없다.

## 관찰 한계

타사 앱 설치·실제 account·wallet connection·signing·transaction은 수행하지 않았다. 공개 예시 화면의 exact version/font/motion/keyboard·전이 결과는 확인하지 못했다. 공식 Store image는 promotional composition이다. 공개 source의 고정 SHA와 출시 앱 commit도 같다고 단정하지 않는다.

Mobbin 공개 detail와 로그인 후 제한된 Highlight는 정보 배치만 보완했다. Pro로 막힌 전체 Flow를 관찰한 기록은 없다. [로그인 후 기록](../work/research-v2/catalog/mobbin-logged-in.md).

## Icons 연구 연결

Phosphor regular와 자산 identity의 선택 근거는 [Icons 연구](../work/research-v2/icons/research.md), 제한된 UI 관측은 [21st.dev 관측](../work/research-v2/icons/21st-browser-observations.json)에 있다. 역할·크기·색·license는 [Icons 안내](wallet-icon-guide.md)를 따른다.

이 문서의 링크는 기존 조사 근거다. 2026-10-04에 외부 사이트를 다시 검증한 기록이 아니다. 실제 채택과 publication 상태는 [release record](vaultme-release.json), 과거 검증은 [변경 이력](vaultme-v2-change-log.md)을 따른다.
