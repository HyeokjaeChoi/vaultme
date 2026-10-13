# C25 Status notice

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5156) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=73-169) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**상태의 이유와 가능한 다음 행동을 설명합니다. 짧은 badge는 C05입니다.**

## Anatomy

Tone icon → editable title → editable reason → 필요한 경우 다음 행동. 색과 icon만으로 의미를 전달하지 않습니다. Notice는 기본 Borderless입니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| Tone=Info/Warning/Danger/Unknown/Confirmed | `tone` | `statusNotice.info/warning/danger/unknown/confirmed.fg/bg/borderWidth` |
| Tone-prefix title/reason TEXT | `title, reason` | `statusNotice.titleStyle/bodyStyle` |
| Icon·layout slots | `presentation` | `icon.status.*; statusNotice.padding/gap/radius` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Info는 설명, Warning은 검토, Danger는 차단 이유, Unknown은 미확인 결과, Confirmed는 완료 사실입니다. 내부 clear 역할은 public C25 Tone axis에 없습니다. Check clear는 C15의 available checks 문구를 따릅니다.

## Keyboard와 a11y 책임

구현자는 heading·reason·action reading order와 icon aria-hidden을 제공합니다. Consumer는 관찰 근거·구체적 원인·해결 행동을 제공합니다. 정적인 notice는 자동 live region이 아닙니다. Dynamic urgent error와 polite status의 announcement는 host가 중요도에 따라 한 번 제공합니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<section aria-labelledby="fee-notice-title">
  <h2 id="fee-notice-title">Action blocked</h2>
  <p>Network fee unavailable</p>
  <button type="button">Retry estimate</button>
</section>
```

**Do:** Warning 3줄·좁은 폭·200% text에서도 title·reason·다음 행동을 유지합니다.

**Don't:** Blue나 check만으로 safety를 보증하지 않습니다. Unknown을 Confirmed에 fallback하지 않습니다.

## 성숙도와 증거

[Transfer builder](../../work/v2/figma-transfers.js)는 5 Tone과 각 Tone의 title/reason props를 기록합니다. Internal check role과 public Variant를 구분합니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
