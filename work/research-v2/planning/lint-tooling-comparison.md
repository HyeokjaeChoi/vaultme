# VaultMe Lint 도구 비교 (ESLint vs Biome vs Oxlint)

기준일: 2026-10-12. 조사 방법: 공식 문서/GitHub fetch.

표기: **[V]** = 확인함(URL 있음), **[I]** = 추론, **[U]** = 미확인.

## 0. 먼저 알아둘 사실 (핵심 발견)

- **typescript-eslint는 아직 TypeScript 7을 지원하지 않는다 [V].** TS 7.0은 기존 programmatic API가 없다. peer range는 `>=4.8.4 <6.1.0`. 이슈는 #10940으로 통합됨. 일정은 없다. 근거: https://github.com/typescript-eslint/typescript-eslint/issues/12518
  - 결과: ESLint type-aware 경로는 `typescript`를 6.x로 고정해야 한다 [V]. `tsc`를 TS 7로 쓰려면 병행 설치가 필요하다 [I].
- **Oxlint type-aware(tsgolint)는 2026-07-22에 stable 선언 [V].** typescript-eslint의 61개 type-aware 규칙 중 59개 구현. 근거: https://oxc.rs/blog/2026-07-22-type-aware-linting-stable
  - 주의: oxc.rs 가이드 페이지는 아직 "incomplete coverage, 높은 메모리" 같은 문구가 남아 있다 [V]. https://oxc.rs/docs/guide/usage/linter/type-aware.html (stale 가능성)
- **Biome 최신은 v2.5.15 [V].** https://biomejs.dev/internals/changelog/ 의 type-aware 규칙(`noFloatingPromises`, `noMisusedPromises`, `useExhaustiveSwitchCases`)은 여전히 **nursery** [V]. https://biomejs.dev/linter/rules/no-floating-promises/ , https://biomejs.dev/linter/rules/use-exhaustive-switch-cases/
- **`eslint-plugin-react-native`는 사실상 유지보수 중단 [V].** 메인테이너가 "시간이 거의 없다"고 명시. flat config 언급 없음. https://github.com/Intellicode/eslint-plugin-react-native
- 웹의 2026 벤치마크 글(tech-insider, pkgpulse 등)은 SEO성이고 수치가 서로 충돌한다. 방법론이 없어 **인용하지 않는다.**

## 1. 요구사항 대비 능력표

| # | 요구사항 | A. ESLint + typescript-eslint + Prettier | B. Biome 2.5 | C. Oxlint (+oxfmt) |
|---|---|---|---|---|
| 1a | FSD 레이어 방향 | **Yes** (`eslint-plugin-boundaries` 또는 `no-restricted-imports` + file override). boundaries는 monorepo 지원 [V: https://github.com/javierbrea/eslint-plugin-boundaries], flat config 지원 여부는 페이지에서 확인 못함 [U] | **Partial**. `noRestrictedImports` + `overrides[].includes`로 경로별 금지 가능 [V: https://biomejs.dev/reference/configuration/]. 전용 boundaries 규칙 없음. `noPrivateImports`는 JSDoc 기반이라 레이어 규칙이 아님 [V: https://biomejs.dev/linter/domains/] | **Partial**. 네이티브 `no-restricted-imports`(`group`/`regex` 패턴) + `overrides[].files` [V: https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports.html , https://oxc.rs/docs/guide/usage/linter/config.html]. `import/no-restricted-paths` 존재 여부 **[U]** (docs URL 404). `eslint-plugin-boundaries`는 JS plugin(alpha)로 시도 가능, 호환 [U] |
| 1b | `@vaultme/wallet-core`는 특정 경로만 import | **Yes** (기본 금지 + 허용 경로에서 override로 off) [I] | **Yes** [I] (같은 방식, `paths`+`overrides`). `patterns`는 v2.2.0+ [V: https://biomejs.dev/linter/rules/no-restricted-imports/] | **Yes** [I] (같은 방식) |
| 2a | RN `StyleSheet`/inline style의 hex/rgb/숫자 리터럴 금지 | **Yes**. `no-restricted-syntax` AST selector로 직접 작성 [I]. `eslint-plugin-react-native`의 `no-color-literals`, `no-inline-styles`는 색/인라인만 다루고 "숫자 spacing"은 못 잡음 [V: 위 GitHub]. 그래서 selector 작성이 필요. | **Partial/[U]**. GritQL 플러그인은 JS/CSS/JSON 대상, 경로별 `includes` 가능 [V: https://biomejs.dev/linter/plugins/]. 2.5.13~14에서 import specifier/JSX 매칭이 강화됨 [V: changelog]. 하지만 객체 리터럴의 문자열/숫자 매칭 예제는 문서에 없음 [U]. 구현 가능성은 높아 보이나 실증 필요 | **Partial/[U]**. 네이티브에 `no-restricted-syntax` 존재 **[U]** (확인 못함). JS plugin은 alpha [V: https://oxc.rs/docs/guide/usage/linter/js-plugins.html]. 이 경로로 ESLint 규칙을 이식 가능하나 alpha |
| 2b | Web CSS Modules는 CSS 변수 | **No** (ESLint 범위 밖). **Stylelint 필요** (`declaration-property-value-disallowed-list` 등, 규칙명은 [U]-본 세션 미확인) | **Partial**. CSS 파싱/lint/format 있음. 색 리터럴 금지 규칙 존재는 **[U]**. GritQL이 CSS 대상이므로 가능성 있음 [I] | **No** (CSS lint 없음 [I]). oxfmt는 CSS/SCSS/Less 포맷 지원 [V: https://oxc.rs/docs/guide/usage/formatter.html]. 린트는 Stylelint |
| 3 | `no-floating-promises` | **Yes** (완성도 최고) | **Partial**. nursery, v2.0.0+ [V]. 공식 블로그: typescript-eslint가 잡는 케이스의 "약 75%" (초기 수치, 제한된 사례) [V: https://biomejs.dev/blog/biome-v2/]. 이후 2.5.12~15에서 계속 보강 중 [V: changelog] | **Yes**. tsgolint 구현 [V: https://github.com/oxc-project/tsgolint] |
| 3 | `no-misused-promises` | **Yes** | **Partial**. nursery [V: domains 페이지] | **Yes** [V: tsgolint] |
| 3 | `switch-exhaustiveness-check` | **Yes** | **Partial**. `useExhaustiveSwitchCases`, nursery, 기본값은 `default`가 있으면 통과. `requireExplicitCase`(2.5.14+)로 엄격화 [V] | **Yes** [V: tsgolint] |
| 3 | `strict-boolean-expressions` | **Yes** | **No/[U]**. 대응 규칙을 찾지 못함 | **Yes** [V: tsgolint 목록] |
| 4a | React hooks | **Yes** (`eslint-plugin-react-hooks`, eslint-config-expo에 포함: `react-hooks/exhaustive-deps` 출력 확인 [V: https://docs.expo.dev/guides/using-eslint/]) | **Yes**. `useExhaustiveDependencies`, `useHookAtTopLevel` (react domain) [V: domains] | **Yes**. `react` 플러그인에 `exhaustive-deps`, `hooks` [V: https://oxc.rs/docs/guide/usage/linter/rules.html]. `rules-of-hooks`는 목록이 잘려 확인 못함 [U] |
| 4b | RN 전용 규칙 | **Partial**. 플러그인 방치 상태 [V]. 대안은 직접 selector | **No** [I] | **No**. react-native 플러그인 없음 [V: rules 페이지 source 목록] |
| 4c | `eslint-config-expo` | **Yes** (`eslint-config-expo/flat`, SDK 53+) [V: Expo docs] | **No** (ESLint 전용) | **No** (ESLint 전용. JS plugin으로 로드해도 alpha) [I] |
| 4d | jsx-a11y | **Yes** | **Yes**(a11y 그룹, 규칙 수는 jsx-a11y보다 적을 수 있음 [U]) | **Yes** (`jsx-a11y` 소스) [V: rules 페이지] |
| 5 | 포맷 | Prettier (표준) | Biome formatter. JS/TS/JSX/TSX/JSON/CSS 지원, SCSS/YAML/Markdown은 진행 중 [V: https://biomejs.dev/internals/language-support/]. Prettier 호환 %는 이번에 확인 못함 [U] | oxfmt. Prettier v3.9.9 대상 호환, JS/TS/CSS/JSON/Markdown 지원, 기본 `printWidth` 100 [V: https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html]. 호환 % 및 stable 여부 확인 못함 [U] |

## 2. 성능

**중요:** type-aware ESLint 비용은 린터 엔진이 아니라 TypeScript type-check가 지배한다. typescript-eslint 공식: "typed linting은 대략 type-check만큼 느리다" [V: https://typescript-eslint.io/troubleshooting/typed-linting/performance/]. 즉 ESLint 엔진을 바꿔도 한계가 있다. Biome/Oxlint가 빠른 이유는 엔진이 빠른 것에 더해 type-check 자체를 대체하기 때문이다 [I].

| 출처 | 조건 | 결과 |
|---|---|---|
| Oxc 블로그 (벤더 벤치) https://oxc.rs/blog/2026-07-22-type-aware-linting-stable | Apple M4 Pro 12 core, ESLint+typescript-eslint vs tsgolint | vscode 83.2s vs 6.96s (12x), typescript 27.2s vs 1.94s (14x), typeorm 13.2s vs 0.75s (18x), vue/core 12.3s vs 0.95s (13x) |
| oxfmt 문서 (벤더 주장) | 방법론 없음 | Prettier 대비 약 30x, Biome 대비 약 2x |
| 개인 블로그 https://peterbe.com/plog/benchmarking-oxlint-vs-biome | 소형 프로젝트, 10회 | oxlint `--type-aware` 560ms, Biome `check` 269ms. 비-type-aware는 비슷 (검색 요약본에서 인용, 원문 미확인) |
| Biome | 공식 type-aware 속도 벤치 | **없음** [V: Biome v2 블로그에 직접 비교 없음] |

VaultMe 규모(소형 모노레포)에서는 세 도구 모두 절대 시간이 작을 가능성이 크다 [I]. 우리 repo에서 직접 측정하는 것이 필요하다.

## 3. 성숙도 / 안정성

| 항목 | A. ESLint | B. Biome | C. Oxlint |
|---|---|---|---|
| 코어 | 최고 성숙 | stable. 단 type-aware는 nursery | native 규칙 stable. type-aware는 2026-07 stable 선언 |
| 플러그인 | 최대 생태계 | GritQL: JS/CSS/JSON만, 규칙 작성 제약 [V] | JS plugin **alpha**, semver 미적용, type-aware 규칙은 JS plugin에서 불가 [V: js-plugins] |
| 토대 위험 | typescript-eslint가 **TS 7 미지원** (TS 6 고정 필요) [V] | 자체 inference라 TS 7 영향 없음 [I] | tsgolint는 TS 7 기준 빌드 [V]. TS 버전과 결합 (`v7.0.2000` 체계) |
| 알려진 한계 | 느림 | 정확도 약 75% (초기), 지속 개선 | 규칙 2개 미구현(미공개), 큰 repo 메모리 [V]. type-aware 옵션은 root config 한정 [V] |
| 커버리지 | 61/61 | 소수 규칙 | 59/61 |

## 4. Monorepo / 설정

- **Biome:** 루트 `biome.json` + 하위 `"root": false` 또는 `"extends": "//"` [V: https://biomejs.dev/guides/big-projects/]. `overrides[].includes`로 경로별 규칙 [V].
- **Oxlint:** 가까운 config 사용, `extends`는 JSON은 상대경로만, 공유 패키지 import는 TS config(`oxlint.config.ts`, Node 22.18+)만 가능 [V: https://oxc.rs/docs/guide/usage/linter/nested-config.html]. `typeAware`는 root에서만 [V].
- **ESLint:** flat config, 패키지별 `eslint.config.js`, 공유 config 패키지 가능.

## 5. Turborepo 캐싱

- **ESLint:** 패키지별 `lint` 태스크 + `dependsOn: ["^lint"]`로 공유 config 변경 시 캐시 무효화 [V: https://turborepo.dev/docs/guides/tools/eslint]. 타입 규칙은 다른 패키지(`wallet-core`, `contracts`)의 `.ts`에 의존하므로 `inputs`에 해당 소스를 포함해야 정확하다 [I].
- **Biome:** 루트 태스크(`//#format-and-lint`) 권장. 단점: Biome 버전/설정 변경 시 모든 태스크의 캐시 미스 [V: https://turborepo.dev/docs/guides/tools/biome]. 속도가 빨라 캐시 손실이 작다는 논리.
- **Oxlint:** 공식 가이드는 이번에 확인 못함 [U]. 구조는 Biome과 유사하게 루트 태스크가 가능 [I]. type-aware가 켜지면 교차 패키지 타입 정보에 의존하므로 `inputs` 설계가 필요 [I].

## 6. 마이그레이션 경로

- **A로 시작:** 가장 쉬움. Expo 템플릿이 이미 ESLint (`eslint-config-expo/flat`).
- **A -> C:** Oxlint는 ESLint 규칙을 대부분 네이티브로 지원. 점진적으로 규칙을 옮길 수 있다. `eslint-plugin-oxlint`로 겹치는 규칙을 ESLint에서 끄는 방식이 통상적이다 [U: 이번 세션 미확인].
- **A -> B:** Biome 마이그레이션 명령(`biome migrate eslint/prettier`)이 있다 [U: 이번 세션 미확인]. 그러나 `eslint-config-expo`와 type-aware 규칙 갭 때문에 완전 대체는 어렵다.

## 7. 하이브리드와 중복 비용

| 조합 | 장점 | 비용 |
|---|---|---|
| Oxlint(빠른 기본 + type-aware) + 좁은 ESLint (expo config, RN, 커스텀 selector) | 로컬 피드백 빠름 | **어차피 ESLint가 남는다** (`eslint-config-expo`, RN 규칙). 도구 2개, 설정 2개, 겹침 규칙 중복 off 관리. 두 번째 type 체크 경로 |
| Biome(format+lint) + 좁은 ESLint (type-aware, boundaries) | 포맷 빠름 | ESLint가 type-aware까지 전부 담당하게 되어 Biome의 이득이 작다. 규칙 겹침 |
| ESLint + Prettier만 | 도구 최소, 설정 1벌 | 느림 (type-check 지배) |
| Oxlint + oxfmt 단독 | 가장 빠름 | RN 규칙/Expo config 부재, JS plugin alpha, CSS는 Stylelint 별도 |

## 8. 추천

**지금은 A (ESLint flat + typescript-eslint + Prettier) + Stylelint(web CSS Modules)를 기본으로 한다.**

이유:
1. 요구사항 2(색/숫자 리터럴 금지)는 어느 도구든 **직접 규칙을 써야** 한다. ESLint의 `no-restricted-syntax` selector가 가장 검증된 경로다 [I]. Biome GritQL / Oxlint JS plugin은 실증 전이다.
2. `eslint-config-expo`가 ESLint 전용이라 ESLint는 어차피 남는다. 하이브리드는 도구만 늘린다.
3. 돈/보안 코드라 type-aware 규칙 완성도(61/61, 가장 오래 검증됨)가 중요하다. Biome는 nursery, Oxlint는 stable이 된 지 약 3개월이다.
4. VaultMe는 소형 모노레포라 속도 이득이 당장 크지 않을 가능성이 크다 [I].

주의/조건:
- `typescript`는 6.x 고정 (typescript-eslint가 TS 7 미지원) [V]. `tsc`를 TS 7로 쓰려면 별도 설치 필요.
- `eslint-plugin-react-native`는 쓰지 않거나 pin하고, 숫자 spacing까지 포함해 `no-restricted-syntax`로 직접 작성한다.
- 레이어 규칙은 `no-restricted-imports` + path override로 시작해 보고, 부족하면 `eslint-plugin-boundaries`를 추가한다 (flat config 호환성은 설치 전 확인 필요 [U]).

**재평가 트리거 (C로 이동):**
- typescript-eslint의 TS 7 지원이 계속 막혀 있고, TS 6 고정이 부담이 될 때.
- lint CI 시간이 실제로 문제가 될 때. 그때는 Oxlint type-aware를 CI의 type-aware 전용으로 올리고, ESLint는 expo/RN/custom 규칙만 남긴다.
- Oxlint JS plugin이 stable이 될 때.
- 포맷은 oxfmt의 Prettier 호환 수치와 stable 상태를 확인한 뒤 교체한다.

**Biome를 주력으로 추천하지 않는 이유:** type-aware 규칙이 nursery이고 정확도가 완전하지 않으며(`strict-boolean-expressions` 대응 없음 [U]), RN/Expo 규칙 세트가 없다. 포맷만 쓰는 것은 Prettier 대비 이득이 작고 도구가 늘어난다.

## 9. 검증 못한 항목 (다음 단계에서 spike 필요)

- Oxlint의 `no-restricted-syntax`, `import/no-restricted-paths` 존재 여부.
- Biome GritQL이 `StyleSheet.create({...})` 내부의 hex/숫자 리터럴을 매칭할 수 있는지.
- `eslint-plugin-boundaries` 현재 버전의 ESLint 9/10 flat config 지원, FSD 설정 예.
- Biome/oxfmt의 Prettier 호환 % 수치.
- Stylelint 규칙 이름 (`declaration-property-value-*` 계열) 현행 확인.
- 우리 repo에서의 실제 lint 시간 (A vs C type-aware).

## 10. 출처

- https://github.com/typescript-eslint/typescript-eslint/issues/12518 (TS 7 미지원)
- https://typescript-eslint.io/troubleshooting/typed-linting/performance/
- https://oxc.rs/blog/2026-07-22-type-aware-linting-stable
- https://github.com/oxc-project/tsgolint
- https://oxc.rs/docs/guide/usage/linter/type-aware.html
- https://oxc.rs/docs/guide/usage/linter/js-plugins.html
- https://oxc.rs/docs/guide/usage/linter/config.html
- https://oxc.rs/docs/guide/usage/linter/nested-config.html
- https://oxc.rs/docs/guide/usage/linter/rules.html
- https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports.html
- https://oxc.rs/docs/guide/usage/formatter.html
- https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html
- https://biomejs.dev/blog/biome-v2/
- https://biomejs.dev/internals/changelog/
- https://biomejs.dev/linter/plugins/
- https://biomejs.dev/linter/domains/
- https://biomejs.dev/linter/rules/no-floating-promises/
- https://biomejs.dev/linter/rules/use-exhaustive-switch-cases/
- https://biomejs.dev/linter/rules/no-restricted-imports/
- https://biomejs.dev/reference/configuration/
- https://biomejs.dev/guides/big-projects/
- https://biomejs.dev/internals/language-support/
- https://biomejs.dev/formatter/differences-with-prettier/
- https://docs.expo.dev/guides/using-eslint/
- https://github.com/Intellicode/eslint-plugin-react-native
- https://github.com/javierbrea/eslint-plugin-boundaries
- https://turborepo.dev/docs/guides/tools/biome
- https://turborepo.dev/docs/guides/tools/eslint
- https://peterbe.com/plog/benchmarking-oxlint-vs-biome (검색 요약으로만 확인)
