# VaultMe Figma 문서 구성

상태: 현행 구성 규범 · 문서 갱신: 2026-10-04  
범위: 기존 native source의 설명·탐색·Component guidance

[문서 홈](README.md) · [Component 목록](components/README.md) · [현재 release](vaultme-release.json)

**같은 family를 목적 → 구조 → 사용 → 상태 → 예제로 읽게 합니다.**

## 보존할 source

[Figma 원본](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8), existing page, master, Variant ID를 보존합니다. 읽기 순서를 정리하려고 master를 삭제·재생성하거나 파일을 복제하지 않습니다. Native 문서 설명은 local recipe 링크를 가리킵니다. 현재 적용 결과는 release record로 확인합니다.

## Overview에서 시작하기

[Overview `5:2`](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)는 시작 안내입니다. 디자인 규칙 → [C01 Button 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-3939) → [C03 Input 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4281) → [C15 Transaction panel 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4863) 순서로 읽습니다. Component의 상세 계약은 [Family 목록](components/README.md)에 둡니다.

Overview의 읽는 순서는 **범위 → 처음 시작하기 → 대표 Component → 역할별 시작점 → 파일 지도 → 현재 상태와 변경**입니다. 대표 예제는 C01·C03·C09·C15입니다. 기존 master에 연결된 instance를 사용하고 `예제 · 합성 데이터` caption을 둡니다. C15의 전체 주소·fee·상태를 축소나 crop으로 숨기지 않습니다.

## 파일 지도

2026-10-17 재정리 기준입니다. 모든 node ID는 유지했고 master·Variable·Style은 건드리지 않았습니다. 이동 기록은 `work/v8/figma-reorg-map.json`에 있습니다. 링크 형식은 `https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=<id>`입니다.

| 영역 | page (ID) | 내용 |
| --- | --- | --- |
| Overview | 00 Overview (`0:1`) | 시작 안내. 지도 갱신은 데스크톱에서 별도 |
| Foundations | Foundations · Color (`487:76`) | Primitive ramp, Palette anchors, Blue A, Semantic roles Light/Dark, Semantic palette, Component aliases · Redesign B, 기존 Component aliases |
| | Foundations · Typography (`488:605`) | Product B type scale(tnum 안내), Product typography, Preserved typography, Numbers and addresses |
| | Foundations · Spacing & Layout (`488:1254`) | Product B spacing scale, size/pill_*, Product spacing, Layout and review width |
| | Foundations · Radius, Elevation & Opacity (`488:1294`) | Radius, Elevation, Opacity, Shape and elevation |
| | 09 Icons (`137:2`) | Functional icon과 asset identity |
| Components | 02 Components (`4:19`), 03 Transaction pattern (`4:20`), 04 Wallet building blocks (`31:2`), 05 Transfer & signing (`31:3`), 06 Security & permissions (`43:34`) | 기존 master 위치 유지 |
| | Components · Redesign B (`398:76`) | B Foundation section `398:77`(master)와 Dark check `399:176`. 화면은 Flow page로 이동 |
| Flows · Redesign B | Flow 1 · Onboarding & wallet setup (`485:76`) | S01–S06, S31. Light `485:77` · Dark `485:78` |
| | Flow 2 · Home & balance (`486:76`) | S10(+test mode), S11, S50. `486:77` · `486:78` |
| | Flow 3 · Send & receive (`486:17419`) | S20–S24 위험·오류 상태, S30. `486:17420` · `486:17421` |
| | Flow 4 · Activity (`486:17436`) | S40, S41. `486:17437` · `486:17438` |
| | Flow 5 · Security & settings (`486:17443`) | S60–S63, S90–S92. `486:17444` · `486:17445` |
| Archive | Archive · 01 Foundations (`4:18`), 07 Product specimens (`69:2`), 08 States & stress (`76:1047`), 10 Wireframes (`294:76`), 11 Prototype (`306:76`), 12 Text 200% (`315:2575`), 13 Redesign A (`332:76`) | 내용은 이동하지 않고 이름만 변경 |

page 순서는 `———` 구분 page(`488:1401`–`488:1404`)로 나눕니다. Flow page는 행마다 S-id와 이름 label을 두고 Light/Dark를 같은 행 순서로 둡니다. Dark 짝이 없는 상태(S22 오류, S40 일부, S41 일부, S23 test mode)는 빈 칸입니다. 비어 있는 옛 section `404:162`, `423:642`, `423:13439`, `430:14605`는 ID 보존을 위해 Components · Redesign B에 남깁니다.

## Figma 링크와 Workspace 경로

Figma 이동 text에는 실제 hyperlink를 설정합니다. 표시 이름과 `node-id` 목적지를 readback으로 확인합니다. UI에서 연 경로와 URL만 읽은 경로는 증거에서 구분합니다.

Local reader는 `outputs/foundation/index.html`입니다. Figma에는 `Workspace 문서: outputs/foundation/index.html`로 표시합니다. 공개 배포 URL이 없으므로 로컬 경로를 웹 링크처럼 쓰지 않습니다. 임시 localhost 주소를 영구 링크로 남기지 않습니다.

Assets에서는 실제 Component 이름을 검색합니다. 검색 입력처럼 보이는 정적 장식은 만들지 않습니다. Portal의 **문서 찾기**는 문서 제목을 검색합니다.

## Family 보드의 순서

첫 부분에 `Cxx · 이름`, 고를 때 한 문장, 기존 master의 대표 instance를 둡니다. 아래 순서로 상세 안내를 읽게 합니다. 마지막에는 recipe의 Workspace 경로, 실제 master 링크, Overview로 돌아가는 링크를 둡니다. Family 분류는 [Component 목록](components/README.md)과 같습니다.

| Section label | 담을 내용 |
| --- | --- |
| `Purpose` | 언제 쓰는지, 다른 action과 어떻게 구분하는지 |
| `Anatomy` | 번호가 있는 slot·label·필수 데이터 |
| `Usage` | Figma prop → code prop → Component token 대응 |
| `States` | 실제 문구가 다른 지원 상태와 전이 |
| `Examples` | 기본, 긴 값, 좁은 폭, 200% text, no motion |
| `Evidence` | 문서 성숙도, source snapshot, 검사 링크, 미확인 책임 |

설명 보드는 product frame 밖에 둡니다. Wallet review에는 account, network, asset, 전체 상대 주소, amount/allowance, estimated fee, status를 유지합니다.

## Naming

`C01 Button`, `C03 Input`, `C15 Transaction panel`처럼 ID와 기존 family 이름을 함께 씁니다. Heading의 목적과 native master의 stable name을 구분합니다. 기존 property를 문서 표제에 맞추려고 임의 변경하지 않습니다.

State axis는 `State`, scope는 `Scope`, layout은 `Layout`, quote는 `Quote`를 유지합니다. 기존 `State=Unable to verify`, `Scope=Unlimited` 같은 label은 그대로 사용합니다. C21의 Scope와 Layout은 별도 축입니다.

User-editable TEXT에는 데이터 이름을 씁니다. State copy는 Variant에 고정합니다. Editable label과 state meaning을 같은 property로 묶지 않습니다. Icon property는 additive이며 기존 계약을 보존합니다.

## 시각 구성

큰 제목 하나와 짧은 설명을 먼저 둡니다. Anatomy의 번호를 usage 표에 다시 씁니다. 긴 표보다 목적이 분명한 작은 section을 사용합니다. Borderless와 기존 spacing을 따릅니다. 설명 보드에 장식 border·shadow를 반복하지 않습니다.

금액과 주소는 자르지 않습니다. Native frame 캡처와 실제 편집 화면을 함께 확인합니다. Figma geometry는 browser keyboard나 screen reader 검증을 대신하지 않습니다. INSTANCE_SWAP 후 contextual Component foreground를 다시 bind합니다.

## 완료 기록

Guidance 작성은 native 적용 완료가 아닙니다. 보드별 readback, 영향을 받은 frame, property·binding 검사와 publication 증거를 release에 연결합니다. Consumer subscription은 별도 파일에서 확인합니다.

## 문서와 상태의 원천

Markdown은 사용 안내의 원천입니다. `work/v2/build_docs_portal.mjs`로 reader를 다시 만듭니다. 생성 HTML을 직접 수정하지 않습니다. Native 안내의 generator도 같은 문구를 사용해야 합니다. 문서 편집만으로 native 반영이나 Library 발행을 완료 처리하지 않습니다.

Overview에는 Variable·Library asset 수와 digest를 반복하지 않습니다. 현재 상태는 [release record](vaultme-release.json), compatibility는 [migration](vaultme-v2-migration.md), 과거 변경은 [변경 이력](vaultme-v2-change-log.md)에 둡니다. 과거 publication과 consumer 증거는 해당 날짜와 범위를 유지합니다.
