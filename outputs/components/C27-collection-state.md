# C27 Collection state

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4746) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-219) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**Loading·Empty·Unavailable을 구분하며 목록 맥락을 보존합니다.**

## Anatomy

Loading: title + 같은 row footprint의 skeleton. Empty: title + 이유 + Receive assets. Unavailable: title + 오래됐을 수 있는 balance 안내 + Try again.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Loading/Empty/Unavailable | `state` | `skeleton.bg/rowMinHeight/gap/radius 또는 emptyState.title/body` |
| Fixed title/reason slots | `derived copy` | `emptyState.titleStyle/bodyStyle` |
| Empty/Unavailable nested C01 | `onReceive, onRetry` | `C01 secondary tokens` |
| Collection body | `layout` | `emptyState.padding; list min-height는 해당 row family` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Loading 결과로 실제 empty가 확인되면 Empty입니다. 실패하면 Unavailable입니다. Unavailable을 Empty로 바꾸지 않습니다. Retry 중 Loading으로 전이하고 응답 근거로 다음 상태를 정합니다. Offline에서도 기존 balance를 0으로 만들지 않습니다.

## Keyboard와 a11y 책임

구현자는 Loading text·decorative skeleton 숨김·content footprint를 제공합니다. Consumer는 fetch state·stale data·retry handler를 제공합니다. Loading container의 aria-busy는 실제 요청과 맞춥니다. 완료 시 host의 polite status가 결과를 전달합니다. Skeleton은 keyboard target이 아닙니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<section aria-busy="true" aria-labelledby="loading-title">
  <h2 id="loading-title">Loading balances</h2>
  <div aria-hidden="true">Skeleton rows</div>
</section>
```

**Do:** Empty와 network failure의 이유·다음 행동을 나눕니다. Reduced motion에서는 shimmer 없이 static skeleton을 사용합니다.

**Don't:** Unavailable을 No assets yet로 표시하지 않습니다. 실제로 구현하지 않은 Receive 기능을 완료로 선언하지 않습니다.

## 성숙도와 증거

[Wallet builder](../../work/v2/figma-wallet.js)는 3 State를 조합합니다. Network fetch·retry·loading announcement는 consumer runtime의 별도 검증입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
