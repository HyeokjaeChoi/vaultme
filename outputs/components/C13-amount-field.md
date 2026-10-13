# C13 Amount field

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4806) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=40-28) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**자산 수량을 입력하고 자산 잔액과 native fee 부족을 따로 설명합니다.**

## Anatomy

Amount label → decimal input + asset unit → available asset balance → native fee reserve → actionable error. Outer wrapper가 focus/invalid를 담당합니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Ready/Insufficient asset/Insufficient fee | `state` | `amountField.border.default/error, error` |
| Amount / Token amount TEXT | `amount, asset` | `amountField.value, valueStyle` |
| Fixed balance/error slots | `assetBalance, feeBalance, error` | `amountField.balance/error, bodyStyle` |
| Wrapper and inner input | `invalid` | `amountField.padding/radius/borderWidth/innerBorderWidth` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

입력 변경마다 consumer validation을 계산합니다. Amount exceeds balance는 Insufficient asset입니다. USDC 잔액이 충분해도 ETH fee가 부족하면 Insufficient fee입니다. Fee 미확인은 C14와 C24에서 별도로 차단합니다. Ready는 transaction confirmation이 아닙니다.

## Keyboard와 a11y 책임

구현자는 C03의 label/error 연결과 wrapper·input의 같은 invalid 값을 제공합니다. Consumer는 exact decimal 문자열·token decimals·balance·native fee 계산과 오류를 제공합니다. `Number` 반올림으로 잔액을 정하지 않습니다. 입력은 en-US Prototype 계약을 따릅니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<label for="amount">Amount in USDC</label>
<input id="amount" inputmode="decimal" value="150" aria-describedby="amount-help" />
<p id="amount-help">Add ETH to pay the network fee.</p>
```

**Do:** 0.000000000000000001 ETH와 큰 수량을 full precision으로 검토합니다. Unit·fee asset를 함께 읽게 합니다.

**Don't:** 다른 자산 수량을 단일 total로 더하지 않습니다. Error 표시를 input borderless 처리로 제거하지 않습니다.

## 성숙도와 증거

[Transfer builder](../../work/v2/figma-transfers.js)의 3 State와 [Locale 계약](../wallet-component-contracts.md#locale-계약)을 참조합니다. 실제 잔액·fee 계산은 consumer 구현 범위입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
