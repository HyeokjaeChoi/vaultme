# C22 Product header

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4679) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-167) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**현재 account와 network를 화면 위에서 읽게 합니다.**

## Anatomy

Account identity/name → network identity/name → account detail control. Mobile/Desktop 높이는 presentation입니다. Detail control target은 최소 44 px입니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| Device=Mobile/Desktop | `device` | `productHeader.height.mobile/desktop` |
| Account / Network TEXT | `account, network` | `productHeader.titleStyle/bodyStyle` |
| NetworkIcon additive swap | `networkIdentity` | `icon.network.size/fallbackFg` |
| Detail control + container | `onDetails` | `iconButton.hitTarget/iconSize; productHeader.bg/padding/borderWidth` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Device 변경은 맥락을 바꾸지 않습니다. Account/network 선택 결과가 바뀌면 header와 아래 balance·fee·review를 함께 갱신합니다. Header 자체에 별도 Pending wallet 상태를 만들지 않습니다.

## Keyboard와 a11y 책임

구현자는 header의 context text와 detail button accessible name·focus를 제공합니다. Consumer는 current account/network와 picker/detail handler를 제공합니다. Detail을 닫으면 trigger로 focus를 복원합니다. Review 내부의 full context를 header만으로 대체하지 않습니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<header><p>Everyday · Ethereum</p>
  <button type="button" aria-label="Account details for Everyday">Details</button>
</header>
```

**Do:** 긴 account name을 잘라 전체 맥락을 잃지 않게 합니다. Other network identity를 label로 함께 표시합니다.

**Don't:** dots icon을 account authentication으로 해석하지 않습니다. Fixed header가 warning·full address를 가리지 않게 합니다.

## 성숙도와 증거

[Wallet builder](../../work/v2/figma-wallet.js)와 identity builder가 기준입니다. 실제 account selection/focus restore는 browser evidence로 확인합니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
