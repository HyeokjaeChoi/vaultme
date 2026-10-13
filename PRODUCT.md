# VaultMe

<!-- impeccable:product-schema 1 -->

상태: 현행 제품 범위 · 문서 갱신: 2026-10-04  
범위: 재사용 가능한 Light Foundation과 `en-US` 합성 Prototype

[문서 홈](outputs/README.md) · [현재 release](outputs/vaultme-release.json)

## Platform

web

현재 산출물은 Figma Foundation Library, portable tokens, guidance와 browser design specimens입니다. Native app platform과 실제 wallet runtime은 미정입니다.

## Product Purpose

Web3 self-custody wallet을 만들기 위한 Foundation입니다. 사용자가 서명 전에 행동과 예상 자산 변화를 읽게 합니다.

## Users

현재 확정된 사용자는 Foundation으로 앱·웹을 만드는 owner와 consumer designer/engineer입니다. 최종 wallet 사용자의 경험 수준·시장·지원 locale는 미정입니다.

## Operating Context

같은 [Figma source](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8)와 stable ID를 유지합니다. Source는 `Design Systems` Project에 있습니다. Primitive → Semantic → Component를 유지합니다. JSON import, native update, Library publish, consumer subscription은 별도 단계입니다. 현재 상태는 release record를 따릅니다.

## Capabilities and Constraints

현재 작업은 Design System과 합성 Prototype입니다. 실제 wallet runtime은 구현·검증 대상입니다. Specimen의 network·asset 이름은 예시이며 지원 선언이 아닙니다.

Connection, message signing, token approval, on-chain transaction을 구분합니다. Disconnect는 allowance revoke가 아닙니다. Readable signature와 simulation은 safety guarantee가 아닙니다. 실제 recovery phrase와 private key를 산출물에 넣지 않습니다. 확인되지 않은 QR·지원 network·보안 인증·기능을 추가하지 않습니다.

## Brand Commitments

VaultMe와 제공된 landing image의 Light 방향을 유지합니다. Inter UI와 IBM Plex Mono 주소·hash를 사용합니다. Owner가 승인한 Blue A Primary, Secondary surface의 Ink, neutral secondary action을 유지합니다. Blue는 success·gain·safety 의미로 쓰지 않습니다.

Borderless는 정보 container와 flat row의 기본입니다. Input 인지, focus·invalid·selected, 필요한 table 비교, fixed footer·drawer 경계는 목적을 설명한 예외입니다. 값과 provenance는 [디자인 언어](outputs/VaultMe-DESIGN.md)를 따릅니다.

## Evidence on Hand

[Token source](outputs/wallet-foundation.tokens.json), [Foundation guide](outputs/wallet-foundation-guide.md), [Component 계약](outputs/wallet-component-contracts.md), [연구 근거](outputs/vaultme-reference-review.md)를 사용합니다. 실제 검사 결과·digest·publication·consumer 상태는 [release record](outputs/vaultme-release.json)에 연결합니다.

## Product Principles

값은 한 source에서 관리합니다. 화면 상태와 실제 문구를 맞춥니다. 금융 수량과 전체 주소를 보존합니다. 관찰한 범위만 완료로 기록합니다.

## Accessibility & Inclusion

44 × 44 px target, visible keyboard focus, reduced motion, 대비와 긴 데이터 규칙을 따릅니다. Component와 consumer의 책임은 family recipe에 분리합니다. 현재 specimen은 `en-US`이며 localized product 지원이 아닙니다. [Locale 계약](outputs/wallet-component-contracts.md#locale-계약)을 따릅니다.

## Icons

Phosphor regular 기능·상태·Navigation과 별도 identity SVG를 사용합니다. 중요한 금융 행동은 icon + visible label입니다. Review에서 account·network·asset·full recipient/spender·amount/allowance·estimated fee·status를 유지합니다. Logo·Wallet·lock·check는 인증·안전·network 지원의 증거가 아닙니다. [Icons 안내](outputs/wallet-icon-guide.md)를 따릅니다.
