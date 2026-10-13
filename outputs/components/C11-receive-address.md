# C11 Receive address

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4643) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-150) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**같은 network에서 받을 전체 주소를 표시하고 복사합니다. QR slot은 없습니다.**

## Anatomy

Receive title → account name → network → full address → Copy address → copy outcome/network 안내. Copy target은 표시한 전체 문자열입니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Default/Copied/Copy failed | `copyState` | `receivePanel.helper; 실패는 Semantic status.danger.fg` |
| Account name / Network / Address TEXT | `account, network, address` | `receivePanel.address/helper, titleStyle/bodyStyle; account text는 Semantic` |
| Title fixed slot | `title` | `receivePanel.title` |
| Nested copy C01 | `onCopy` | `C01 secondary tokens; receivePanel.padding/radius/borderWidth` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Default → clipboard success → Copied입니다. Clipboard failure → Copy failed입니다. 실패해도 full address를 선택해 수동 복사할 수 있습니다. Account/network 변경 시 copy 대상과 copy 결과를 새 맥락으로 갱신합니다.

## Keyboard와 a11y 책임

구현자는 address selection·keyboard copy button·status text를 제공합니다. Consumer는 주소/network 데이터와 clipboard promise 결과를 제공합니다. Copy feedback은 host의 polite region 한 곳에서 announce합니다. 복사 실패가 주소 validation failure는 아닙니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<p>Ethereum · Everyday</p>
<p>0x1111111111111111111111111111111111111111</p>
<button type="button">Copy address</button>
<p role="status">Could not copy. Select the full address.</p>
```

**Do:** 주소를 좁은 폭에서 줄바꿈하고 full value를 보존합니다. Copy 성공·실패를 각각 확인합니다.

**Don't:** 주소를 줄여서 복사하지 않습니다. QR·network 지원·주소 인증을 만들지 않습니다.

## 성숙도와 증거

[Wallet builder](../../work/v2/figma-wallet.js)의 copy 3개 State와 [Review source](../vaultme-v2-review/app.js)를 참조합니다. Clipboard 권한·성공은 환경별 관측 결과입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
