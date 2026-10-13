# C12 Recipient field

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4778) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=40-17) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**송금받을 주소를 입력하고, Review에서 전체 주소를 확인합니다.**

## Anatomy

Recipient label → editable full string 또는 read-only review → helper/error. Review는 input placeholder와 다른 읽기 모드입니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Empty/Entered/Review/Invalid | `state` | `recipientField.border.default/error, borderWidth` |
| Recipient / Invalid input TEXT | `value` | `recipientField.value, valueStyle` |
| Fixed validation / label slots | `helper, error, label` | `recipientField.helper/error/label, bodyStyle/titleStyle` |
| Editing container | `editable` | `recipientField.padding/radius; placeholder는 input.placeholder` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Empty → Entered → 검증 → Review입니다. Invalid는 편집과 Continue blocked입니다. Format 검증만 통과했다고 recipient 안전을 보증하지 않습니다. Network·account 변경 후 해당 주소 형식을 다시 확인합니다.

## Keyboard와 a11y 책임

구현자는 C03 label·describedby·invalid·focus를 따릅니다. Consumer는 선택 network의 address validation과 정확한 오류·review 데이터·validation 시점을 제공합니다. Clipboard 값이나 주소의 character를 추정 수정하지 않습니다. Review에서는 전체 주소를 LTR로 보존합니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<label for="recipient">Recipient</label>
<input id="recipient" aria-invalid="true" aria-describedby="recipient-error" value="0x3333" />
<p id="recipient-error">Enter a valid Ethereum address.</p>
```

**Do:** Review에서 0x + 40 hex의 합성 full address를 표시합니다. 320 px·200% text에서도 문자를 보존합니다.

**Don't:** Compact address로 최종 확인을 대체하지 않습니다. Valid format을 Verified recipient badge로 표시하지 않습니다.

## 성숙도와 증거

[Transfer builder](../../work/v2/figma-transfers.js)의 C12 4 State가 기준입니다. [Recipient readback](../../work/v2/verification/production-native-repair-recipient-final.json)은 native role 수정의 제한된 증거입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
