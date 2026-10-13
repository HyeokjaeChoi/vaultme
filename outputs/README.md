# VaultMe Foundation

**같은 값과 의미로 재사용하는 Light Foundation입니다.**

상태: 현행 문서 진입점 · 문서 갱신: 2026-10-04  
범위: Light Design System과 `en-US` 합성 Prototype

[문서 Portal](foundation/index.html) · [현재 release](vaultme-release.json) · [Figma source](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8) · [합성 Review](vaultme-v2-review/index.html)

## 처음 시작하기

1. [디자인 언어](VaultMe-DESIGN.md)와 [Foundation 사용 안내](wallet-foundation-guide.md)에서 값·type·layout·접근성 규칙을 읽습니다.
2. [C01 Button](components/C01-button.md) → [C03 Input](components/C03-input.md)에서 기본 control을 고릅니다.
3. [C15 Transaction panel](components/C15-transaction-panel.md)을 읽고 [Component 목록](components/README.md)에서 필요한 wallet 행동을 조합합니다.

[Figma Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)에서 시작합니다. [Components catalog](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-3936)로 이동합니다. Figma의 **Assets에서 Component 이름으로 검색**합니다. Portal의 **문서 찾기**는 문서 제목을 검색합니다.

## 대표 Component 찾기

| Component | 고를 때 | 사용 문서 | Figma |
| --- | --- | --- | --- |
| C01 Button | 정확한 action·busy·disabled | [Button recipe](components/C01-button.md) | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-3939) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=9-283) |
| C03 Input | 보이는 label·helper/error·validation | [Input recipe](components/C03-input.md) | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4281) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-231) |
| C09 Asset row | 정확한 balance와 quote 상태 | [Asset row recipe](components/C09-asset-row.md) | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4522) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=36-20) |
| C15 Transaction panel | 전체 recipient·amount·estimated fee 검토 | [Transaction panel recipe](components/C15-transaction-panel.md) | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4863) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=18-46) |

Figma page와 대표 frame의 이동은 [Figma 파일 지도](figma-organization.md#파일-지도)를 따릅니다. 예제는 합성 데이터입니다. 제품 instance의 `en-US` 문구와 한국어 사용 안내를 구분합니다.

## 역할별 시작점

| 하려는 일 | 먼저 읽을 문서 | 다음 확인 |
| --- | --- | --- |
| Owner: 범위와 상태 확인 | [PRODUCT](../PRODUCT.md) | [Release](vaultme-release.json), [실행 계획](../work/research-v3/production-audit/execution-plan.md) |
| Designer: UI와 Figma 조립 | [C01](components/C01-button.md) → [C03](components/C03-input.md) → [C15](components/C15-transaction-panel.md) | [Figma 파일 지도](figma-organization.md#파일-지도), [Component recipe](components/README.md) |
| Engineer: token·prop 적용 | [Foundation guide](wallet-foundation-guide.md) | [Token JSON](wallet-foundation.tokens.json), [Generated CSS](vaultme-v2.tokens.css), [Token map](../work/v2/token-map.json) |
| Accessibility owner: 책임·증거 확인 | [Component 계약](wallet-component-contracts.md) | Component별 keyboard·a11y 책임, release의 검사 결과 |
| Maintainer: update·복원 | [Migration](vaultme-v2-migration.md) | [변경 이력](vaultme-v2-change-log.md), [native ledger](../work/figma-state.json) |
| Researcher: 결정의 근거 확인 | [Reference 검토](vaultme-reference-review.md) | [Component 연구](wallet-component-research.md), [Production audit](../work/research-v3/production-audit/report.md) |

## 파일 지도

| 파일 | 한 가지 목적 |
| --- | --- |
| `README.md` | 역할별 문서 길찾기 |
| [VaultMe-DESIGN.md](VaultMe-DESIGN.md) | 시각 언어와 wallet 정보 위계 |
| [wallet-foundation-guide.md](wallet-foundation-guide.md) | token·type·layout·motion 사용 규범 |
| [wallet-component-contracts.md](wallet-component-contracts.md) | C/P 목록·action 데이터·상태·locale 계약 |
| [components/](components/README.md) | Family별 anatomy·prop·state·예제·책임 |
| [figma-organization.md](figma-organization.md) | Native 문서의 구조·이름·탐색 규칙 |
| [wallet-icon-guide.md](wallet-icon-guide.md) | Icon 역할·색·접근성·license |
| [wallet-icon-catalog.html](wallet-icon-catalog.html) | 실제 glyph·크기·출처 탐색 |
| [wallet-foundation.tokens.json](wallet-foundation.tokens.json) | Primitive → Semantic → Component 값 source |
| [vaultme-v2.tokens.css](vaultme-v2.tokens.css) | Generator가 만든 CSS 표현 |
| [vaultme-reference-review.md](vaultme-reference-review.md) | Reference 등급·채택 근거·접근 한계 |
| [wallet-component-research.md](wallet-component-research.md) | Component 설계 결정의 근거 |
| [vaultme-v2-migration.md](vaultme-v2-migration.md) | Compatibility·update·복원 |
| [vaultme-release-guide.md](vaultme-release-guide.md) | Release·package 선택·verifier·rollback |
| [vaultme-v2-change-log.md](vaultme-v2-change-log.md) | 과거 snapshot과 수정 이력 |
| [vaultme-release.json](vaultme-release.json) | 현재 release 수치·digest·증거·미확인 범위 |
| [vaultme-v2-review/README.md](vaultme-v2-review/README.md) | 합성 Review의 실행·검토 범위 |
| [Package manifest](vaultme-v2-package-manifest.json) | 전달 묶음의 파일과 hash |

## Surface와 Library 사용 상태

**Wallet Home은 Light canvas + C23 Secondary tint 한 곳을 사용합니다.** Asset·Activity·권한 목록과 Review는 흰색의 평평한 읽기 면입니다. C23의 모든 Quote는 같은 tint와 Ink 글자를 사용합니다. [C23 usage](components/C23-portfolio-balance.md)와 [Surface alias](wallet-foundation-guide.md#surface-위계-light-c23-secondary-tint)를 먼저 확인합니다.

문서는 Overview → Foundations → Components → Wallet patterns → Library adoption → Migration 순서로 읽습니다. Wallet patterns는 [행동별 조합](components/README.md#조합-경로)에 있습니다. Adoption 절차는 [Migration](vaultme-v2-migration.md)에 있습니다.

| 단계 | 확인할 근거 |
| --- | --- |
| Preview usage contract | Anatomy·states·tokens·accessibility·usage가 문서화됨. Public SDK가 아님 |
| Native source | 해당 master·property·Variable의 실제 readback와 화면 검토 |
| Published Library | 이번 source 변경의 review와 publication 기록 |
| Consumer adopted | 독립 파일의 update·override retention 또는 실제 web 조립 결과 |
| Stable / Experimental / Deprecated | Maintainer가 범위와 근거를 기록할 때만 lifecycle label 사용. Deprecated는 교체 경로·보존 범위 명시 |

현재 C01–C28 문서는 Preview usage contract입니다. Stable 또는 Experimental로 일괄 승격하지 않습니다. 기존 deprecated token은 [Migration](vaultme-v2-migration.md#stable-path와-새-역할)에서 교체 경로를 확인합니다. 제품 상태 Pending/Confirmed/Unknown과 Library lifecycle은 별개입니다. 새 Surface 변경의 publication·adoption은 새 증거를 요구합니다. 이전 proof를 새 변경의 pass로 읽지 않습니다.

### Surface 적용 확인 · 2026-10-04

[Native source review](../work/v4/verification/native/native-review-proof.json)에서 C23의 세 Quote와 P01/P02·P05 배경 Home의 tint·Ink·기존 IDs를 확인했습니다. PNG review에는 흰색 P04 Review·독립 P05 drawer·긴 값·좁은 폭·Partial/Unavailable이 포함됩니다. Source는 10 pages·693 native Variables입니다. Managed 690개와 legacy easing STRING 3개입니다. Text Styles 23개·Effect Styles 3개를 유지합니다. Portable JSON은 796 tokens입니다. Primitive 203개·Semantic 105개·Component 488개입니다.

신규 native scalar Variables는 11개입니다. Shadow alias `effect.overlayShadow`와 `overlay.shadow`는 `nativeType=null`입니다. 기존 `elevation/md` Effect Style로 연결합니다. 감사한 native pages에는 floating dialog/popover/scrim host가 0개였습니다. 새 host를 만들지 않았습니다. `overlay.*`의 native host 채택은 해당 host가 실제로 있을 때 확인합니다. 독립 drawer는 기존 transactionPanel·footer·경계 역할을 사용합니다.

[Web observation](../work/v4/verification/web/browser-observation.json)은 375/390/768/1440 px 화면의 C23 overflow 없음과 explicit text200 Partial 줄바꿈을 기록합니다. 독립 web consumer는 세 Quote·longBalance override·320 px overflow 없음·기존 form feedback을 확인했습니다. 합성 overlay의 Escape close와 trigger focus return도 확인했습니다. Text200은 browser zoom 검사가 아닙니다. Manual screen reader·실제 wallet 검증은 미확인입니다.

**Surface Library publication과 독립 Figma consumer 적용을 확인했습니다.** [Publication proof](../work/v4/verification/native/publication-proof.json)은 Semantic·Component·C23와 별도 review한 Product navigation·Status label의 순차 발행을 기록합니다. Source UI에는 남은 미발행 indicator가 없습니다. Published asset 수는 85개입니다.

[Figma consumer proof](../work/v4/verification/native/consumer-surface-proof.json)는 기존 Button/Input/Transaction panel 세 remote instance의 update 전후 override 보존과 새 C23 세 Quote·longBalance의 발행 후 채택을 구분합니다. 새 C23의 update 전후 override 보존은 아직 검증하지 않았습니다. [Web consumer proof](../work/v4/verification/web/consumer-web-proof.json)는 합성 C23와 기존 form·preview overlay의 제한된 browser 결과입니다. 실제 wallet·전체 runtime·manual screen reader 검증이 아닙니다. Package 완료는 이 문서에서 선언하지 않습니다. Current release의 별도 결과를 확인합니다.

## 문서 밖의 자료

`work/research-v2/`는 조사와 확정 계획입니다. `work/research-v3/production-audit/`는 감사와 수정 계획입니다. `work/v2/verification/`와 Surface의 `work/v4/verification/`는 실제 실행 증거입니다. 연구 문서와 과거 캡처를 현재 pass 결과로 읽지 않습니다.

기존 파일명과 Figma source IDs는 유지합니다. 물리 파일을 옮기지 않아 기존 링크와 자동화를 보호합니다. 새로운 자세한 사용법은 `components/`에 둡니다. Current 상태는 release record에서만 관리합니다.

**현재 산출물은 실제 wallet runtime이 아닙니다.** Consumer adoption, browser, manual screen reader 결과는 release에 연결된 증거의 범위만 인정합니다. 지원 network·보안 성능·localized product를 문서만으로 선언하지 않습니다.


### Canvas 보완 · 2026-10-05

사용자는 전체 배경의 색 차이가 너무 약하다고 확인했다. 기존 `surface.canvas`를 `{color.neutral.25}`에서 `{color.neutral.50}`으로 변경했다. 현재 배경은 **#F6F8FB**다. 이는 이미지에서 새로 추출한 값이 아니라, 기존 Neutral Primitive를 재사용한 승인된 설계 판단이다. 원본 이미지 Anchor `#FBFCFE`는 Primitive에 보존한다.

White 데이터·검토 면과 배경의 구분을 조금 더 보이게 한다. 색 차이만으로 정보 그룹을 구분하지 않는다. 기존 제목·정렬·간격을 유지한다. 잔액의 #DCE8FD + Ink, Primary Blue A, 상태색, Borderless 규칙은 유지한다. Token path/type와 Figma Variable ID를 유지하며 alias 한 개만 변경한다.

Canvas 구현 확인: 기존 Figma source의 Semantic alias를 수정하고 Library를 재발행했습니다. 별도 Figma consumer의 Canvas 2곳과 7개 remote Instance의 값 보존을 확인했습니다. 웹 consumer는 320 px에서 가로 넘침이 없습니다. 근거: `work/v5/verification/native-proof.json`, `publication-proof.json`, `consumer-figma-proof.json`, `consumer-web-proof.json`. 실제 wallet runtime과 manual AT 검증은 포함하지 않습니다.

## Spacing 정리 · 2026-10-05

- Product Section 간격은 기존 `layout.sectionGap.product` 24 px를 사용합니다. Group 16 / Row 12 / Field 8을 구분합니다.
- Desktop의 Review content max-width는 기존 `layout.review.maxWidth` 480 px입니다. 일반 1200 px content 규칙이 이를 덮지 않습니다.
- Home White reading container는 기존 screen padding 16 px를 사용합니다. Row 자체 horizontal padding 0은 유지합니다.
- Tablet의 stacked section 간격은 24 px입니다. Desktop column gutter도 24 px입니다. 예전 divider의 별도 inset을 반복하지 않습니다.
- Home Backup 안내는 한 곳에만 둡니다.
- Native product와 stress screen의 Section role을 연결했습니다. Permissions는 Connections / Allowances / comparison rows로 묶었습니다. 기존 node/master/property IDs를 보존합니다. 새 wrapper는 documentation/screen assembly입니다. Library Component owner가 아닙니다.
- Primitive·Semantic·Component Token 값과 Component master를 바꾸지 않은 screen assembly 수정입니다. 기존 published Library는 유지합니다. Library 발행 여부는 source UI에서 별도로 확인합니다.
- 점검과 실제 구현 근거: `work/v6/spacing-audit/`. 모든 variant와 실제 wallet runtime의 완전 검증을 뜻하지 않습니다.
