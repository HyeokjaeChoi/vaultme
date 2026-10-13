# C18 Signature request

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5080) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=41-51) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**서명할 메시지의 exact content와 해석 범위를 읽습니다. On-chain transaction과 구분합니다.**

## Anatomy

Origin + account/full address → readable domain/URI/nonce/message 또는 raw payload → 해석 범위/이유 → raw detail → Reject/Sign message. Readable은 안전 보증이 아닙니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| Data=Readable/Unrecognized | `dataKind` | `signatureRequest.data, unknown.fg/bg` |
| Origin / Account / Account address TEXT | `origin, account` | `signatureRequest.origin/data` |
| Domain / URI / Message / Raw message TEXT | `messageFields, exactPayload` | `signatureRequest.data; body 역할은 Semantic` |
| Raw payload TEXT + fixed interpretation notice | `rawPayload, reason` | `signatureRequest.data, warning.fg/bg, titleStyle/bodyStyle, borderWidth` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Readable은 필드와 exact raw message를 함께 확인합니다. Unrecognized는 이유·raw payload를 보여주고 Sign message를 차단합니다. Reject를 우선합니다. Sign 승인은 transaction hash·Pending/Confirmed로 자동 전이하지 않습니다.

## Keyboard와 a11y 책임

구현자는 raw text selection·주소 LTR·disclosure button의 expanded 상태를 제공합니다. Consumer는 원문 byte/string·parser coverage·정확한 origin/account·sign handler를 제공합니다. Dialog host가 focus를 관리합니다. 원문을 truncate하거나 번역해서 서명 대상으로 교체하지 않습니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```text
합성 Readable: domain=swap.example
URI=https://swap.example
nonce=vaultme-review-01
message=Sign in to swap.example.
행동: Reject / Sign message
```

**Do:** 긴 raw payload는 줄바꿈하고 전체 내용 접근을 제공합니다. No motion에서도 disclosure와 blocked 이유를 읽게 합니다.

**Don't:** Readable을 Safe signature라고 부르지 않습니다. Off-chain message에 해당하지 않는 network fee를 강제로 넣지 않습니다.

## 성숙도와 증거

[Transfer builder](../../work/v2/figma-transfers.js)의 C18 두 Data와 raw message가 기준입니다. Parser·cryptographic signing·dApp outcome은 구현 완료 증거가 아닙니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
