# C07 Account selector

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4482) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=35-20) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**이름과 전체 주소를 보고 계정을 선택합니다. Available과 Selected를 구분합니다.**

## Anatomy

Wallet identity → Account name → full Account address → Selected check와 label. 긴 이름과 주소를 내용 높이로 표시합니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Selected/Available | `selected` | `accountRow.bg.selected/default, check, borderWidth.selected/default` |
| Account name TEXT | `name` | `accountRow.name, titleStyle` |
| Account address TEXT | `address` | `accountRow.address, bodyStyle; 주소 typography가 없으면 Semantic typography.address` |
| Identity·layout slots | `identity, layout` | `icon.account.fg/size; accountRow.padding/radius` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Available → activation → Selected입니다. Current account picker의 단일 선택과 C17의 공유 account 다중 선택은 다른 consumer 모델입니다. 선택 변경 뒤 account-dependent balance·fee·review를 함께 갱신합니다.

## Keyboard와 a11y 책임

구현자는 visible check·name·address·focus를 유지합니다. Consumer가 선택 모델을 정합니다. Single picker는 radio group 또는 명확한 action button을 사용합니다. C17 다중 선택은 checkbox를 사용합니다. Dialog host는 초기 focus·Escape·restore를 담당합니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<label><input type="checkbox" name="sharedAccount" value="account-1" checked />
  Everyday · 0x1111111111111111111111111111111111111111
</label>
```

**Do:** 48자 이름·full address·200% text를 보존합니다. 선택 수와 실제 선택 행을 맞춥니다.

**Don't:** Check 또는 Wallet icon을 account 인증으로 쓰지 않습니다. 다중 선택에서 radio 의미를 사용하지 않습니다.

## 성숙도와 증거

[Wallet builder](../../work/v2/figma-wallet.js)의 2개 State와 TEXT props가 기준입니다. Account의 실제 소유·wallet 연결은 specimen 증거가 아닙니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
