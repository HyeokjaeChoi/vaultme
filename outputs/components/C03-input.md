# C03 Input

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: Figma family와 웹 합성 Prototype의 적용 recipe

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4281) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-231) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**사용자가 값을 입력하는 field입니다. Label과 helper/error를 항상 연결합니다.** Recipient·amount의 wallet-specific validation은 C12·C13에서 조합합니다. Placeholder는 label의 대체물이 아닙니다.

## Anatomy

```text
[1 Persistent label]
[2 Editable input and visible focus]
[3 Helper or actionable error]
```

내용에 따라 전체 높이가 늘어납니다. Input의 width와 helper의 line count를 이유로 오류를 자르지 않습니다. Input의 인지·focus·invalid 경계는 Borderless의 기능상 예외입니다.

## Figma → code → token

| Figma property/slot | 제안 code prop | Component token |
| --- | --- | --- |
| `State=Default/Focused/Filled/Invalid/Disabled` | derived `state` | `input.bg.default/disabled`, `input.border.default/focus/error` |
| `Label` TEXT | `label` | `input.label`, `input.labelStyle` |
| `Input value` TEXT, Filled specimen | `value` | `input.fg`, `input.textStyle` |
| Placeholder slot | `placeholder` | `input.placeholder`, `input.textStyle` |
| `HelperText`, `ErrorText` additive TEXT | `helper`, `error` | `input.helper/errorText`, `input.helperStyle` |
| Control layout | consumer layout | `input.height`, `paddingX`, `radius`, `borderWidth`, `fieldGap` |
| Focus ring | keyboard interaction | `input.focusRing`; Component가 없는 width/offset은 Semantic `focus.width/offset` |

[Core readback](../../work/v2/verification/production-native-repair-core.json)은 `HelperText`와 `ErrorText`의 별도 additive TEXT를 기록합니다. `HelperText#158:0`은 일반 안내에 연결합니다. Invalid는 `ErrorText#158:6`만 사용합니다. Placeholder는 독립 property로 확인된 것이 아닙니다. State 의미를 한 공통 TEXT로 덮지 않습니다. `input.textStyle`의 row 역할을 적용합니다. Input 안의 글자를 body로 우회하지 않습니다.

## 상태와 전이

| 상태 | 의미 | 동작 |
| --- | --- | --- |
| Default | 값 없음, 편집 가능 | label과 placeholder 표시 |
| Focused | 키보드/포인터 focus | ring 표시. 값과 validation은 유지 |
| Filled | 값 있음 | 입력값을 보존 |
| Invalid | 수정 필요 | `aria-invalid`, error 연결 |
| Disabled | 입력 불가 | disabled 이유를 근처에 표시 |

Empty → 입력 → Filled로 전이합니다. Consumer가 정한 blur 또는 submit 시점에 validate합니다. Invalid 상태에서 수정하면 정해진 validation 시점에 오류를 갱신합니다. Focus와 Invalid는 동시에 가능합니다. Error border와 focus ring을 함께 표시합니다. Disabled는 편집과 제출 대상에서 제외되는 native 의미를 따릅니다.

## Keyboard와 a11y 책임

Component 구현은 `<label for>`·stable input ID·helper/error의 `aria-describedby`·`aria-invalid`와 기본 text editing을 담당합니다. Tab으로 field에 접근하고 browser의 선택·복사·편집 key를 보존합니다. 입력 중 focus를 다른 곳으로 보내지 않습니다.

Consumer는 ID, field name, value, validation 규칙·시점·오류 문구와 disabled 이유를 제공합니다. Submit 실패 시 첫 invalid field로 focus하거나 error summary를 연결합니다. 매 keystroke마다 assertive announce하지 않습니다. Clipboard의 주소·수량을 추정 보정하지 않습니다.

## 예제와 Do / Don't

```html
<label for="wallet-name">Wallet name</label>
<input id="wallet-name" name="walletName"
  value="Everyday" aria-invalid="true"
  aria-describedby="wallet-name-error" />
<p id="wallet-name-error">Enter a wallet name you can recognize.</p>
```

**Do:** 48자 account, 여러 줄 error, 320 px와 200% text에서도 label·value·error를 읽게 합니다. No motion에서도 focus·validation을 즉시 표시합니다.

**Don't:** Placeholder만 label로 쓰지 않습니다. Error를 빨간 outline만으로 표시하지 않습니다. 외곽의 borderless 규칙으로 input focus를 제거하지 않습니다.

## 성숙도와 증거

이 문서는 consumer 구현 계약입니다. 아래 code prop 이름은 대응 제안이며 배포된 SDK API가 아닙니다. Figma property는 기존 source 정의를 기준으로 읽습니다. 개별 TEXT property의 ID suffix는 현재 `componentPropertyDefinitions`로 확인합니다. Property가 노출되지 않은 slot은 native 설명 또는 별도 조합으로 취급합니다.

현재 값은 [token source](../wallet-foundation.tokens.json), Figma ID·Variant는 [native ledger](../../work/figma-state.json), web specimen은 [Review](../vaultme-v2-review/index.html)를 참조합니다. 최신 검사와 source hash는 release record를 따릅니다. 문서만으로 browser·manual screen reader·독립 consumer 채택을 pass 처리하지 않습니다.

320 px, 긴 값, 200% text, no motion을 적용 대상에서 확인합니다. 기본 정보 container는 Borderless입니다. Focus ring과 44 px target을 보존합니다. 금액과 전체 주소를 자르지 않습니다.
