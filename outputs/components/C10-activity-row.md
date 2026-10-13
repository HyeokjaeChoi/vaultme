# C10 Activity row

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4567) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=36-48) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**과거 행동의 상대방·수량·결과를 비교합니다. 가격 손익과 자산 이동을 구분합니다.**

## Anatomy

Action icon → title + compact counterparty → exact amount/unit → time → fixed result icon/label. Full counterparty와 hash는 detail에 표시합니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Pending/Confirmed/Failed/Unknown | `transactionState` | `activityRow.pending/confirmed/failed/unknown` |
| State-prefix Name / Detail / Value TEXT slots | `action, counterparty, amount` | `activityRow.title/amount/meta, titleStyle/amountStyle/metaStyle` |
| Time·fixed result slots | `observedAt, stateReason` | `activityRow.meta; body typography` |
| Flat row layout | `layout` | `activityRow.minHeight, list.gap/radius/bg.hover/bg.selected/focusColor, borderWidth` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

관찰된 Pending → Confirmed 또는 Failed입니다. Unknown은 원거래 조회로 확인합니다. Activity row를 눌러도 거래를 다시 제출하지 않습니다. 이전 code의 합성 result 변화는 실제 chain event가 아닙니다.

## Keyboard와 a11y 책임

구현자는 가시 title·amount·status를 accessible name/description으로 연결합니다. Consumer는 실제 action 종류·counterparty·time·result·detail 경로를 제공합니다. Enter/Space는 button detail, Enter는 link 이동을 따릅니다. 읽기만 하는 row는 Tab stop이 아닙니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<button type="button" aria-labelledby="activity-title" aria-describedby="activity-data">
  <span id="activity-title">Sent ETH</span>
  <span id="activity-data">−0.042 ETH · Pending · Waiting for confirmation</span>
</button>
```

**Do:** min-height 80 px 이후 내용 높이를 늘립니다. 실패·unknown에서도 amount와 이유를 유지합니다.

**Don't:** 송금의 −를 가격 loss로 해석하지 않습니다. Approval/Revoke를 Sent tokens로 표시하지 않습니다.

## 성숙도와 증거

[Wallet builder](../../work/v2/figma-wallet.js)는 state별 fixture와 label을 조합합니다. [Action result recipe](C28-result.md)의 action 의미를 적용합니다. 현재 result copy 검증은 release를 따릅니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
