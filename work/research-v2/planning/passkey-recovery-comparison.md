# Passkey 분실 복구 방식 비교

조사일: 2026-10-11  
상태: 조사와 설계 제안. 확정 설계와 구현 증거가 아님.  
대상: 신규 Passkey Smart account 후보. 기존 seed phrase EVM 계정은 별도 범위.

## 먼저 볼 결과

**기기 동기화, 추가 signer, 소유자 교체를 구분해야 한다.**

- 기기 동기화는 기존 credential을 다시 사용하는 방법이다.
- 두 번째 Passkey는 미리 등록한 다른 credential을 쓰는 방법이다.
- Guardian과 recovery key는 계정의 검증 규칙에 따라 소유자를 교체하는 방법이 될 수 있다.
- Passkey만 보관하면 RP domain 종료 위험이 남는다. 두 번째 Passkey도 같은 RP ID라면 이 위험을 공유한다.

앞의 구분은 WebAuthn의 credential 범위와 Smart account module 구조를 비교한 분석이다. WebAuthn은 Wallet의 복구 정책을 자동으로 만들지 않는다. [W3C WebAuthn §5.11](https://www.w3.org/TR/webauthn-3/#sctn-related-origins), [Safe Modules](https://docs.safe.global/advanced/smart-account-modules)

## 1. 제품과 표준에서 확인한 사실

| 출처 | 확인한 사실 | 적용 한계 |
| --- | --- | --- |
| Apple | iCloud Keychain은 승인된 기기에 Passkey를 동기화한다. 모든 기기를 잃은 경우 recovery contact 또는 escrow 복구 경로가 있다. Escrow 경로는 Apple Account 인증, trusted phone number와 기기 passcode 등 조건을 요구한다. | 모든 기기 분실과 Apple Account 접근 상실은 다르다. 복구 조건을 충족하지 못하면 성공을 보장할 수 없다. |
| Google | Google Password Manager의 새 환경 복호화에는 Google Account 로그인과 Android screen lock 또는 Google Password Manager PIN이 필요하다. | Google Account 복구만으로 Passkey 복호화가 끝난다고 볼 수 없다. |
| Yubico | YubiKey의 Passkey는 기기에 묶인다. 정상적인 방법으로 복사하거나 동기화할 수 없다. | 예비 YubiKey에는 별도 credential 등록이 필요하다. |
| Candide | Social Recovery Module을 Safe에 활성화하고 guardian과 threshold를 미리 설정한다. 문서의 기본 grace period는 3일이다. | 3일은 이 제품의 기본값이다. VaultMe 요구사항이나 모든 module의 공통 규칙이 아니다. |
| Candide Recovery UX API | Guardian threshold 충족 후 execute로 대기 기간을 시작한다. 기간 후 finalize로 새 owner를 적용한다. 기존 owner는 대기 중 취소할 수 있다. API 제출 성공은 owner 교체 완료와 다르다. | 현재 API 문서는 앱이 execute와 finalize endpoint를 호출해야 한다고 설명한다. 자동 복구를 가정하면 안 된다. |
| Google backup codes | Google 2-Step Verification의 대체 두 번째 단계이다. 각 코드는 1회용이다. 새 세트를 만들면 이전 세트가 무효가 된다. | Google 로그인 코드이다. EVM private key나 Wallet signer가 아니다. |

출처: [Apple iCloud Keychain 복구](https://support.apple.com/en-ie/guide/iphone/iph82d6721b2/ios), [Google 지원 환경](https://developers.google.com/identity/passkeys/supported-environments), [Yubico FAQ](https://docs.yubico.com/hardware/yubikey-guidance/best-practices/all-faq-passkeys.html), [Candide 설정](https://docs.candide.dev/wallet/plugins/how-to-add-a-guardian/), [Candide Recovery UX API](https://docs.candide.dev/wallet/recovery/ux-api/), [Google backup codes](https://support.google.com/accounts/answer/1187538?hl=en)

Apple의 recovery contact는 Apple Account 복구를 돕는 역할이다. Wallet contract의 guardian과는 다른 권한이다. Apple 설명에 따르면 contact는 계정에 접근하지 못하며 복구 코드를 제공한다. [Apple recovery contact](https://support.apple.com/en-us/102641)

## 2. 실패 상황별 비교

아래 표의 평가는 위 사실에 따른 설계 분석이다. VaultMe에서 실행한 결과가 아니다.

| 방식 | 사전 조건 | 기기 1개 분실 | 모든 기기 분실 | Apple·Google 계정도 사용 불가 | RP domain 통제권 상실 |
| --- | --- | --- | --- | --- | --- |
| Synced credential | 동기화 설정과 보관된 credential. 새 환경 복호화 수단 | 다른 승인 기기로 가능할 수 있음 | Provider 복구 조건 충족 필요 | 별도 보관 사본이나 Provider 복구가 없으면 경로 상실 | Credential이 남아도 기존 RP로 요청할 수 있는 경로 필요 |
| 두 번째 Passkey / security key | 독립 credential을 미리 account signer로 등록. 예비 기기를 따로 보관 | 등록된 예비 signer 사용 | 예비 hardware key가 남아 있으면 가능 | Cloud와 독립한 예비 key라면 대응 가능 | 같은 RP ID의 key라면 해결 못 함 |
| Guardian / social recovery | 미리 설치한 복구 규칙, threshold, 협조 가능한 guardian | 기존 signer 또는 복구 절차 | Guardian들이 남아 있으면 가능 | Guardian의 권한도 같은 Cloud에 의존하면 함께 실패 | 별도 RPC·client에서 contract 호출 가능하고 guardian 서명이 domain에 묶이지 않아야 대응 가능 |
| Recovery code / key | Code의 실제 권한 정의, 사전 등록, 별도 보관 | 해당 복구 규칙에 따라 가능 | 오프라인 사본이 남아 있어야 함 | 독립 key라면 대응 가능. Provider 로그인 코드이면 별도 검토 | Backend code만으로는 종료된 서버를 대체 못 함. On-chain recovery key는 별도 client 경로 필요 |

**복구 수단 개수와 실패 원인 개수는 다르다.** 같은 Google Account에 저장한 Passkey 두 개는 Cloud 접근 상실 위험을 공유한다. 같은 집에 둔 휴대전화와 예비 key는 화재·도난 위험을 공유한다. 이는 독립성을 판단하기 위한 설계 분석이다.

## 3. 공격과 운영 신뢰 경계

### Synced credential

신뢰 대상은 OS, credential provider, 기기 잠금과 Provider 복구 절차이다. Google은 end-to-end encryption을 설명한다. 이는 Provider가 credential을 자유롭게 읽는다는 뜻은 아니다. 다만 새 기기 승인과 계정 복구 정책에 운영 의존이 남는다. [Google Passkeys](https://developers.google.com/identity/passkeys/)

설계 제안: 복구 화면에서 “Apple Account 로그인 가능”과 “Passkey 사용 가능”을 별도 단계로 보여준다. 분실이 단순 고장인지, 공격자의 기기 접근인지 구분한다. 공격 의심 시 같은 key의 동기화만으로 종료하지 않는다. 새 signer를 등록하고 이전 signer를 account 검증 규칙에서 제거한다.

### 두 번째 Passkey / security key

별도 credential이므로 예비 key 분실·PIN 노출·악성 추가 등록을 관리해야 한다. 예비 credential이 단독 owner인지, 일정 threshold의 일부인지에 따라 자금 통제력이 달라진다. 추가 key를 등록했다는 사실만으로 Smart account에서 사용 가능한 signer가 되는 것은 아니다. Account가 그 public key를 받아야 한다. [Yubico FAQ](https://docs.yubico.com/hardware/yubikey-guidance/best-practices/all-faq-passkeys.html), [Safe Modules](https://docs.safe.global/advanced/smart-account-modules)

설계 제안: key 등록은 현재 권한의 재인증을 요구한다. 등록 후 예비 key로 실제 검증을 수행한다. 목록에는 이름, 등록일, credential 식별 정보와 제거 기능을 둔다. Cloud 사본 하나를 삭제해도 같은 synced credential의 다른 사본이 남을 수 있으므로, 공격 대응은 account 쪽 signer 제거로 처리한다.

### Guardian / social recovery

Threshold를 채운 guardian은 owner 교체 권한을 갖는다. 담합, 피싱, guardian 계정 탈취와 연락 불가를 고려해야 한다. Safe는 module이 임의 transaction을 실행할 수 있으며 악성 module이 계정을 장악할 수 있다고 명시한다. [Safe Modules](https://docs.safe.global/advanced/smart-account-modules)

설계 제안: Guardian 수보다 독립된 통제 주체를 먼저 평가한다. 이메일·SMS를 확인한 운영자가 guardian signature를 발급하면 그 운영자와 인증 채널이 신뢰 경계에 들어간다. Guardian은 account, chain, 새 owner, threshold, nonce를 확인해야 한다. 운영 서버 종료에 대비해 contract 주소·ABI·배포 버전과 별도 실행 절차를 보존한다. Gas와 RPC 접근도 준비한다.

### Recovery code / key

두 유형을 구분한다.

1. **Server recovery code:** 서버가 코드를 확인하고 권한을 바꾼다. 서버 가용성, 저장 방식, 시도 제한과 운영자 권한에 의존한다.
2. **On-chain recovery key:** 사전 등록된 key가 contract의 owner 교체를 승인한다. Key 보유자가 그 권한을 행사할 수 있다. 일반 로그인 code와 다른 비밀이다.

이는 VaultMe의 후보 구조를 나눈 것이다. 선정된 SDK의 현재 기능을 주장하는 내용이 아니다. Google의 8자리 backup code를 Wallet recovery key로 재사용해서는 안 된다. Google 문서는 해당 코드를 로그인 두 번째 단계로 한정한다. [Google backup codes](https://support.google.com/accounts/answer/1187538?hl=en)

설계 제안: 사용 후 code를 무효화하고 새 수단을 등록한다. Recovery key가 반복 사용 가능하다면 사용·노출 후 key를 회전한다. 직접 송금 signer보다 owner 교체 전용 권한을 검토한다. 모든 비밀은 실제 code·문서·Figma에 넣지 않는다.

## 4. 권한을 먼저 정한다

**예비 owner와 복구 전용 key는 권한이 다르다.** Owner threshold=1인 account에 두 번째 owner를 추가하면 그 key도 단독으로 즉시 자금을 이동할 수 있는 구조가 된다. 이를 지연 복구로 표시하면 안 된다. Recovery-only module은 owner 교체의 조건과 대기 시간을 따로 적용할 수 있다. 실제 권한은 선정한 account와 module 코드로 확인해야 한다. [Safe Modules](https://docs.safe.global/advanced/smart-account-modules), [Candide Recovery UX API](https://docs.candide.dev/wallet/recovery/ux-api/)

제안: 설정에 “즉시 서명 가능” 또는 “대기 후 owner 교체 가능”을 구체적으로 표시한다. Safe의 `Deploy a Recovery Safe` CLI guide는 lost signer 복구의 근거로 사용하지 않았다.

## 5. 지연·취소·회전 제안

| 작업 | 제안 | 주의점 |
| --- | --- | --- |
| 정상 기기에서 synced credential 사용 | 별도 recovery delay 없이 기존 signer 검증 | 기기 분실 공격이면 signer 회전 검토 |
| 예비 key로 직접 서명 | 설정된 signing threshold 적용 | 예비 key가 단독 owner이면 곧바로 자금 이동 가능 |
| Guardian owner 교체 | Threshold → on-chain 시작 → 대기 → finalize | 대기 길이는 사용자 위험과 대응 시간으로 별도 결정 |
| Code/key owner 교체 | 유출 위험에 따라 대기와 알림 검토 | 즉시 owner 교체 권한이면 비밀 탈취가 즉시 탈취로 이어질 수 있음 |
| 취소 | 권한 있는 기존 owner의 on-chain 취소 | 기존 signer를 모두 잃은 사용자는 이 취소 수단을 못 쓸 수 있음 |
| 완료 후 | 새 signer 검증, 이전 signer 제거, 세션·guardian·복구 key 점검 | UI 완료 표시는 chain 확인 후. RPC 결과가 불명확하면 Unknown |

Candide의 대기·취소·finalize는 제품 사실이다. 위 전체 흐름과 지연 정책은 VaultMe 제안이다. 지연은 공격을 자동 차단하지 않는다. 사용자가 알림을 받지 못하거나 취소 권한을 잃으면 보호 효과가 줄어든다. 공격자가 기존 signer를 장악한 경우 정당한 복구를 취소할 위험도 별도로 검토해야 한다. [Candide Recovery UX API](https://docs.candide.dev/wallet/recovery/ux-api/)

## 6. RP domain 종료의 별도 문제

WebAuthn은 RP ID와 origin을 검증한다. Related origins도 기존 RP ID의 HTTPS `/.well-known/webauthn` 문서가 필요하다. 새 domain을 만들었다고 기존 Passkey가 자동 이전되는 것은 아니다. [W3C WebAuthn §5.11](https://www.w3.org/TR/webauthn-3/#sctn-related-origins)

분석: 운영사 웹서버만 중단되고 domain 통제권은 남아 있으면, 같은 RP 조건에서 대체 client를 제공할 여지가 있다. Domain 통제권까지 잃으면 같은 Passkey만으로 보장할 수 없다. Native app도 임의의 domain 대체 수단으로 가정하면 안 된다. Platform association과 실제 지원 환경 검증이 필요하다.

설계 제안: 종료 대비 수단에는 기존 RP와 독립한 guardian 또는 EVM recovery key를 포함하는 방안을 검토한다. 별도 client로 새 RP의 signer를 등록할 수 있어야 한다. Bundler·paymaster·RPC의 한 사업자 의존도 확인한다. 이 경로는 실제 contract 배포와 대체 client 실험 전까지 미검증이다.

## 7. 기존 seed phrase EVM 계정과의 경계

기존 EOA는 private key로 transaction을 승인한다. Passkey credential이 기존 EOA private key를 재생성하지 않는다. 따라서 seed phrase import를 검토하는 기존 계정과 신규 Smart account의 guardian 복구를 동일한 기능으로 표시하면 안 된다. [Ethereum accounts](https://ethereum.org/developers/docs/accounts/)

설계 제안: 기존 EOA 복원에는 해당 seed phrase, 파생 규칙, 계정 선택과 별도 passphrase 유무를 확인한다. 신규 Smart account로 자산을 옮기는 것은 새 transaction과 사용자 검토가 필요한 별도 행동이다. EIP-7702 등 delegated EOA 구조는 별도 조사 대상이다. 이 문서는 그 복구·주소 유지·권한 제거를 검증하지 않았다.

## 8. 결정 전에 필요한 실제 검증

1. 후보 account의 signer·module·upgrade 권한을 확인한다.
2. 동기화한 Passkey와 별도 security key를 실제 account에 등록한다.
3. 모든 기존 기기를 제외한 환경에서 복구한다.
4. Cloud 로그인 불가와 기존 RP domain 불가를 각각 재현한다.
5. Guardian 담합·부족·교체와 악성 recovery 취소를 검사한다.
6. Execute, delay, cancel, finalize와 재시도·Unknown 상태를 검사한다.
7. 새 signer 동작과 이전 signer 거부를 chain에서 확인한다.
8. Chain별 배포·gas·대체 RPC·서비스 종료 실행 경로를 확인한다.

확인 전에는 “복구 보장”, “안전한 지갑”, “서비스 종료 후 항상 접근 가능”이라고 표시하지 않는다. 이 조사에서는 계정 생성, 비밀 입력, contract 배포와 runtime 검증을 수행하지 않았다.
