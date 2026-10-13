# C17 Connection request

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5026) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=41-28) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**dApp이 볼 account와 network scope를 선택합니다. Token spending permission과 별개입니다.**

## Anatomy

Action title → exact origin → selected account count → 실제 C07 selection rows → network scope → 공개되는 정보 → Cancel/Connect. 두 account Variant에는 실제 두 행이 있어야 합니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| Scope=One account/Two accounts | `selectedAccounts` | `connectionRequest.account/permission, notice.fg/bg` |
| Origin / Network TEXT | `origin, network` | `connectionRequest.origin; network는 Semantic text` |
| Nested Account name / Account address | `accounts` | `C07 accountRow tokens` |
| Title·public access notice slots | `permissionDescription` | `connectionRequest.title/titleStyle/bodyStyle, padding/radius/borderWidth` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Account toggle → selected count 갱신 → Connect 승인 → Connected 상태입니다. No selection은 consumer가 Connect blocked로 처리합니다. One/Two는 현재 합성 계약이며 임의 N-account 지원 선언이 아닙니다. Cancel은 요청을 거절합니다.

## Keyboard와 a11y 책임

구현자는 account checkbox label·visible count·focus·읽기 순서를 제공합니다. Consumer는 origin·accounts·network scope·공개 정보와 실제 connection event를 제공합니다. Dialog host는 heading focus·containment·Escape·restore를 담당합니다. C24 action은 정확히 Connect입니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```text
합성 선택: swap.example
선택 계정: Everyday + Long-term holdings
Network: Ethereum
공개 범위: selected public addresses
행동: Cancel / Connect
```

**Do:** 선택 count와 행을 맞춥니다. Long account name과 2개 full address를 모두 읽게 합니다.

**Don't:** Connect를 Approve tokens라고 부르지 않습니다. Origin에 검증되지 않은 Verified badge를 붙이지 않습니다.

## 성숙도와 증거

[Transfer builder](../../work/v2/figma-transfers.js)의 C17과 [Component 계약](../wallet-component-contracts.md)의 connection 데이터가 기준입니다. 실제 dApp 연결은 별도 runtime evidence입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
