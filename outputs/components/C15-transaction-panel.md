# C15 Transaction panel

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: Figma family와 웹 합성 Prototype의 적용 recipe

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4863) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=18-46) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**On-chain send의 자산 변화와 recipient·fee를 검토합니다.** Connection은 C17, message signing은 C18, approval은 C16입니다. C15의 check 상태와 C28의 transaction 결과는 별개입니다.

## Anatomy

```text
1 Action title + account + network + ready status
2 Exact amount + asset
3 Full recipient address
4 Estimated native fee + quote freshness
5 Estimated deduction by asset
6 Available checks + reason + scope/time
7 Details / raw data disclosure
8 C24 review footer
```

Account, network, asset, full recipient, amount, estimated fee, action status는 필수입니다. Fee가 unavailable이면 total도 unknown입니다. 150 USDC와 ETH fee는 별도 줄입니다. Footer는 주소·warning을 덮지 않습니다.

## Figma → code → token

| Figma property/slot | 제안 code prop | Component token |
| --- | --- | --- |
| `State=No risk signals/Review required/Unable to verify` | `checkState` literal union | `transactionPanel.check.clear.*`, `warning.*`, `unknown.*` |
| `Account`, `Network` TEXT | `account`, `network` | 대응 Component가 없으면 Semantic text 역할 |
| `Send amount` TEXT | `amount`, `asset` | `transactionPanel.value`, `amountStyle` |
| `Recipient` TEXT | `recipient` full string | `transactionPanel.address`, `dataStyle` |
| `Native fee` TEXT + fee slot | `fee` structured data | 조합 C14의 `feeSummary.amount/note/stale/insufficient` |
| `Estimated total` TEXT | `deductionsByAsset` | `feeSummary.total/deductionNote`; typography는 `transactionPanel.valueStyle` |
| Title·status·check copy fixed slots | derived copy | `transactionPanel.titleStyle/bodyStyle`, `label`, `labelStyle` |
| Content / drawer / disclosure | consumer layout | `paddingMobile/paddingDesktop`, `rowGap`, `borderWidth`, `drawerBorderWidth`, `disclosureBorderWidth` |

`transactionPanel.safe.*`는 deprecated compatibility alias입니다. 새 UI는 `transactionPanel.check.clear.*`를 사용합니다. Slot을 property로 노출하지 않은 native source는 조합 문서와 바인딩을 확인합니다. 이 표는 기존 property를 삭제하거나 renamed API로 대체하는 지시가 아닙니다.

## 상태와 전이

| check state | 반드시 표시할 내용 | 의미 |
| --- | --- | --- |
| No risk signals | `No issues found in available checks` + scope/time | 수행한 검사에서 문제를 찾지 못함 |
| Review required | warning title·reason | 확인할 조건이 있음 |
| Unable to verify | 실패 이유와 detail | 검사를 완료하지 못함 |

Consumer의 check policy가 Proceed 허용 여부를 정합니다. `Unable to verify`를 success로 fallback하지 않습니다. Fee가 stale/unavailable/insufficient이면 C24를 Blocked로 둡니다. Fresh fee와 유효한 입력을 확인한 뒤 Ready로 전이합니다. Confirm send → C28 Submitting입니다. Confirmed는 관찰된 chain 결과 또는 명시한 synthetic scenario에서만 사용합니다.

## Keyboard와 a11y 책임

Panel은 자체 modal이 아닙니다. Inline region이면 title과 reading order를 제공합니다. Drawer/dialog로 조합하면 host가 accessible dialog title, focus containment, Escape, close 후 focus restore를 담당합니다. Disclosure는 실제 button과 `aria-expanded`·`aria-controls`를 사용합니다.

Consumer는 full context·address·exact decimal·freshness·check scope·raw payload·추정/관찰 근거를 제공합니다. C24와 C28 사이의 status announcement도 consumer 책임입니다. 금액·주소·warning을 hover에 숨기지 않습니다.

## 예제와 Do / Don't

제안 view model입니다. 실제 chain 응답으로 취급하지 않습니다.

```ts
const syntheticReview = {
  action: "send",
  account: "0x1111111111111111111111111111111111111111",
  network: "Ethereum",
  amount: "150", asset: "USDC",
  recipient: "0x3333333333333333333333333333333333333333",
  fee: { state: "fresh", amount: "0.00063", asset: "ETH", estimated: true },
  deductionsByAsset: [{ amount: "150", asset: "USDC" },
    { amount: "0.00063", asset: "ETH", estimated: true }],
  checkState: "review-required", actionStatus: "ready-for-review"
} as const;
```

**Do:** 320 px, 200% text에서 전체 주소를 줄바꿈합니다. 세 줄 warning을 보존합니다. Fee 갱신 후 amount·recipient·account·network가 이전 review와 같은지 확인합니다. No motion에서도 새 status를 즉시 표시합니다.

**Don't:** `Safe transaction`, 자물쇠, blue action으로 안전을 보증하지 않습니다. USDC와 ETH를 단일 수량으로 합산하지 않습니다. Simulation 성공을 Confirmed로 표시하지 않습니다.

## 성숙도와 증거

이 문서는 consumer 구현 계약입니다. 아래 code prop 이름은 대응 제안이며 배포된 SDK API가 아닙니다. Figma property는 기존 source 정의를 기준으로 읽습니다. 개별 TEXT property의 ID suffix는 현재 `componentPropertyDefinitions`로 확인합니다. Property가 노출되지 않은 slot은 native 설명 또는 별도 조합으로 취급합니다.

현재 값은 [token source](../wallet-foundation.tokens.json), Figma ID·Variant는 [native ledger](../../work/figma-state.json), web specimen은 [Review](../vaultme-v2-review/index.html)를 참조합니다. 최신 검사와 source hash는 release record를 따릅니다. 문서만으로 browser·manual screen reader·독립 consumer 채택을 pass 처리하지 않습니다.

320 px, 긴 값, 200% text, no motion을 적용 대상에서 확인합니다. 기본 정보 container는 Borderless입니다. Focus ring과 44 px target을 보존합니다. 금액과 전체 주소를 자르지 않습니다.
