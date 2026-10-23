# VaultMe

[English](README.md)

Ethereum Sepolia 테스트넷용 self-custody 지갑입니다. 학습과 포트폴리오를 위해 만들고 있습니다.

이 모노레포에는 지갑 로직, React Native(Expo) 앱, 디자인 토큰, 설계 문서가 들어 있습니다.
실서비스 지갑이 아닙니다. 테스트 자금만 사용하세요.

> **상태: 2026-10-14**
> C1(`packages/wallet-core`), C2a(정적 화면이 있는 모바일 UI), Redesign A("한 화면, 한 질문", [PR #10](https://github.com/HyeokjaeChoi/vaultme/pull/10)), C2b(보안 저장소, 백업, 복구, 앱 잠금, 보내기)가 `main`에 merge되었습니다. C2b는 가짜 체인 어댑터를 씁니다. C3-6(#43)이 실제 체인 어댑터와 API client를 더했습니다. `EXPO_PUBLIC_API_URL`이 있으면 앱이 설치를 등록하고 `POST /v1/rpc`를 씁니다. 없으면 가짜 어댑터가 그대로 돌고 어떤 거래도 기기 밖으로 나가지 않습니다. `POST /v1/history`도 연결되어 있습니다. [ARCHITECTURE.md](ARCHITECTURE.md)가 지금 코드가 하는 일을 설명합니다.

## 여기서 시작

1. [제품 범위](PRODUCT.md): 목적, 제약, 브랜드 원칙.
2. [ARCHITECTURE.md](ARCHITECTURE.md): 목표, 시스템 구성, 데이터 흐름, 불변 조건, 보안 모델.
3. [결정 기록](docs/adr/): 채택된 architecture decision record(ADR).
4. [작업 workflow](docs/agents/workflow.md)와 [AGENTS.md](AGENTS.md): 이 저장소의 작업 방식.

ARCHITECTURE.md와 ADR은 영어로 쓰여 있습니다.

## 무엇인가

VaultMe는 seed phrase 기반 지갑입니다. Ethereum Sepolia에서 EVM 계정 하나를 씁니다. 첫 버전은 ETH와 Circle Sepolia USDC, 송신과 수신, 거래 상태를 다룹니다.
목표와 제외 범위(다중 체인, Mainnet, Smart Account, token approval)는 [ARCHITECTURE.md](ARCHITECTURE.md#goals-and-non-goals)에 있습니다.

지갑 행동을 읽기 쉽게 보여 주는 것이 원칙입니다. 서명 전에 계정, 네트워크, 자산, 받는 주소, 금액, 수수료를 보여 줍니다. 읽을 수 있는 서명은 안전 보장이 아닙니다.

## 저장소 구조

| 경로 | 역할 |
| --- | --- |
| `apps/mobile` | Expo 앱(`@vaultme/mobile`). Figma 디자인으로 만든 화면. `wallet-core`와 기기 저장소에 연결됨 (C3 전까지 가짜 체인) |
| `packages/wallet-core` | viem을 쓰는 순수 TypeScript: 키 파생, 금액, 위험 검사, 송신 상태. IO 없음 |
| `packages/tokens` | Style Dictionary로 token 원본에서 생성하는 디자인 토큰 |
| `packages/i18n` | i18next 기반의 타입 있는 한국어 문구 |
| `packages/config` | 공유 ESLint, TypeScript 설정 |
| `ARCHITECTURE.md` | 지금 코드가 하는 일: 구성, 데이터 흐름, 불변 조건, 보안 모델 |
| `docs/` | 작업 workflow, ADR(`docs/adr/`), OpenAPI 파일 |
| `scripts/` | 빠른 저장소 규칙 `check-repo-rules.sh` |
| `.claude/skills/` | Figma 화면, design-to-code, 리뷰 교훈용 프로젝트 skill |

## 실행과 검증

Node 24 이상과 pnpm 11.17.0이 필요합니다(`package.json`의 `packageManager`).

```sh
git config core.hooksPath .githooks   # once per clone
pnpm install
pnpm typecheck
pnpm format:check
pnpm lint
pnpm test
scripts/check-repo-rules.sh
```

모바일 앱을 시작합니다.

```sh
pnpm --filter @vaultme/mobile start   # Expo dev server
```

`packages/tokens`는 `build`에서 TypeScript 출력을 생성합니다. `typecheck`, `lint`, `test` script가 먼저 `build`를 실행합니다.
pre-commit hook은 stage된 파일에 ESLint `--fix`와 Prettier를 실행합니다. CI는 `scripts/check-repo-rules.sh`, `prettier --check .`, `pnpm turbo run typecheck lint test`를 실행합니다([ci.yml](.github/workflows/ci.yml)).

## 디자인 시스템

디자인 원본은 Figma 파일입니다: [VaultMe Foundation](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8).
`packages/tokens/tokens.json`이 token 값의 원본이고, `packages/tokens`가 이를 앱 상수로 바꿉니다.
앱 코드는 모든 색, 간격, radius, 글자 값에 `@vaultme/tokens`를 씁니다. 값과 컴포넌트 공통 규칙은 [DESIGN.md](DESIGN.md)에, 제품 용어는 [CONTEXT.md](CONTEXT.md)에 있습니다.

## 작업 방식

작업 하나는 GitHub issue 하나, branch 하나, pull request 하나입니다. 각 pull request는 CodeRabbit이 리뷰합니다.
단계는 [docs/agents/workflow.md](docs/agents/workflow.md)에 있습니다.

## README 동기화

`README.md`와 `README.ko.md`는 섹션과 링크 대상이 같습니다.
`scripts/check-repo-rules.sh`(규칙 R7)는 제목 수나 상대 링크가 다르거나, 링크한 파일이 없으면 실패합니다.
