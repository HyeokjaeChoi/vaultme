# VaultMe 변경 이력

상태: 과거 snapshot 기록 · 문서 갱신: 2026-10-04  
범위: v1 → v2 → Borderless + Blue A → Icons의 결정과 당시 증거

[문서 홈](README.md) · [현재 release](vaultme-release.json) · [Migration](vaultme-v2-migration.md)

**이 문서의 수치와 hash는 해당 날짜의 이력입니다.** 현재 완료 상태는 release record를 따릅니다. 이전 증거의 pass를 수정된 코드 전체에 적용하지 않습니다.

## 2026-09-26 · 초기 Foundation

Primitive → Semantic → Component, image의 Light 방향, Inter·IBM Plex Mono를 기반으로 만들었습니다. 초기 Draft는 이후 Project 이동과 publication 전의 상태입니다. 기존 Draft 기록을 현행 사용 명령으로 읽지 않습니다.

## 2026-10-03 · v2 구조와 wallet 상태

C01–C28과 P01–P12, lifecycle 5개, stress 21변형을 native source에 조립한 기록이 있습니다. P01–P12는 master INSTANCE 조립입니다. C21은 Scope와 Layout 두 축을 사용합니다. 기존 Limited/Unlimited master는 Mobile로 보존했습니다.

| 당시 snapshot | 기록 | 근거 |
| --- | --- | --- |
| Blue A 전 token | Primitive 200 / Semantic 98 / Component 414 = 712 | [Native inventory](../work/v2/verification/native-final-inventory.json) |
| Blue A 전 native | managed 608 + legacy easing STRING 3 = 611 | 같은 inventory |
| 조립·stress 캡처 | 27 PNG, node와 hash 연결 | [Capture manifest](../work/v2/verification/native-screenshot-manifest.json) |
| Text stress 예외 | T02의 22 TEXT가 직접 200% font-size override | [독립 검토](../work/v2/verification/independent-audit.md) |

금액·전체 주소의 가독성, missing quote, stale fee, unlimited meaning, unknown 결과를 구체화했습니다. `transactionPanel.safe.*`는 neutral check 결과를 가리키는 deprecated alias입니다. [Migration](vaultme-v2-migration.md)에 소비 변경을 보존합니다.

## 2026-10-03 · Project와 최초 Library

Owner 승인으로 같은 팀 `1682045324479940459`의 `Design Systems` Project `664722092`에 원본 파일을 이동했습니다. Source file key와 IDs를 보존했습니다. Team default는 View and comment, owner는 Admin으로 기록됐습니다.

최초 publication snapshot은 **60 assets**입니다. Collection 3, style 26, Component Set 31입니다. 당시 Variable member는 611입니다. [당시 공개 UI](../work/v2/verification/library-published.jpg)와 [최종 promotion 기록](../work/v2/verification/library-promotion-final.json)을 참조합니다.

공개 전 참조 없는 legacy TEXT property 33개를 13 Set에서 제거했습니다. Master IDs와 Variant axes는 유지됐습니다. [Metadata 정리](../work/v2/verification/library-assets-fix.json)를 참조합니다.

## 2026-10-03 · Paint fallback 수정

밝은 Variable alias를 가진 일부 문서 보드와 Marketing Navigation의 기본 Paint RGB가 검정으로 남았습니다. Export와 실제 편집 화면이 달랐습니다. `VM.paint`는 token을 해석한 fallback RGB를 만든 뒤 같은 alias를 연결하도록 수정됐습니다. Token 값·경로·node ID는 유지했습니다. [수정 기록](../work/v2/verification/black-background-fix.json)을 참조합니다.

이 이력 이후 시각 검사에서는 export와 실제 편집 화면을 함께 확인합니다.

## 2026-10-03 · Borderless + Blue A

Owner가 Borderless와 Blue A action-brand 확장을 승인했습니다. Primary default/hover/pressed는 `#3152FF` / `#2944DB` / `#2138B8`이며 foreground는 white입니다. Secondary `#DCE8FD`에는 Ink를 씁니다. Blue A는 이미지 추출값이 아닙니다. [색상 연구](../work/research-v2/color/research.md), [비교 보드](../work/research-v2/color/palette-board.html), [Border 결정](../work/research-v2/borders/recommendation.md)을 참조합니다.

당시 token snapshot은 **762 tokens**입니다. Primitive 203 / Semantic 101 / Component 458입니다. Width 43, Component 색 alias 1, Primitive 색 3, Semantic 역할 3을 추가했습니다. 기존 path 삭제는 0으로 기록됐습니다. Digest는 `4144b4bee63be417c8f0d6b3d697835656e613fc148e3738e9e55241c840e980`입니다. [로컬 기록](../work/v2/verification/borderless-local.json)을 참조합니다.

당시 native는 managed 658 + legacy 3 = 661입니다. Paint mismatch 0과 기존 master/variant ID 보존이 기록됐습니다. [Native 기록](../work/v2/verification/border-blue-native.json)을 참조합니다.

## 2026-10-03 · Icons 통합 publication

Phosphor regular 기능 23개와 ETH·USDC identity 2개를 사용했습니다. Semantic 1개와 Component 20개 alias를 추가했습니다. Primitive raw color 추가와 기존 path 삭제는 0입니다. [선택 연구](../work/research-v2/icons/research.md), [로컬 기록](../work/v2/verification/icons-local.json)을 참조합니다.

당시 token snapshot은 **783 tokens**입니다. Primitive 203 / Semantic 102 / Component 478입니다. Digest는 `a9ea852b1ae5f6e39ac9ef74ada67aa6f3bbd49940f4d9412f834b177b4e7d6c`입니다. Native는 managed 679 + legacy easing 3 = **682 Variables**, page **10개**입니다. `09 Icons` page `137:2`, board `137:3`이 추가됐습니다. [Native 기록](../work/v2/verification/icons-native.json)을 참조합니다.

통합 publication snapshot은 **85 assets**입니다. Collection 3 + style 26 + component entries 56입니다. Component entries는 기존 Set 31과 standalone Icons 25입니다. 당시 UI의 `No changes`, `Unchanged (85)`, 비활성 Publish와 Invalid assets 0을 기록했습니다. [공개 UI](../work/v2/verification/library-icons-published.jpg), [통합 publication 기록](../work/v2/verification/library-icons-release.json)을 참조합니다.

INSTANCE_SWAP 후 contextual foreground를 다시 bind하는 규칙을 추가했습니다. Primary에는 `icon.action.onPrimary`를 사용합니다. [Icons 안내](wallet-icon-guide.md)를 따릅니다.

## 과거 검증을 읽는 범위

| 증거 | 인정할 범위 |
| --- | --- |
| [독립 검토](../work/v2/verification/independent-audit.md) | 당시 확인한 token·수정·native 구조와 캡처 |
| [Review handoff](../work/v2/verification/review-handoff.md) | 당시 synthetic Prototype 전달 범위 |
| [Review 확인](../work/v2/verification/review-final-confirmation.json) | 특정 합성 상태의 관측 |
| [Icons browser](../work/v2/verification/icons-runtime.json) | 당시 390 px Assets/Send Review와 Catalog의 제한된 관측 |
| [2026-10-04 Production audit](../work/research-v3/production-audit/report.md) | 실행을 하지 않은 정적 감사와 별도 native metadata 읽기 |

과거 package의 309 entries/307 source와 후속 432 source 기록은 서로 다른 묶음입니다. 현재 ZIP 완료 여부와 정확한 hash는 [release record](vaultme-release.json)와 [manifest](vaultme-v2-package-manifest.json)를 따릅니다. 문서의 “재생성 대기” 문구를 현재 package 상태로 유지하지 않습니다.

## 2026-10-04 · 문서 역할 정리

기존 8개 파일명을 보존했습니다. 각 문서에서 반복된 publication closure를 제거했습니다. 현재 수치·digest는 release record, 과거 수치는 이 문서로 분리했습니다. 문서 홈과 Component recipe, Figma organization을 추가했습니다. Locale를 `en-US` 합성 Prototype로 명시했습니다.

문서 정리는 consumer adoption, 새 Library publication, browser 또는 screen reader pass를 뜻하지 않습니다. 실제 수정 결과는 [실행 계획](../work/research-v3/production-audit/execution-plan.md)과 release에 연결된 증거를 따릅니다.


## 2026-10-04 · 전체 Family 문서와 additive property 대응

C01–C28 전체 family에 파일별 recipe를 작성했습니다. 그룹별 index에 선택 기준과 조합 경로를 연결했습니다. Dialog/drawer는 기존 family를 담는 host 계약으로 설명했습니다. 별도 C29를 만들지 않았습니다.

[Core native readback](../work/v2/verification/production-native-repair-core.json)의 Input HelperText·ErrorText와 Icon button Icon swap을 사용법에 반영했습니다. [Lifecycle readback](../work/v2/verification/production-native-repair-lifecycle.json)의 C28 Action × State와 기존 Send ID 보존을 반영했습니다. 이는 source 계약의 적용 이력입니다. 실제 wallet action·browser·manual screen reader·consumer 성공으로 확대하지 않습니다.

## 2026-10-04 · Production repair와 파일 구성

문서 홈, 역할별 읽는 순서, 파일 지도와 C01–C28 전체 usage recipe를 추가했습니다. Current 상태는 release record에서 읽습니다. Markdown source에서 정적 Foundation reader를 생성합니다. Reader는 검색·목차·원본 download를 제공합니다.

Asset row accessible description, Input/recipient typography와 padding 역할, final financial action icon, action별 실패 문구를 수정했습니다. `en-US` 합성 Prototype와 German/Korean stress 예제를 구분했습니다. Token 경로·type·값·alias는 유지했습니다. Description metadata 추가로 source byte digest가 바뀌었습니다.

같은 native source에서 Input HelperText/ErrorText와 Icon button Icon property를 추가했습니다. C28은 기존 Send ID를 유지하면서 Action × State 20개 조합으로 확장했습니다. [Native proof](../work/v2/verification/current-native-proof.json)와 [Publication proof](../work/v2/verification/current-publication-proof.json)를 보존했습니다.

독립 [Figma consumer](https://www.figma.com/design/lI4gGcTr9UVPEvVEODcf6U)는 구독·update·override 보존을 확인했습니다. [Web consumer](vaultme-consumer-example/index.html)는 Button/Input token 소비·keyboard·focus를 확인했습니다. 전체 family runtime, manual screen reader, 실제 wallet은 검증 범위가 아닙니다.

Release pipeline은 검증 전에 성공 flag를 쓰지 않습니다. Consumer/Audit/Prototype package를 구분하고 immutable manifest·byte 검증 후 current pointer를 갱신합니다. 실제 package 상태와 digest는 [release record](vaultme-release.json)를 확인합니다.

현재 native owner-level inventory는 30 sets와 26 standalone Components입니다. 기존 56 asset의 ID/key가 보존됐습니다. 과거 snapshot의 31/25 수치와 현재 집계 방법을 구분합니다.

## 2026-10-04 · Overview와 C01–C28 탐색 정리

Overview `5:2`를 처음 시작하기 → 실제 Component 예제 → 역할별 시작점 → 10-page 파일 지도 → 현재 상태 순서로 정리했습니다. C01/C03/C09/C15는 기존 master의 INSTANCE입니다. 오래된 자산 수와 digest를 Overview에서 제거했습니다.

C01–C28 안내에 Purpose, Anatomy, Usage, States, Examples, Evidence와 실제 master 링크를 추가했습니다. 전체 주소, 금액, estimated fee, check의 한계를 유지했습니다. C01은 Primary/Secondary/Ghost, C06은 Product/Marketing, C21은 Scope/Layout, C28은 Action/State를 구분합니다. 기존 Variant matrix를 재구축하지 않았습니다.

편집한 네 catalog의 Component owner 31개는 전후 fingerprint·property·Variant가 일치합니다. Variable 682개와 Style 26개도 일치합니다. Icons page의 별도 subtree 비교는 이번 범위가 아닙니다. [Native 결과](../work/v2/verification/overview-native-summary.json)와 [통합 검증](../work/v2/verification/overview-guidance-integration.json)을 참조합니다.

문서 Portal과 recipe 28개의 Figma 안내·master·Overview 링크를 같은 map으로 연결했습니다. 문서 제목 검색과 C15 문서 이동을 브라우저에서 확인했습니다. 목차의 apostrophe 중복 escaping을 수정하고 기존 anchor ID를 보존했습니다.

기존 documentation generator의 Overview 분기는 안정된 ID를 갱신하는 helper로 연결됩니다. 이전 보드를 지우는 경로를 먼저 실행하지 않습니다. [Generator 근거](../work/v2/verification/overview-native-generator-proof.json)를 참조합니다.

이번 변경은 native 문서 편집입니다. 새 Library publication과 독립 consumer 재검증은 수행하지 않았습니다. MCP 링크 목적지는 확인했지만, Figma 데스크탑 재확인 요청은 자동 승인 검토에서 보안 상태를 판단하지 못해 차단됐습니다. 데스크탑의 직접 클릭과 동기화는 미확인입니다. 과거 publication·consumer proof의 날짜와 release ID는 유지합니다. 새 문서 패키지의 최종 byte 검증 결과는 [현재 release](vaultme-release.json)에서 확인합니다.
