# C06 Navigation

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4386) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-342) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**Assets·Activity·Settings 사이를 이동합니다. Marketing navigation은 별도 구성입니다.**

## Anatomy

Product: icon + visible label 3개 → active marker → keyboard focus. Marketing: VaultMe brand와 Product·Security·Learn links. 두 navigation의 token root를 구분합니다.

Product Navigation은 기존 neutral 면을 사용합니다. Blue A는 active marker·focus에 씁니다. C23의 Secondary tint를 Navigation 배경에 확대하지 않습니다.

## States

Active는 현재 route입니다. Focus는 keyboard 위치입니다. Focus를 옮겨도 route는 activation 전까지 바뀌지 않습니다. Mobile/Desktop은 presentation입니다. 새 목적지를 임의로 지원 기능으로 추가하지 않습니다.

## Tokens

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| Device=Mobile/Desktop | `device` | `productNavigation.height, bg/borderWidth` |
| Active=Assets/Activity/Settings | `activeRoute` | `productNavigation.active/default/focus, itemBorderWidth` |
| Product fixed icon/label slots | `destinations` | `productNavigation.labelStyle; icon.navigation.fg/activeFg` |
| C06.Marketing standalone component | `marketingLinks` | `navigation.bg/link.default/hover/active/focus, itemGap, height.desktop/mobile` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## Accessibility

구현자는 nav landmark, 각 link의 visible label·44 px target·focus를 제공합니다. Consumer는 실제 href/route와 현재 page의 aria-current="page"를 제공합니다. 일반 navigation에 tablist key model을 적용하지 않습니다.

## Usage

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<nav aria-label="Wallet">
  <a href="#assets" aria-current="page">Assets</a>
  <a href="#activity">Activity</a>
  <a href="#settings">Settings</a>
</nav>
```

**Do:** 현재 route와 focus를 각각 표시합니다. 좁은 폭과 200% text에서 label을 읽게 합니다.

**Don't:** Marketing Security link를 보안 인증으로 읽히게 만들지 않습니다. Active blue를 안전 상태로 쓰지 않습니다.

## Lifecycle와 Evidence

[Core builder](../../work/v2/figma-core.js)는 C06의 2 Device × 3 Active와 별도 C06.Marketing을 기록합니다. 실제 route·keyboard 검사는 consumer evidence입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
