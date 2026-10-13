# C09 Asset row

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: Figma family와 웹 합성 Prototype의 적용 recipe

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4522) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=36-20) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**잔액과 quote 상태를 같은 정보 경로로 전달합니다.**

## Anatomy

Identity → name/symbol/network → token balance → fiat quote/status → accessory. Name·수량·quote 상태는 필수입니다. Identity는 decorative이며 실제 이름을 글자로 표시합니다.

## Figma → code → token

| Figma property/slot | 제안 code prop | Token 역할 |
| --- | --- | --- |
| `Quote=Available/Unavailable/Stale` | `quoteState` | `assetRow.fiat/missingQuote` |
| `Asset name·Balance·Fiat quote TEXT` | `name, balance, quote` | `assetRow.name/balance, nameStyle/balanceStyle/metaStyle` |
| `AssetIcon additive swap` | `identity` | `icon.asset.size/fallbackFg` |
| `Selected/Focused specimen` | `selected, focus` | `assetRow.list.bg.selected/focusColor, minHeight, list.gap, borderWidth` |

Component token을 먼저 사용합니다. 없는 역할만 Semantic을 사용합니다. Native에 없는 prop·state를 source에 이미 있는 것으로 추정하지 않습니다.

## 상태와 전이

Available → Stale이면 갱신 시각을 표시합니다. Unavailable에도 token balance는 유지합니다. Selection과 quote 상태는 독립입니다. Fiat 0으로 fallback하지 않습니다.

## Keyboard와 a11y 책임

Native button 또는 link를 실제 행동에 맞게 선택합니다. 이름에는 가시 자산명을 연결합니다. 설명에는 token 수량·단위·fiat quote 또는 unavailable/stale을 연결합니다. Consumer가 stable ID와 action handler를 제공합니다. Icon은 aria-hidden입니다.

## 예제와 Do / Don't

아래는 synthetic 조합 예제입니다. 일부 필수 context는 host에서 함께 표시해야 합니다. 이 단편만으로 전체 review를 완료하지 않습니다.

```html
<button type="button" aria-labelledby="eth-name" aria-describedby="eth-balance eth-quote">
  <span id="eth-name">Ethereum</span>
  <span id="eth-balance">1.284732 ETH</span>
  <span id="eth-quote">Price unavailable</span>
</button>
```

**Do:** 작은 수량과 큰 수량을 그대로 읽게 합니다. 320 px에서는 value 영역을 다음 줄로 보냅니다.

**Don't:** 행 전체 aria-label에 이름만 넣어 수량과 quote 상태를 숨기지 않습니다.

## 성숙도와 증거

이 문서는 consumer 구현 계약입니다. 아래 code prop 이름은 대응 제안이며 배포된 SDK API가 아닙니다. Figma property는 기존 source 정의를 기준으로 읽습니다. 개별 TEXT property의 ID suffix는 현재 `componentPropertyDefinitions`로 확인합니다. Property가 노출되지 않은 slot은 native 설명 또는 별도 조합으로 취급합니다.

현재 값은 [token source](../wallet-foundation.tokens.json), Figma ID·Variant는 [native ledger](../../work/figma-state.json), web specimen은 [Review](../vaultme-v2-review/index.html)를 참조합니다. 최신 검사와 source hash는 release record를 따릅니다. 문서만으로 browser·manual screen reader·독립 consumer 채택을 pass 처리하지 않습니다.

320 px, 긴 값, 200% text, no motion을 적용 대상에서 확인합니다. 기본 정보 container는 Borderless입니다. Focus ring과 44 px target을 보존합니다. 금액과 전체 주소를 자르지 않습니다.
