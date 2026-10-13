# C23 Portfolio balance

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4702) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-180) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**Quote를 가진 자산의 fiat 추정 합계와 누락 범위를 표시합니다.**

## Anatomy

Valuation scope → fiat currency + estimate → quote coverage/time 순서입니다. 아래 token balances는 quote가 없어도 유지합니다. 큰 총액은 한 화면에 한 곳입니다.

Wallet Home의 대표 요약 한 곳에 넓고 낮은 Secondary tint를 사용합니다. Value·currency·estimate·coverage는 모두 Ink입니다. Passive balance는 클릭 가능한 card가 아닙니다. C04를 중첩하지 않습니다. Asset·Activity·Review는 흰색의 평평한 읽기 면입니다.

## States

| Quote | 표시할 내용 | Surface |
| --- | --- | --- |
| Complete | 현재 valuation 범위·통화·estimate·quote 시각 | 같은 Secondary tint + Ink |
| Partial | Priced assets·missing count·포함/누락 범위·시각 | 같은 Secondary tint + Ink |
| Unavailable | Value unavailable·이유. 실제 token balance는 유지 | 같은 Secondary tint + Ink |

Stale은 별도 public Variant가 아닙니다. Consumer는 오래된 quote의 시각·reason을 표시합니다. Complete 이름으로 freshness를 추정하지 않습니다. 배경색을 success·gain·safety로 바꾸지 않습니다.

## Tokens

| Native property 또는 slot | 제안 consumer prop | Component 역할 / Alias |
| --- | --- | --- |
| Quote=Complete/Partial/Unavailable | `quoteCoverage` | 같은 `portfolioBalance.bg={surface.portfolioSummary}` |
| Root fill | 내부 조립. 새 prop 아님 | `surface.portfolioSummary={surface.brandTint}` |
| Root padding | 내부 조립 | `portfolioBalance.padding={layout.screen.padding}` |
| Root radius | 내부 조립 | `portfolioBalance.radius={shape.group}` |
| Root border | 내부 조립 | `portfolioBalance.borderWidth={borderWidth.none}` |
| Balance TEXT, Unavailable fixed title | `valuation, currency` | `portfolioBalance.value={text.primary}`, 기존 `valueStyle` |
| Fixed coverage/time slots | `missingAssets, observedAt` | `portfolioBalance.note={text.primary}`, 기존 `bodyStyle` |
| Value and note grouping | `layout` | 기존 `portfolioBalance.gap` |

기존 `portfolioBalance.note`의 연결은 `text.secondary`에서 Ink의 `text.primary`로 변경합니다. 배경을 generic `card.bg.highlight`로 우회하지 않습니다. Shadow가 없습니다. 기존 Primitive를 재사용하며 raw 값을 넣지 않습니다.

Native master/set `68:180`과 Quote masters `68:168`, `68:172`, `68:176`을 유지합니다. `Quote`·`Balance` property의 이름과 ID를 유지합니다. TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 대응 이름이며 배포된 SDK API가 아닙니다.

## Accessibility

구현자는 valuation label·통화·estimate·coverage를 읽기 순서로 제공합니다. Consumer는 price source·time·누락 범위·합계 계산을 제공합니다. Display는 정확한 token balance를 fiat amount로 대체하지 않습니다. Passive balance는 Tab stop이 아닙니다.

Ink를 사용합니다. Blue A text는 Secondary surface에서 4.4967:1이며 일반 text의 4.5:1 기준에 미달합니다. 정적 대비는 keyboard·screen reader 결과를 대신하지 않습니다. 긴 금액과 200% text는 줄바꿈합니다. 높이를 늘리고 금액을 ellipsis로 자르지 않습니다. 인접 control은 44 px target과 visible focus를 유지합니다.

## Usage

아래는 synthetic slot 예제입니다. 실제 계산·가격 갱신은 consumer가 제공합니다.

```html
<section class="portfolio-summary" aria-labelledby="valuation-title">
  <h2 id="valuation-title">Priced assets</h2>
  <p>USD estimate: $6,273.81</p>
  <p>1 asset has no price</p>
</section>
```

이 구조의 배경·여백·모서리·border는 위 Component alias로 연결합니다. 예제에 가격 갱신 handler가 구현됐다는 뜻은 아닙니다.

**Do:** P01/P02와 P05의 배경 Home에 같은 요약을 사용합니다. 세 Quote와 320 px·긴 값·200% text를 확인합니다. Partial의 누락 설명을 총액과 함께 읽게 합니다.

**Don't:** Missing quote를 zero balance로 표시하지 않습니다. Complete quote를 자산·가격 정확성 보증으로 부르지 않습니다. Settings·Review마다 tint hero를 반복하지 않습니다.

## Lifecycle와 Evidence

Preview usage contract입니다. [Wallet builder](../../work/v2/figma-wallet.js)의 세 Quote가 기존 구조의 기준입니다. 합계·시가 계산은 consumer 책임입니다. [Surface 계획](../../work/research-v4/fintech-surface/vaultme-surface-enhancement-plan.md)은 승인된 설계 범위입니다.

새 surface alias의 명세와 이 문서의 존재는 Native 적용·Library publication·consumer adoption 증거가 아닙니다. 이번 변경의 source review·실제 binding·publication·독립 consumer update와 override retention은 각각 증거를 기록합니다. [Current release](../vaultme-release.json)에서 확인한 범위만 완료로 인정합니다. 과거 Button/Input web proof나 세 Figma linked specimen proof를 C23 검증으로 확대하지 않습니다.

### 이번 Surface의 확인 범위

[Native review](../../work/v4/verification/native/native-review-proof.json)에서 세 Quote의 tint·Ink binding, 기존 set/master/property IDs와 PNG를 확인했습니다. P01/P02·P05 배경 Home·Partial/Unavailable·긴 값·좁은 폭도 review했습니다.

[Web observation](../../work/v4/verification/web/browser-observation.json)은 375/390/768/1440 px C23 overflow 없음과 explicit text200 Partial 줄바꿈을 기록합니다. 독립 web consumer는 세 Quote·longBalance override·320 px overflow 없음·기존 form feedback을 확인했습니다. Text200은 browser zoom이 아닙니다. Manual screen reader·실제 price 계산은 검증하지 않았습니다.

[Publication proof](../../work/v4/verification/native/publication-proof.json)에서 C23 Library 발행을 확인했습니다. [Figma consumer proof](../../work/v4/verification/native/consumer-surface-proof.json)는 새 remote Complete/Partial/Unavailable과 longBalance의 발행 후 채택을 기록합니다. Long Balance는 새 instance의 TEXT override입니다. C23를 Library update한 전후의 override 보존 증거는 아닙니다. 기존 Button/Input/Transaction panel 세 remote specimen의 update/override 보존은 별도로 확인했습니다.

[Web consumer proof](../../work/v4/verification/web/consumer-web-proof.json)는 세 Quote·긴 balance·기존 form과 합성 preview overlay의 제한된 browser 범위입니다. Fill/foreground override·manual screen reader·실제 wallet는 이 proof에 포함되지 않습니다. Package 완료는 별도 확인합니다.
