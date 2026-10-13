# C04 Card / Group

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4321) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-240) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**관련 정보를 묶거나 독립 task를 제공합니다. 일반 wallet 목록은 flat row를 사용합니다.**

## Anatomy

Section title → body → Task에만 action. Card 전체를 button으로 만들지 않습니다. Body는 내용 높이로 늘어납니다.

대표 tint 요약은 [C23](C23-portfolio-balance.md)의 역할입니다. C04는 흰색의 평평한 정보 group 또는 독립 task로 사용합니다. C23를 C04 안에 중첩하지 않습니다. 기본 group에 shadow와 tint를 함께 넣지 않습니다.

## States

Default는 정보 group입니다. Task는 목적이 있는 별도 action을 포함합니다. Kind는 pending/confirmed가 아닙니다. 작업 상태는 C05 또는 C25로 조합합니다.

## Tokens

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| Kind=Default/Task | `kind` | `card.bg.default, group.borderWidth 또는 card.borderWidth` |
| Body TEXT | `body` | `card.bodyStyle` |
| Title fixed slot | `title` | `card.titleStyle` |
| Task nested C01 | `actionLabel, onAction` | `C01 tokens; card.group.gap/padding/radius` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## Accessibility

구현자는 section heading과 reading order를 제공합니다. Consumer는 정보 group의 제목·본문과 실제 task handler를 제공합니다. Task button의 C01 key 동작을 보존합니다. 중첩 link/button을 가진 card 전체에 onClick을 추가하지 않습니다.

## Usage

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<section aria-labelledby="account-details-title">
  <h2 id="account-details-title">Account details</h2>
  <p>Keep account and network information visible.</p>
</section>
```

**Do:** Default는 Borderless로 시작합니다. 긴 body·200% text가 action을 밀어내도록 높이를 늘립니다.

**Don't:** 모든 asset를 둥근 card와 shadow로 감싸지 않습니다. Backup task의 존재를 실제 recovery 구현으로 보고하지 않습니다.

## Lifecycle와 Evidence

[Core builder](../../work/v2/figma-core.js)의 C04 Kind와 Body slot이 기준입니다. Native geometry와 Task 실행 검증은 release record로 확인합니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
