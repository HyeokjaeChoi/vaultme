# VaultMe Passkey 복구 선택 검토

작성일: 2026-10-11. 상태: 제안. 구현·실기기 검증·사용자 조사 결과가 아니다.

## 제안

첫 testnet 범위에서는 새 지갑에 Passkey를 쓴다. 추가 Passkey 등록과 실제 재접속을 검증한다. 같은 저장 계정의 동기화를 독립 복구로 표시하지 않는다. Guardian과 recovery secret은 다음 결정으로 남긴다. Imported seed EOA는 별도 복구 모델을 유지한다.

문제 가설은 “초보자가 시작은 했지만 기기 분실 후 같은 지갑으로 돌아올 방법을 이해하거나 검증하지 못한다”이다. Passkey 채택 자체를 성과로 쓰지 않는다. 현재 실제 사용자 문제의 빈도와 개선 수치는 확인하지 않았다.

## 공식 문서가 말하는 범위

Apple은 iCloud Keychain의 Passkey 동기화와 keychain recovery를 구분한다. 모든 기기에 접근할 수 없는 경우의 복구도 설계 목표에 포함한다. 따라서 동기화는 실제 편의가 있다. 다만 VaultMe가 Apple 계정 복구의 성공을 보증할 수는 없다. [Apple Platform Security](https://support.apple.com/guide/security/icloud-keychain-security-overview-sec1c89c6f3b/web)

Google Password Manager는 같은 Google Account로 Passkey를 동기화한다. 새 환경에서는 기존 Android 화면 잠금 또는 Google Password Manager PIN이 필요할 수 있다. 따라서 “휴대폰만 바꾸면 자동 복구”라는 설명은 조건을 빠뜨린다. [Google 지원 문서](https://support.google.com/chrome/answer/13168025?hl=en-0)

WebAuthn의 BE는 백업 가능 여부다. BS는 현재 백업 상태다. 이 값은 별도 제공자, 별도 계정 또는 모든 장애에 대한 복구 성공을 증명하지 않는다. hints는 강제 조건이 아니다. attestation 기본값은 none이다. 따라서 일반 등록 흐름에서 “다른 제공자에 저장했음”을 자동으로 보증한다고 가정할 수 없다. [WebAuthn Level 3, 5.4.7·5.8.5·6.1.3](https://www.w3.org/TR/webauthn-3/)

Google 개발 문서는 사용자 한 명에 여러 Passkey를 등록하는 구조를 설명한다. 제공자 식별은 attestation 등의 추가 조건에 영향을 받는다. Credential ID가 다르다는 사실과 저장·복구 경로가 독립이라는 사실은 다르다. [Google server registration](https://developers.google.com/identity/passkeys/developer-guides/server-registration)

Safe는 Passkey signer를 지원한다. Smart Account의 소유자와 recovery module은 별도 구성이다. Passkey 생성만으로 지갑 복구가 생기지는 않는다. 실제 owner 변경 경로를 구현해야 한다. [Safe Passkeys](https://docs.safe.global/advanced/passkeys/passkeys-safe), [Safe Smart Account](https://docs.safe.global/advanced/smart-account-overview)

Candide의 Guardian 복구는 사전에 설정한 guardian과 threshold를 쓴다. 요청, 승인, 실행, 유예 기간, 최종화가 필요하다. 실행 요청 성공은 소유권 변경 완료가 아니다. 이 경로는 사용자와 guardian의 접근성 및 계약·알림 운영을 요구한다. [Candide Recovery UX API](https://docs.candide.dev/wallet/recovery/ux-api/)

## 선택 비교

다음 평가는 위 구조에서 도출한 제품 판단이다. VaultMe에서 검증된 결과가 아니다.

| 선택 | 초보자 이점 | 공통 장애와 비용 | 이번 범위 |
| --- | --- | --- | --- |
| Synced Passkey | 익숙한 기기 잠금 사용. 다른 기기에서 접근 가능 | 같은 제공자 계정 분실·잠금·삭제의 영향을 함께 받음 | 기본 접근 수단. 독립 복구라는 표시는 금지 |
| 별도 등록한 backup Passkey | 새 키를 추가하고 즉시 사용 여부 확인 가능 | 같은 제공자 계정이면 독립성이 제한됨. 별도 기기·security key 확보 비용 | 우선 검증할 추가 수단 |
| Guardian | 기존 키와 저장 계정에 접근하지 못해도 다른 권한 경로 가능 | 연락 가능성, 본인 확인, 공모, threshold, 대기·취소·수수료 설계 필요 | 이번 MVP에서 제외하는 제안 |
| Recovery secret | 별도 오프라인 보관이면 제공자 계정과 다른 경로 가능 | 분실·복사·피싱 부담. 종이 보관과 복구 입력 UX 필요 | seed 없는 시작의 부담을 다시 만들 수 있어 보류 |

Recovery secret은 정의부터 필요하다. 원래 signer를 복원하는 secret인지, 별도 recovery signer인지 구분한다. 이 표만으로 계약·보관 방식이 결정되지 않는다.

## 독립성 판단

키 개수, 기기 개수, 복구 경로 개수를 따로 다룬다.

1. 같은 credential의 sync: 같은 키의 가용성을 늘린다.
2. 다른 credential을 같은 저장 계정에 등록: 별도 키지만 저장 계정 장애가 겹친다.
3. 다른 계정·제공자 또는 별도 hardware key: 공통 장애를 줄일 수 있다. 보관·접근 조건을 확인해야 한다.
4. Guardian·오프라인 secret: 다른 권한 경로다. 계약과 운영의 추가 위험을 함께 평가한다.

앱의 제어 범위 안에서는 다른 제공자를 항상 강제할 수 있다고 약속하지 않는다. native API·OS·기기별 검증이 필요하다. 저장 위치의 사용자 입력은 자기 보고다. 새 key의 서명 성공은 키 사용 가능 증거다. 최초 계정 없이 복구한 실험은 그 조건에서의 복구 증거다. 세 증거를 섞지 않는다.

## 온보딩과 입금 경계

첫 실행에서 탐색까지 강제 복구 설정으로 막지 않는 방안을 제안한다. 새 지갑 생성 후 “추가 접근 수단 미설정” 상태를 보인다. testnet 체험은 계속할 수 있게 한다. 두 번째 수단 등록과 재접속을 별도 과제로 측정한다.

향후 실제 자금 단계는 별도 승인 대상이다. Receive 화면에서 복구 설명·추가 키 등록·확인 단계를 배치하는 방안을 비교한다. 앱에서 Receive 버튼을 막아도 외부에서 주소로 보내는 자금까지 막을 수는 없다. 이를 자금 보호 보장으로 설명하지 않는다.

“backup 완료” 하나로 상태를 합치지 않는다. 제안 문구는 “추가 키 없음”, “추가 키 사용 확인”, “저장 경로 독립성 미확인”이다. 실제 확인된 정보만 표시한다. 동기화 상태를 얻지 못하면 “확인할 수 없음”을 쓴다.

Imported seed EOA에는 “Passkey로 복구”를 표시하지 않는다. 앱 잠금 수단으로 Passkey를 사용하더라도 EOA signer 복구와 구분한다. Smart Account로 옮기는 경우 주소·자산 이동·비용·권한 변경을 별도 결정으로 다룬다.

## 검증 계획

아래 숫자는 결과가 아니다. 실험 설계 제안이다. 본 실험 전에 표본과 합격 기준을 고정한다.

| 검증 | 방법 | 기록 |
| --- | --- | --- |
| 첫 시작 부담 | 초보자에게 testnet 지갑 생성과 잔액 확인 과제 부여 | 완료 수/시도 수, 소요 시간, 취소 위치, 도움 요청 수 |
| 복구 이해 | “휴대폰 분실”과 “저장 계정 접근 불가” 상황을 각각 설명하게 함 | 두 상황을 구분한 수/응답 수, 오해 원문 |
| 추가 키 실효성 | 다른 credential 등록 후 해당 키로 다시 서명 | Credential 구분, wallet address 유지, owner readback, 실패 원인 |
| Sync 범위 | 같은 제공자 계정의 다른 기기에서 재접속 | OS·앱 버전·provider·계정 조건, 성공/실패. 독립 복구로 집계하지 않음 |
| 독립 경로 | 최초 제공자 계정에 접근하지 않는 조건에서 추가 수단 사용 | 별도 저장 조건, 실제 서명, 동일 wallet 제어 증거 |
| Gate 비교 | 설명 후 연기 가능한 흐름과 Receive 시 필수 확인 흐름 비교 | 체험 완료, 설정 완료, 포기, 오해. 개선율은 조사 뒤 계산 |
| 키 관리 실패 | 추가 등록 취소·네트워크 실패·마지막 키 삭제 시도 | 잘못된 완료 표시 유무, 기존 키 유지, 재시도 결과 |
| Imported EOA 구분 | seed 복구 지갑과 새 Passkey 지갑 과제 비교 | 복구 경로 오인, 주소 확인, 자금 이동 오인 |

실기기 범위는 React Native iOS·Android다. emulator만으로 생체 인증·provider 선택·기기 교체를 검증했다고 보고하지 않는다. 같은 OS 교체와 OS 간 전환을 따로 기록한다. 지원 OS, RP ID 연결, native bridge, Smart Account signer 교체와 수수료 경로는 구현 전 확인 대상이다.

모든 실험은 testnet과 시험 계정을 사용한다. 보고서·로그·Figma에는 실제 seed와 private key를 넣지 않는다. 금융 행동 검토에는 account, network, asset, 전체 recipient/spender 주소, amount/allowance, estimated fee, status를 유지한다.

## STAR 포트폴리오 기록 방식

- Situation: 초보자가 복구 조건을 혼동한다는 가설. 실제 인터뷰·관찰로 확인할 부분을 명시한다.
- Task: 빠른 시작과 복구 경로 이해를 함께 개선한다. 실자금 보호 성과는 이번 범위 밖이다.
- Action: 복구 경로를 분리하고 추가 키 등록·실제 재접속·상태 문구·Receive 시점을 설계한다. 선택하지 않은 대안과 이유도 기록한다.
- Result: 조사 후 실제 완료율·오해·실패 사례와 표본 수를 기록한다. 아직 결과가 없으면 “설계 및 검증 계획”으로 표시한다.

현재 쓸 수 있는 결론은 “Passkey 기반 시작에서 복구 경로의 공통 장애를 분석하고 testnet 검증 범위를 정했다”이다. 이탈 감소·복구 성공률 개선·보안 향상 수치를 만들지 않는다.
