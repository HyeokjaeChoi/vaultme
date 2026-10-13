# C20 Connected app row

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5331) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=44-23) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**dApp의 연결 account·network와 connection 상태를 표시합니다.**

## Anatomy

Origin → account/network scope → Connected/Disconnected label → allowance와 별도라는 설명 → Connected에 Disconnect. Full scope는 detail에서도 보존합니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Connected/Disconnected | `connected` | `connectedAppRow.scope; state copy는 fixed` |
| Origin / Account TEXT | `origin, account, network` | `connectedAppRow.origin/scope, titleStyle/bodyStyle` |
| Disconnect nested C01 | `onDisconnect` | `connectedAppRow.action; C01 secondary` |
| Flat row layout | `layout` | `connectedAppRow.padding/radius/borderWidth; height는 deprecated` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Connected → Disconnect 성공 관찰 → Disconnected입니다. Disconnect는 allowance를 변경하지 않습니다. Failed/Unknown Variant는 없으므로 consumer는 별도 notice와 기존 관찰된 state를 보존합니다. 다시 연결하려면 C17을 검토합니다.

## Keyboard와 a11y 책임

구현자는 origin·scope·state를 visible/accessible 경로로 제공합니다. Consumer는 실제 session scope와 disconnect 응답을 제공합니다. Disconnect button은 어느 app인지 accessible description으로 연결합니다. 읽기용 origin row 전체를 무조건 Tab stop으로 만들지 않습니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<article aria-labelledby="app-origin">
  <h2 id="app-origin">swap.example</h2>
  <p>Everyday · Ethereum · Connected</p>
  <button type="button" aria-describedby="app-origin">Disconnect</button>
  <p>Disconnecting an app does not revoke a token allowance.</p>
</article>
```

**Do:** 긴 origin·scope는 내용 높이로 읽게 합니다. Connection과 C21 allowance section을 분리합니다.

**Don't:** Disconnected 상태에서 current allowance를 0으로 표시하지 않습니다. Logo를 origin 인증으로 사용하지 않습니다.

## 성숙도와 증거

[Permissions builder](../../work/v2/figma-permissions.js)의 두 State가 기준입니다. Session 종료와 chain allowance는 각 runtime의 다른 데이터입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
