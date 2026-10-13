# VaultMe Icons 사용 안내

상태: 현행 Icon 계약 · 문서 갱신: 2026-10-04

범위: Phosphor regular·identity·foreground·접근성·license

[문서 홈](README.md) · [현재 release](vaultme-release.json) · [변경 이력](vaultme-v2-change-log.md)


**Icon은 목록을 빠르게 읽게 한다. 결정에 필요한 글자는 유지한다.** 기능 icon은 Phosphor regular다. 자산 identity는 별도 원본 color SVG다. [Catalog](wallet-icon-catalog.html)에서 실제 모양과 출처를 확인한다.

## 1. 용도

| 위치 | Icon | 함께 표시할 내용 |
| --- | --- | --- |
| 주요 행동 | Send, Receive, Connection, Refresh | 행동 label. Send·Approve·Sign·Revoke를 서로 구분 |
| 계정 | Wallet | 계정 이름. Review에서는 전체 주소 |
| Network | Ethereum identity | network 이름. 로고는 지원 network 구현이나 인증을 뜻하지 않음 |
| 자산 | ETH·USDC 원본 identity | 이름·symbol·balance. 미확인 자산에는 중립 fallback과 이름 |
| 상태 | Pending, Confirmed, Failed, Warning, Info, Unknown | 정확한 label과 이유. 검사 결과와 완료 사실을 구분 |
| Navigation | Assets, Activity, Settings | visible label과 선택 상태 |

Account, network, asset, recipient/spender, amount/allowance, estimated fee, action status는 Review에서 생략하지 않는다. Full address와 warning도 유지한다. Icon·색만으로 안전성이나 성공을 전달하지 않는다. 같은 network의 Asset row는 상단 context의 반복 label만 생략한다. 다른 network의 행에는 label을 남긴다.

## 2. 크기와 색 alias

16 / 20 / 24 / 32 px의 기존 scale을 사용한다. Icon 크기와 클릭 target은 다르다. Target은 최소 44 × 44 px다. Raw 값 추가 없이 기존 Primitive → Semantic → Component를 연결한다.

| Component 경로 | Alias / 용도 |
| --- | --- |
| `icon.size.inline/control/feature` | `iconSize.inline/control/feature`: 16/20/24 px |
| `icon.action.fg` | `{icon.primary}`: 일반 행동 |
| `icon.action.onPrimary` | `{action.primary.fg.default}`: Blue Primary 위 white |
| `icon.account.fg`, `icon.account.size` | `{icon.primary}`, `{iconSize.control}` |
| `icon.network.size`, `icon.network.fallbackFg` | `{iconSize.inline}`, `{icon.secondary}` |
| `icon.asset.size`, `icon.asset.fallbackFg` | `{iconSize.asset}`: 32 px, `{icon.secondary}` |
| `icon.navigation.fg`, `icon.navigation.activeFg` | `{icon.secondary}`, `{icon.primary}`. 선택 표시는 기존 active state도 유지 |
| `icon.status.pending/warning` | `{status.warning.fg}` |
| `icon.status.confirmed` | `{status.success.fg}`: 확인한 완료만 |
| `icon.status.failed/info/unknown` | `status.danger/info/unknown.fg` 각각 alias |
| `icon.status.clear` | `{check.clear.fg}`: 제한된 검사 결과. 안전 보증 아님 |

Semantic `iconSize.asset={size.avatar_sm}`와 Component `icon.*` 20개를 추가했다. 기존 경로는 유지한다. Functional SVG의 `currentColor`는 문맥의 foreground에 연결한다. Asset logo의 원본 fill·opacity는 유지한다. Logo를 action blue로 바꾸지 않는다. 웹 identity는 `<img>`로 표시해 기능 SVG의 `fill:currentColor`와 분리한다.

## 3. 접근성

- Label 옆 SVG와 img는 `aria-hidden="true"`다. 같은 이름을 두 번 읽지 않게 한다.
- Icon-only control에는 행동을 설명하는 `aria-label` 등 accessible name을 둔다. 예: `Copy recipient address`, `Close review`.
- 중요한 금융 행동은 icon + visible label을 사용한다. Tooltip만으로 설명하지 않는다.
- 44 px target, focus ring, keyboard order와 disabled 이유를 유지한다. Glyph가 있다고 동작을 구현한 것은 아니다.
- 금액·warning·확인 행동에 icon 애니메이션을 추가하지 않는다.

## 4. 관측과 선택의 근거

기존 browser 조사에서 [21st.dev Phosphor](https://21st.dev/community/icons/phosphor)의 Wallet Details를 확인했다. Author `Phosphor Icons`, MIT 링크와 React/SVG/Vue/React Native 형식 선택을 관측했다. `wallet` 검색은 관련 항목도 반환했다. Ethereum 검색의 `currency-eth`는 기능 glyph이며 원본 자산 identity와 다르다. 이 화면 확인을 전체 product flow 조사로 확대하지 않는다. [Browser 기록](../work/research-v2/icons/21st-browser-observations.json).

| Source | License / 사용 |
| --- | --- |
| [Phosphor core](https://github.com/phosphor-icons/core) | [MIT 원문](https://github.com/phosphor-icons/core/blob/main/LICENSE). 기존 regular 기능 23개. License notice 유지 |
| [Cryptocurrency Icons](https://github.com/spothq/cryptocurrency-icons) | [CC0-1.0 원문](https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/LICENSE.md). Community ETH·USDC identity 2개. Issuer 인증이나 최신 공식 brand palette로 주장하지 않음 |

ETH `#627EEA`, USDC `#3E73C4`는 원본 artwork 색이다. VaultMe canonical palette 변경이 아니다. 서로 다른 기능 icon library를 섞지 않는다. [Source 연구](../work/research-v2/icons/research.md), [계획](../work/research-v2/icons/icon-plan.md), [Native manifest](../work/research-v2/icons/figma-assets.json).

## 적용과 재사용

Figma의 `INSTANCE_SWAP`은 vector foreground를 초기화할 수 있다. Swap 뒤 가장 구체적인 문맥 Component token을 다시 연결하고 frame을 확인한다. Primary icon은 `icon.action.onPrimary`의 white다. Disabled는 Button의 disabled foreground를 따른다. 웹 기능 icon은 문맥의 `currentColor`를 따른다.

`Icon`/`ShowIcon`, `AssetIcon`, `NetworkIcon` property는 additive다. 기존 master ID와 property 계약을 보존한다. Asset logo의 고유 fill은 유지한다. Icon이 있다고 연결·서명·revoke 기능이 구현된 것은 아니다.

Local 파일, native source, Library publication, consumer adoption은 각각 확인한다. 현재 결과는 [release record](vaultme-release.json)를 따른다. 이전 제한된 browser 관측은 [변경 이력](vaultme-v2-change-log.md)에서 찾는다.
