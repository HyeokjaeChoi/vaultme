# C19 Backup status

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5311) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=44-14) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**Backup 확인 절차의 현재 상태를 설명합니다. 비밀 정보는 표시하지 않습니다.**

## Anatomy

State icon → Backup not confirmed/Backup confirmed → 의미·다음 행동. Pending에만 Review backup action을 조합합니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Pending/Confirmed | `confirmationState` | `backupStatus.pending/complete.fg/bg` |
| Fixed title/body slots | `derived copy` | `backupStatus.title/body, titleStyle/bodyStyle` |
| Pending nested action | `onReview` | `C01 secondary tokens` |
| Content container | `layout` | `backupStatus.bg/padding/radius/borderWidth; height는 deprecated` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Pending → 실제 제품의 확인 절차 완료 → Confirmed입니다. Button 클릭이나 screen 열기만으로 Confirmed가 되지 않습니다. 현재 Confirmed specimen은 frame 밖 synthetic 가정을 표시합니다.

## Keyboard와 a11y 책임

구현자는 상태 title·설명·button을 reading order로 제공합니다. Consumer는 실제 confirmation 근거와 허용된 다음 행동을 제공합니다. 비밀 phrase/key 입력은 이 recipe의 API가 아닙니다. Keyboard는 C01을 따릅니다. AT announcement는 실제 변화 시 host가 담당합니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<section aria-labelledby="backup-title">
  <h2 id="backup-title">Backup not confirmed</h2>
  <p>Complete the backup confirmation before you rely on this account.</p>
  <button type="button">Review backup</button>
</section>
```

**Do:** 긴 안내와 200% text에 맞춰 높이를 늘립니다. Recovery information을 private하게 유지하라는 의미를 보존합니다.

**Don't:** 실제 recovery phrase/private key를 Figma·문서·예제에 넣지 않습니다. Confirmed를 자금 복구 보증으로 표시하지 않습니다.

## 성숙도와 증거

[Permissions builder](../../work/v2/figma-permissions.js)는 Pending/Confirmed와 이전 Backed up→Confirmed compatibility를 기록합니다. 실제 backup 절차는 제품 요구사항입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
