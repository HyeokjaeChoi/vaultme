# 회고: 디자인 시스템 미적용 (2026-10-13)

상태: 조치 진행 중 · 관련 issue: #5 (앱 UI 재구현), #6 (이 회고와 재발 방지)

## 1. 요약

- Figma Prototype 화면과 첫 앱 화면(C2a)이 디자인 시스템을 따르지 않았다.
- 소유자가 시뮬레이터 화면을 보고 발견했다. 에이전트의 검사는 이것을 잡지 못했다.
- 기존 Foundation 컴포넌트(C01–C28)는 정상이었다. 문제는 이번 세션에서 새로 만든 층에만 있었다.

## 2. 무엇이 잘못됐나 (측정값)

### Figma

| 대상 | 토큰 미연결 | 텍스트 스타일 없음 |
|---|---|---|
| 새 컴포넌트 C29–C33 | 간격 13, 여백 24, 색 1 | 0 |
| `11 Prototype` 화면 층 | 간격 320, 여백 183, 반경 432 | 61 |
| `10 Wireframes` 화면 층 | 간격 159, 여백 180, 반경 9 | 0 |

- 앱 규칙에 없는 간격 20을 썼다. 규칙은 24/16/12/8이다 (outputs/VaultMe-DESIGN.md).

### 앱 (C2a 첫 구현)

- 화면 간격에 `sectionGap.mobile`(64, 랜딩 페이지 값)을 썼다. 앱 값은 `sectionGap.product`(24)다.
- 버튼 위계가 반대였다. Home은 "보내기"가 Primary여야 한다. 검토는 "확인하고 보내기"가 Primary, "수정"이 Ghost여야 한다.
- 컴포넌트를 Figma master가 아니라 문서 설명만 보고 새로 만들었다. C22 헤더 아이콘, C15 Transaction panel 카드가 빠졌다.
- 비슷한 주소 강조가 달라진 4글자 묶음이 아니라 가운데 전체에 적용됐다.

## 3. 원인 (5 Whys)

1. 왜 화면이 디자인 시스템과 달랐나?
   → 화면 층을 instance + 토큰 연결이 아닌 숫자 값으로 만들었다. 앱은 Figma를 읽지 않고 문서로 추측해 만들었다.
2. 왜 숫자 값으로 만들었나?
   → Figma 빌더 스크립트가 `itemSpacing: 24`처럼 숫자를 직접 넣었다. 색만 변수로 연결했고, 간격·반경·텍스트는 검사하지 않았다.
3. 왜 검사하지 않았나?
   → "완료" 기준이 스크린샷 육안 확인뿐이었다. 토큰 연결 감사(audit)가 완료 조건에 없었다.
4. 왜 앱 구현은 Figma를 읽지 않았나?
   → 구현 위임 지시에 "Figma screenshot은 선택"으로 썼다. `figma-design-to-code` 스킬과 `get_design_context` 사용을 필수로 요구하지 않았다.
5. 왜 결과를 그대로 받아들였나?
   → 메인 에이전트가 typecheck·lint·test 통과만 보고 승인했다. 화면을 Figma와 비교하지 않았다. 시뮬레이터가 없다는 이유로 시각 검증을 건너뛰었다.

**근본 원인**: 디자인 시스템 사용이 "권장"이었고 "검증되는 완료 조건"이 아니었다. 기계로 검사할 수 있는 것(토큰 연결, 숫자 style 값)을 검사하지 않았다. 사람이 봐야 하는 것(Figma 대비 화면)을 생략해도 작업이 끝날 수 있었다.

## 4. 잘된 점

- 기존 Foundation 컴포넌트는 토큰 연결이 100%였다. 감사 스크립트 한 번으로 문제 범위를 바로 좁혔다.
- Figma 수정은 감사 → 일괄 연결 → 재감사(0건)로 끝났다.

## 5. 이미 한 조치

- Figma: C29–C33, `11 Prototype`, `10 Wireframes`의 간격·여백·반경·텍스트를 변수와 스타일에 연결했다. 재감사 결과 미연결 0건 (OS 크롬인 상태 표시줄, 홈 인디케이터, 가짜 QR은 예외).
- 앱: issue #5에서 `figma-design-to-code`와 `get_design_context`로 다시 구현 중이다.

## 6. 재발 방지 (이 PR)

| 조치 | 위치 | 종류 |
|---|---|---|
| 디자인 시스템 강제 규칙 | `AGENTS.md` "Enforced rules" | 규칙 |
| Figma 화면은 DS instance로만 만들고, 토큰 감사 0건이어야 완료 | `.claude/skills/vaultme-figma-screen/` | 스킬 + 감사 스크립트 |
| 앱 UI는 Figma master에서 design-to-code, Figma 대비 캡처가 있어야 완료 | `.claude/skills/vaultme-design-to-code/` | 스킬 |
| `apps/mobile`에서 숫자 style 값, `sectionGap.mobile/desktop` 금지 | `scripts/check-repo-rules.sh` R4·R5 | 자동 검사 |
| UI PR은 Figma 대비 이미지 필수 | PR template, `.coderabbit.yaml` custom check | 리뷰 게이트 |
| 교훈 L01·L02 | `.claude/skills/vaultme-review-lessons/` | 교훈 |

## 7. 더 찾아본 개선책 (후속 issue 후보)

1. **Figma Code Connect**: Figma 컴포넌트를 `apps/mobile/src/shared/ui` 컴포넌트에 연결한다. `get_design_context`는 연결된 구현 정보를 제공한다. 구현에서 기존 컴포넌트의 재사용 여부를 확인한다.
2. **화면 시각 회귀 테스트**: Maestro 또는 `xcrun simctl io` 캡처를 기준 이미지와 비교한다. 기준 이미지는 Figma 프레임 export로 시작한다.
3. **Figma 감사의 CI화**: Figma REST API로 `11 Prototype` 노드를 읽어 raw 값 개수를 세는 스크립트. 토큰이 필요하므로 secret 관리를 먼저 정한다.
4. **ESLint 규칙화**: R5 grep 검사를 `no-restricted-syntax` 규칙으로 옮겨 에디터에서 바로 보이게 한다.
