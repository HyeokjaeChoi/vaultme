# C08 Network selector

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4501) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=35-48) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**Network 이름과 사용 가능 상태를 확인하고 선택합니다.**

## Anatomy

NetworkIcon → Network name → Network detail → Active/Available/Unavailable 이유. Logo와 label을 함께 표시합니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Active/Available/Unavailable | `state` | `networkRow.bg.active/default/unavailable, warning, borderWidth.*` |
| Network name / Network detail TEXT | `name, detail` | `networkRow.name/detail, titleStyle/bodyStyle` |
| NetworkIcon additive swap | `identity` | `icon.network.size/fallbackFg` |
| Layout slots | `layout` | `networkRow.padding/radius` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Available → 선택 결과 확인 → Active입니다. Unavailable은 selection blocked입니다. Network change는 account·asset·recipient·fee 맥락의 재확인을 필요로 합니다. Specimen의 Ethereum은 구현된 지원망 선언이 아닙니다.

## Keyboard와 a11y 책임

구현자는 선택 marker·visible label·focus를 제공합니다. Consumer는 실제 network identity·chain ID·unavailable 이유·switch handler를 제공합니다. Single selection의 key model과 Dialog host 책임은 C07과 같습니다. Disabled 항목의 이유는 focus 없이도 읽을 수 있게 둡니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<button type="button" disabled aria-describedby="network-unavailable">Ethereum</button>
<p id="network-unavailable">Unavailable · Could not reach this network</p>
```

**Do:** 다른 network의 asset row에는 network label을 남깁니다. 긴 이유는 줄바꿈합니다.

**Don't:** 로고만으로 network를 선택하게 하지 않습니다. Failed switch를 Active로 표시하지 않습니다.

## 성숙도와 증거

[Wallet builder](../../work/v2/figma-wallet.js)와 [Icon identity builder](../../work/v2/figma-icons-identities.js)가 기준입니다. Switch 성공은 별도 runtime evidence입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
