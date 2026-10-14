# VaultMe

<!-- impeccable:product-schema 1 -->

상태: 현행 · 문서 갱신: 2026-10-14

[README](README.ko.md) · [문서 홈](outputs/README.md) · [HLD](outputs/design/hld.md) · [디자인 언어](outputs/VaultMe-DESIGN.md)

## Platform

adaptive

Expo(React Native) 앱 하나로 iOS와 Android를 대상으로 합니다. Expo Go로 iOS와 Android 에뮬레이터에서 실행을 확인했습니다. 네이티브 빌드 설정(`app.json`, `expo run:ios`)은 아직 iOS만 있습니다. 웹은 랜딩과 운영 대시보드 계획이며 지갑 기능은 없습니다. 범위는 [HLD](outputs/design/hld.md)를 따릅니다.

## Product Purpose

Sepolia testnet에서 쓰는 self-custody wallet입니다. 사용자가 서명 전에 행동과 예상 자산 변화를 읽게 합니다. 실제 가치가 있는 자산은 다루지 않습니다.

## Users

확정된 사용자는 owner와 consumer designer/engineer입니다. 최종 wallet 사용자의 경험 수준과 시장은 미정입니다.

## Operating Context

Figma source와 token은 [릴리스 기록](outputs/vaultme-release.json)을 따릅니다. 현재 상태:

- wallet-core(C1)와 mobile UI(C2a), C2b(저장소, 백업, 복구, 앱 잠금, 보내기)는 main에 있습니다. 체인은 fake adapter이고 잔액과 내역은 예시입니다.
- Redesign A(PR #10)가 `main`에 merge되었습니다.
- 앱은 아직 네트워크를 호출하지 않습니다. 실제 broadcast와 API는 C3이며 시작 전입니다.

## Capabilities and Constraints

지원 범위(Sepolia ETH, USDC)와 제외 범위는 [HLD §1](outputs/design/hld.md)이 정합니다. 화면 copy는 한국어이고 `packages/i18n`의 `ko.ts`에서 관리합니다. 다른 locale은 미정입니다.

Connection, message signing, token approval, on-chain transaction을 구분합니다. Disconnect는 allowance revoke가 아닙니다. Readable signature와 simulation은 safety guarantee가 아닙니다. 실제 recovery phrase와 private key를 저장소에 넣지 않습니다. 확인되지 않은 QR·network·보안 인증·기능을 추가하지 않습니다.

## Brand Commitments

Inter UI와 IBM Plex Mono 주소·hash를 사용합니다. Owner가 승인한 Blue A Primary, Secondary surface의 Ink, neutral secondary action을 유지합니다. Blue는 success·gain·safety 의미로 쓰지 않습니다. Light를 기본으로 하고 앱은 OS 설정에 따라 Dark로 전환합니다.

Borderless는 정보 container와 flat row의 기본입니다. Input 인지, focus·invalid·selected, 필요한 table 비교, fixed footer·drawer 경계는 목적을 설명한 예외입니다. 값과 provenance는 [디자인 언어](outputs/VaultMe-DESIGN.md)를 따릅니다.

## Product Principles

값은 한 source에서 관리합니다. 화면 상태와 실제 문구를 맞춥니다. 금융 수량과 전체 주소를 보존합니다. 관찰한 범위만 완료로 기록합니다.

## Accessibility & Inclusion

44 × 44 px target, visible keyboard focus, reduced motion, 대비와 긴 데이터 규칙을 따릅니다. 세부 규칙은 [Locale 계약](outputs/wallet-component-contracts.md#locale-계약)과 [Foundation guide](outputs/wallet-foundation-guide.md)에 있습니다.

## Icons

Phosphor regular 기능·상태·Navigation과 별도 identity SVG를 사용합니다. 중요한 금융 행동은 icon + visible label입니다. Review에서 account·network·asset·full recipient/spender·amount/allowance·estimated fee·status를 유지합니다. Logo·Wallet·lock·check는 인증·안전·network 지원의 증거가 아닙니다. [Icons 안내](outputs/wallet-icon-guide.md)를 따릅니다.
