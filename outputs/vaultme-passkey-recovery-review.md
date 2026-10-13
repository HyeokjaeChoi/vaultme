# VaultMe — Passkey 복구와 구현 범위 비교

> 후속 결정: 사용자는 첫 버전을 신규·기존 모두 seed phrase 기반으로 진행하기로 했다. 아래 Passkey 구조는 후속 검토 자료이며 첫 버전 요구사항이 아니다.

확인일: 2026-10-11. GPT-6.1 Sol 에이전트 4개 조사 결과를 취합했다.

상태: 공식 문서 기반 설계 검토. Native 빌드, contract 배포, 실제 기기·복구 실행은 하지 않았다. 아래 난이도는 상대적 판단이며 일정 견적이나 구현 완료 증거가 아니다.

## 결론

신규 Passkey Smart Account와 기존 phrase EOA 복구를 분리하는 방향은 가능하다. 첫 후보는 기존 Safe 구현과 Passkey signer, ERC-4337을 활용하는 방식이다. 사용자 1명에게 두 종류를 모두 생성하도록 요구하지 않는다. 사용자가 선택한 경로의 계정 1개를 활성화한다.

첫 Testnet 복구 범위는 동기화 재접속과 별도 Passkey signer 등록·재접속·교체까지로 제한하는 안을 권고한다. 이는 모든 키 분실이나 RP domain 상실까지 해결하는 출시용 복구 설계가 아니다. 이 제한을 승인할지 다음 질문에서 결정한다.

신규 사용자는 phrase를 보관하지 않는다. 대신 추가 접근 수단의 설정·보관 부담이 있다. 기존 phrase 사용자에게는 기존 파생 경로의 EOA 주소를 복원한다. 새 Passkey를 만들었다고 기존 주소나 자산이 자동으로 이전되지 않는다.

## 1. 무엇을 잃었는지부터 구분한다

| 상황 | 필요한 경로 |
|---|---|
| 휴대폰 1대 분실 | 남은 동기화 기기 또는 provider의 복구 조건을 충족한 새 기기 |
| 최초 provider 계정 접근 상실 | 다른 저장 경로에 미리 등록한 별도 signer |
| 모든 Passkey 접근 상실 | 사전 등록한 Guardian 또는 독립 recovery key 등 다른 권한 경로 |
| VaultMe domain 통제권 상실 | 기존 RP ID에 의존하지 않는 복구 권한과 실행 client |

Apple과 Google의 동기화에는 각 provider의 계정·복호화 조건이 있다. Apple Account 로그인 복구와 wallet signer 복구는 같은 기능이 아니다. 같은 credential을 여러 기기에 동기화한 것은 별도 signer 여러 개를 등록한 것과 다르다. [Apple](https://support.apple.com/en-us/102195), [Google](https://developers.google.com/identity/passkeys/supported-environments)

## 2. 복구 선택 비교

난이도는 기본 Passkey 계정 위에 추가되는 상대적 부담이다.

| 선택 | 복구 가능한 조건 | 사용자 부담 | 구현 부담 | 남는 한계 |
|---|---|---|---|---|
| 동기화 Passkey만 | 기존 credential과 provider 복구 조건이 남음 | 낮음 | 낮음–중간 | provider 접근 상실, credential 삭제, domain 상실 |
| 별도 Passkey 또는 security key | 미리 등록한 다른 signer가 남음 | 예비 수단 보관·등록 | 중간 | 같은 provider·RP ID면 공통 실패. 모든 키 분실에는 부족 |
| Guardian + 지연 복구 | 사전 등록한 복구 주체가 threshold 충족 | 지인 선정·연락·대기 | 높음 | guardian 탈취·담합·연락 불가, 모니터링·취소·gas |
| 독립 recovery key | 별도 보관한 비밀과 실행 경로가 남음 | 비밀 백업·분실 관리 | 중간–높음 | 비밀 보관 부담이 돌아옴. 권한에 따라 즉시 자금 통제 가능 |

Guardian 복구는 사전 설정, 승인 수, 대기, 취소, 최종 owner 변경을 포함한다. 구체적인 정책은 module마다 다르며 아직 선정하지 않았다. 일반 로그인 recovery code는 on-chain 복구 권한이 아니다. [Candide Recovery UX](https://docs.candide.dev/wallet/recovery/ux-api/), [Safe Modules](https://docs.safe.global/advanced/smart-account-modules)

### 추가 키의 권한

threshold=1인 계정의 두 owner는 각각 단독 실행 권한을 가진다. 추가 Passkey를 이 방식으로 등록하면 즉시 송금할 수 있으므로 “복구만 가능한 키”라고 부르지 않는다. 복구 전용 지연 권한은 별도 module과 검증이 필요하다. 이번 최소 후보는 두 signer 중 하나로 실행하는 방식이지만, 최종 SDK·contract에서 지원과 권한을 확인해야 한다.

추가 credential ID가 다르다는 사실만으로 다른 provider에 보관됐다고 보증할 수 없다. WebAuthn의 backup 상태도 저장 경로 독립성을 증명하지 않는다. 따라서 실제 재접속 시험과 저장 조건을 따로 기록한다. 두 Passkey가 같은 RP ID에 묶이면 domain 상실 문제도 남는다. [WebAuthn](https://www.w3.org/TR/webauthn-3/)

## 3. 구현 복잡도

| 작업 | 판단 | 추가되는 책임 |
|---|---|---|
| EOA phrase 복원 | 중간 | 지원 path, passphrase 정책, 로컬 키 보관, nonce·fee·전송 상태 |
| Native Passkey | 중간 | iOS Associated Domains/AASA, Android Digital Asset Links, native build, 등록·취소·서명 직렬화 |
| Safe + ERC-4337 | 높음 | 계정 배포, verifier/module 버전, UserOperation, bundler, fee와 제출 상태 |
| 재설치 후 재접속 | 중간–높음 | credential과 기존 account 주소·chain·설정의 매핑 재발견 |
| 추가 signer | 중간 | owner 추가·검증·제거·교체, 마지막 수단 제거 방지, 실패·Unknown |
| Guardian·domain 독립 복구 | 높음 | 별도 복구 contract, 권한·지연·취소·알림, 대체 client 검증 |

Safe는 React Native·Expo Passkey 예제를 제공한다. 이것은 구현 출발점이며 production key 관리나 완전한 복구 증거는 아니다. 예제의 개발 owner private key를 앱 bundle에 넣는 구조는 채택하지 않는다. local metadata만 저장하면 재설치 후 같은 계정을 찾지 못할 수 있으므로 별도 검증이 필요하다. [Safe RN 예제](https://docs.safe.global/advanced/passkeys/tutorials/react-native)

Native module과 entitlement 변경에는 앱 빌드가 필요하다. Make Prototype은 이 동작을 검증하지 못한다. 등록한 Passkey가 존재하는지, 동기화됐는지, on-chain signer로 활성화됐는지, 해당 지갑을 다시 찾을 수 있는지는 별도 상태다. [Expo native code](https://docs.expo.dev/workflow/customizing/), [Apple](https://developer.apple.com/documentation/authenticationservices/supporting-passkeys), [Android](https://developer.android.com/identity/credential-manager/prerequisites)

## 4. 첫 구조 제안

- 신규: Safe Smart Account + Passkey signer를 우선 기술 검증 후보로 둔다. 직접 verifier·복구 contract를 처음부터 작성하지 않는다.
- 기존: 지원 path 하나의 phrase EOA를 복구한다. Passkey 계정으로 자동 변환하지 않는다.
- 공유: 자산·금액·Review·상태 UI와 Foundation. 서명·제출은 account 유형별 adapter로 분리한다.
- 식별자: UserOperation hash와 transaction hash를 구분한다. 인증 성공과 chain 확정을 구분한다.
- gas: 첫 범위는 native test coin 사용을 기본 후보로 한다. Paymaster 후원은 필수가 아니며 별도 결정이다.
- chain: EVM Testnet 하나 원칙을 유지한다. Safe·verifier·EntryPoint·bundler 배포 조합을 확인하고 이름을 정한다.
- 7702: 이번 기본안에서 보류한다. 기존 EOA 키 권한, 위임 변경·해제·초기화 검증이 추가된다. [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)
- PRF: 이번 신규 Smart Account의 필수 기능이 아니다. 기존 seed 암호화는 다른 문제이므로 범위를 섞지 않는다.
- Admin: Passkey를 위해 다시 도입하지 않는다. 앞선 Admin 범위는 재검토 중이며 최종 포함 여부는 별도 확정한다.

일반 서버 로그인은 필수가 아니다. 그러나 RP domain 운영, 공개 account metadata 발견, RPC/bundler 접근 같은 서비스 의존성은 남을 수 있다. 공개 metadata 서비스는 서명 권한을 갖지 않도록 설계하며 가용성·개인정보·무결성 검증을 구분한다.

## 5. 검증할 최소 범위 — 아직 실행하지 않음

1. iPhone·Android 실제 기기에서 Passkey 생성·서명·취소를 확인한다. 지원 OS/provider/build 조합을 기록한다.
2. 한 Testnet에서 신규 account를 만들고 native coin·지정 ERC-20 송신을 확인한다.
3. 앱 데이터 삭제·재설치 후 credential과 같은 지갑 주소를 다시 찾는다.
4. 별도 signer를 추가하고 최초 signer 없이 동일 계정에서 실행한다. 같은 provider 동기화 시험과 독립 경로 시험은 따로 기록한다.
5. 남은 signer로 새 signer를 등록하고 이전 signer를 제거한다. 이후 이전 signer의 실행이 거부되는지 확인한다.
6. gas 부족, bundler/RPC timeout, 제출 결과 Unknown과 재진입을 확인한다. 자동 중복 송신은 하지 않는다.
7. 기존 EOA 복원 주소와 전송을 별도 검증한다. 같은 화면이 다른 계정 복구 방식을 잘못 안내하지 않는지 확인한다.

모든 키 분실·RP domain 상실은 위 범위로 해결됐다고 보고하지 않는다. 실제 자금 출시 전에는 독립된 복구 경로가 별도 설계·검증돼야 한다. 현재 단계는 설계이며 이 검증 목록이 곧 실행 승인이나 완료를 뜻하지 않는다.

## 6. STAR로 남길 내용

- S: 신규 사용자의 phrase 보관 부담과 기기 분실 시 복구 오해를 문제 가설로 둔다. 실제 인터뷰로 확인한다.
- T: phrase 없는 시작과 복구 조건 이해를 함께 검증한다. 기존 EOA 가져오기 호환성을 유지한다.
- A: 동기화·추가 signer·Guardian 대안을 비교하고, 추가 signer 재접속 및 키 교체를 좁은 Testnet 범위로 검증한다.
- R: 온보딩 완료/시도 수, 완료 시간, 도움 요청, 복구 조건 이해, 동일 주소 재접속·이전 키 거부 결과를 기록한다. 아직 측정값은 없다.

## 7. 다음 요구사항 질문

첫 Testnet 복구 범위를 동기화 재접속과 별도 Passkey signer 추가·교체까지로 정할지 확인한다. 모든 Passkey와 RP domain을 잃은 경우의 Guardian·독립 recovery key는 후속 설계로 두는 안을 권고한다. 이 제한을 수용할 수 없다면 첫 범위부터 복구 전용 경로를 설계해야 한다.

## 상세 조사 4개

- [분실 상황별 복구 비교](../work/research-v2/planning/passkey-recovery-comparison.md)
- [iOS·Android 구현 복잡도](../work/research-v2/planning/passkey-mobile-complexity.md)
- [계정·서명·전송 구조](../work/research-v2/planning/passkey-account-architecture.md)
- [제품·온보딩·STAR 검토](../work/research-v2/planning/passkey-product-tradeoffs.md)
