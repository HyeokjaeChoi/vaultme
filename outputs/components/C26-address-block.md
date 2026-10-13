# C26 Address block

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4723) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-197) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**주소의 역할을 label로 설명하고, 전체 문자열로 검토·복사합니다.**

## Anatomy

Address label → Compact 또는 Full address → copy action/feedback. Compact는 목록용입니다. Review/Detail은 Full입니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| Format=Compact/Full | `format` | `addressBlock.textStyle/value` |
| Address label TEXT | `label` | `Component가 없으면 Semantic typography.label/text.secondary` |
| Full address / Compact address TEXT | `address, displayAddress` | `addressBlock.value/textStyle` |
| Copy slot·spacing | `onCopy` | `addressBlock.copyTarget/gap/helperStyle` |

`Address label`, `Full address`, `Compact address`는 builder가 노출하는 TEXT 이름입니다. ID suffix는 현재 source definition을 읽습니다. Copy feedback은 이 family의 TEXT property로 확인된 것이 아닙니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Format은 표시 방식입니다. Copy는 언제나 원래 full address를 대상으로 합니다. Copied/Copy failed는 public Format Variant가 아니므로 consumer feedback으로 전달합니다. Address 변경 뒤 이전 feedback을 새 주소에 적용하지 않습니다.

## Keyboard와 a11y 책임

구현자는 full string 선택·LTR 순서·44 px copy target을 제공합니다. Consumer는 주소 역할·전체 값·clipboard 결과와 status announcement를 제공합니다. Compact label의 줄임표는 copy 값에 들어가지 않습니다. Button의 accessible name에 Recipient/Spender 등의 역할을 명시합니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<p>Recipient</p>
<p dir="ltr">0x3333333333333333333333333333333333333333</p>
<button type="button" aria-label="Copy recipient address">Copy address</button>
```

**Do:** 주소를 자연스럽게 줄바꿈합니다. Hash는 전체 raw string을 detail에서 별도 표시합니다.

**Don't:** Full review에 Compact를 쓰지 않습니다. Address block을 validation·소유권 인증으로 사용하지 않습니다.

## 성숙도와 증거

[Wallet builder](../../work/v2/figma-wallet.js)의 2 Format과 [Receive recipe](C11-receive-address.md)가 기준입니다. Copy 실행 성공은 실제 clipboard evidence가 필요합니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
