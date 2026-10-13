# VaultMe mobile Passkey 구현 복잡도

확인일: 2026-10-11. 범위: React Native + TypeScript, iOS/Android. 이 문서는 공식 문서 조사다. 앱 설치, native 빌드, 실제 서명, 동기화, on-chain 실행은 수행하지 않았다.

## 결론

신규 Passkey smart account는 가능성 검토를 진행할 수 있다. 다만 TypeScript 화면 추가만으로 끝나지 않는다. native 바이너리, 소유 domain, WebAuthn 검증, smart account 검증기, 복구 정책을 함께 준비해야 한다. 기존 seed EOA와 별도 계정 유형으로 다루는 것이 현재 가정에 맞다. EOA의 주소와 자산이 Passkey 생성만으로 이전되지는 않는다. EOA는 private key로 제어되고 contract account는 코드로 제어된다. [Ethereum accounts](https://ethereum.org/developers/docs/accounts/)

복잡도 평가는 조사자의 판단이다. native 생성·assertion은 중간, domain·서명 검증·release 서명 설정은 중간 이상, smart account와 복구 연결은 높음이다. 기간은 기존 앱 상태와 선택할 SDK·chain을 확인하기 전에는 확정할 수 없다.

## 서로 다른 기능

| 기능 | 실제 역할 | 별도 확인 사항 |
|---|---|---|
| OS local authentication | Face ID, Touch ID, fingerprint 등으로 사용자를 확인한다 | 기존 EOA key 보호·해제 정책. Passkey를 만들지 않는다 |
| Passkey 등록 | credential key pair를 만든다. public key와 credential ID를 등록한다 | RP ID, challenge, native domain 연결, 검증 |
| Passkey assertion | authenticator가 WebAuthn 데이터에 서명한다 | challenge, origin, RP ID hash, UV, signature 검증 |
| smart account 승인 | 계정 코드가 assertion을 거래 승인으로 인정한다 | chain·account·nonce·실행 내용에 challenge 결합, replay 방지 |
| PRF | credential에 연결된 대칭 secret을 얻는 선택 확장이다 | provider 지원, native bridge, 복구·동기화 시 동일 출력 |

LocalAuthentication은 OS 인증 API다. Passkey 생성·assertion API와 별개다. 사용자 확인이 성공해도 거래가 실행되거나 안전성이 검증된 것은 아니다. [Expo LocalAuthentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/), [Apple Supporting passkeys](https://developer.apple.com/documentation/authenticationservices/supporting-passkeys), [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)

WebAuthn assertion은 임의 EVM transaction을 직접 서명하는 API가 아니다. 이 조사에서는 거래 digest를 challenge에 결합하고 smart account 검증기가 이를 확인하는 구조를 가정한다. 최종 구조는 선택할 account SDK와 verifier 조사로 확정해야 한다. P-256/WebAuthn 검증을 지원한다는 mobile library 설명만으로 chain 지원을 선언하면 안 된다. [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)

## native 및 domain 조건

### iOS

AuthenticationServices를 호출한다. `ASAuthorizationPlatformPublicKeyCredentialProvider`의 RP ID는 앱의 associated domain과 연결되어야 한다. `webcredentials:<domain>` entitlement와 domain의 `/.well-known/apple-app-site-association`에 Team ID·Bundle ID 연결이 필요하다. Apple은 associated domain이 없으면 등록·assertion 요청이 오류로 끝난다고 명시한다. [Supporting passkeys](https://developer.apple.com/documentation/authenticationservices/supporting-passkeys), [Apple sample setup](https://developer.apple.com/documentation/authenticationservices/connecting-to-a-service-with-passkeys)

iCloud Keychain은 Passkey를 Apple 기기 사이에 동기화할 수 있다. external credential provider도 존재한다. 따라서 앱이 private key를 export하거나 동기화 서버를 직접 구현하는 구조로 가정하면 안 된다. 동기화 사용 여부와 provider 상태는 실제 기기로 확인해야 한다. [Apple Passkeys](https://developer.apple.com/passkeys/)

### Android

Credential Manager의 public-key credential 생성·조회 API를 사용한다. Passkey 대상은 Android 9/API 28 이상이다. domain에는 `/.well-known/assetlinks.json`이 필요하다. package name과 서명 인증서의 SHA-256 fingerprint를 맞춰야 한다. debug 키, release 키, Play App Signing 키를 같은 값으로 가정하면 안 된다. 파일은 redirect 없이 HTTP 200과 JSON 응답으로 제공해야 한다. [Create a passkey](https://developer.android.com/identity/passkeys/create-passkeys), [Credential Manager prerequisites](https://developer.android.com/identity/credential-manager/prerequisites)

Credential Manager는 provider를 사용한다. 등록 성공은 다른 provider·다른 OS에서의 복원을 보장하지 않는다. 이번 조사에서는 Android PRF 전체 provider·OS 지원표를 공식 문서에서 확정하지 못했다. 이를 미지원으로 단정하지 않고 실제 provider별 검증 대상으로 남긴다.

### React Native / Expo

TypeScript와 Swift/Kotlin 사이의 native module이 필요하다. Expo를 쓰면 해당 module을 포함한 development build를 만든다. Expo Go는 포함되지 않은 native module을 실행하지 못한다. native 의존성·entitlement·manifest를 바꾸면 native 앱을 다시 빌드해야 한다. JS OTA 업데이트만으로 이를 배포할 수 있다고 가정하면 안 된다. EAS는 선택 사항이며 local build도 가능하다. [Expo custom native code](https://docs.expo.dev/workflow/customizing/), [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)

소유 domain, 안정된 RP ID, Team ID/Bundle ID, Android package/signing certificate, iPhone·Android 실제 기기 접근을 spike의 사전 조건으로 둔다. domain 교체와 credential 복구는 이후 운영 위험이다. 제품 domain을 임의로 확정하지 않는다.

## library 후보의 현재 상태

`f-23/react-native-passkey`는 spike 후보로만 제안한다. GitHub API live readback에서 archived=false, 최근 push는 2026-09-08, 최신 release는 `v3.6.2`(2026-09-08)였다. 확인한 commit은 `de644ad1ec7bc1b28921e6ab8050411a66ba7642`다. 이는 최근 유지보수의 증거이며 VaultMe 호환성의 증거는 아니다. [repository API](https://api.github.com/repos/f-23/react-native-passkey), [release v3.6.2](https://github.com/f-23/react-native-passkey/releases/tag/v3.6.2)

고정 commit README는 native iOS/Android API와 create/get, 취소·credential 없음 구분, PRF 지원을 설명한다. PRF는 v3.3부터 Android 및 iOS 18+라고 명시한다. Android 입력은 표준 WebAuthn JSON에 맞춰 Base64URL로 정규화한다. 이 내용은 library 작성자의 지원 계약이다. 모든 Android provider 또는 VaultMe Expo/RN 버전에서의 실제 성공을 증명하지 않는다. [고정 README](https://github.com/f-23/react-native-passkey/blob/de644ad1ec7bc1b28921e6ab8050411a66ba7642/README.md)

채택 전 확인: 현재 앱의 React Native·Expo·New Architecture·Xcode·Gradle 조합, create/get 오류 매핑, CBOR/public key 추출, signature 직렬화, PRF 입력·출력 encoding. 이번 조사에서는 설치·빌드·dependency audit를 수행하지 않았다. library의 iOS 최소 버전 표기와 제품이 지원할 실제 동기화 Passkey 최소 버전을 같은 의미로 사용하지 않는다.

## PRF를 필수 경로에 넣지 않는 이유

WebAuthn PRF는 credential별 32-byte 출력 확장이다. private key export가 아니다. smart account에서 Passkey public key를 검증하는 기본 경로에 PRF가 반드시 필요한 것은 아니다. PRF로 EOA key를 암호화하는 설계는 별도 key 관리·복구 설계다. [WebAuthn PRF](https://www.w3.org/TR/webauthn-3/#prf-extension)

Apple은 native PRF API를 제공한다. 그러나 API 존재와 특정 provider·OS의 출력 호환성은 다르다. Apple engineer는 과거 iOS hybrid/local PRF 불일치가 버그였고 iOS 18.4/macOS 15.4 beta에서 수정된다고 답했다. 과거 버전의 문제가 현재 모두 재현된다는 뜻은 아니다. 암호화 복구를 PRF에 의존하면 같은 salt의 반복·동기화·cross-device 출력 검증이 필요하다는 근거다. [Apple PRF API](https://developer.apple.com/documentation/authenticationservices/asauthorizationpublickeycredentialprfassertioninput-swift.struct), [Apple engineer 답변](https://developer.apple.com/forums/thread/764730)

## 취소·미지원·분실 상태

| 상태 | 필요한 처리 |
|---|---|
| 사용자가 취소 | 검토 화면으로 돌아간다. 자동 재요청이나 거래 제출을 하지 않는다 |
| credential 없음 | 재시도·다른 credential·사전에 등록한 복구 수단을 표시한다 |
| OS/provider 미지원 | 신규 Passkey 경로를 제한한다. 기존 seed EOA 가져오기는 별도 명시적 선택으로 유지한다 |
| domain 검증 실패 | 설정 오류로 표시한다. 사용자 취소로 처리하지 않는다 |
| 인터넷/서버 실패 | 등록·검증 단계 상태를 구분한다. 불완전 등록의 재시도를 멱등하게 설계한다 |
| 기기 분실·provider 접근 상실 | 동기화 기기 또는 사전 등록한 recovery signer를 사용한다. 새 Passkey 생성만으로 기존 계정 권한을 주지 않는다 |
| 제출 뒤 결과 불명 | nonce·UserOperation/transaction 식별자로 상태를 조회한다. 재서명·재제출을 자동 반복하지 않는다 |

Android 공식 문서는 cancellation, no credential, unsupported, provider 설정 오류를 서로 다른 exception으로 다룬다. iOS도 `ASAuthorizationError`를 처리해야 한다. 위 표의 wallet 동작은 제품 설계 제안이다. 실제 wallet recovery 기능이 존재한다는 주장이 아니다. [Credential Manager troubleshooting](https://developer.android.com/identity/sign-in/credential-manager-troubleshooting-guide), [Apple Supporting passkeys](https://developer.apple.com/documentation/authenticationservices/supporting-passkeys)

Passkey 삭제와 smart account signer 제거도 다르다. provider에서 credential을 삭제해도 on-chain 등록이 자동 해제된다고 가정하지 않는다. recovery signer 교체·추가·해제에는 해당 account의 권한 규칙과 실제 검증 증거가 필요하다.

## 최소 technical spike

1. 실제 자산과 분리한 개발 RP domain을 준비한다. AASA와 Digital Asset Links 응답·entitlement·signing fingerprint를 기록한다.
2. 고정 library 버전으로 iOS/Android development build를 만든다. `create`, `get`만 노출한 작은 화면을 만든다. domain 설정이 없는 실패도 확인한다.
3. synthetic user와 challenge로 등록한다. public key·credential ID를 기록한다. assertion을 검증한다. challenge/origin/RP ID/UV 변조와 replay가 거부되는지 확인한다. 민감 데이터는 log에 남기지 않는다.
4. 실제 iPhone 1대와 Android 1대에서 생성·재실행·취소·credential 없음·provider 미지원 상태를 확인한다. simulator/emulator는 UI·빌드 보조 증거로만 기록한다. 실제 기기 성공을 대체하지 않는다.
5. 두 번째 기기가 있으면 동일 provider의 동기화·재설치 후 접근을 확인한다. Apple→Android 자동 동기화를 가정하지 않는다. cross-device 요청과 provider 동기화를 구분해서 기록한다.
6. 선택한 smart account SDK·testnet 하나에서 challenge에 action digest를 결합한다. 서명 검증과 한 번의 synthetic 실행을 확인한다. 예상 fee, 계정, network, recipient 전체 주소, amount, pending/confirmed/failure를 기록한다. native 인증 성공과 chain 성공을 따로 판정한다.
7. PRF는 선택 실험으로 분리한다. `enabled`/출력 없음, 같은 입력 반복, 두 입력, provider 변경, 동기화 기기, native/hybrid 차이를 확인한다. 기본 account 생성의 통과 조건으로 삼지 않는다.
8. 분실 모의 시험을 한다. 기존 credential 없이 등록한 recovery 경로가 작동하는지 확인한다. 구현 전이면 '복구 미구현'으로 기록하고 출시 준비 완료를 선언하지 않는다.

통과 산출물: build/version/기기·OS/provider 표, domain 응답, synthetic 등록·assertion 검증 결과, 실패 상태 화면, testnet operation 식별자·receipt, 복구 성공 또는 미구현 범위. Simulator만의 성공, 문서의 지원 표기, library release만으로 완료 처리하지 않는다.

## 결정이 필요한 항목

- 실제 RP domain과 최소 OS 지원 버전.
- smart account SDK, validator, chain, bundler/paymaster 범위.
- 신규 account에서 recovery signer를 언제·어떻게 등록할지.
- 기존 seed EOA에서 자산을 이동할지. 이동은 별도 on-chain 행동이다.
- 동기화 provider가 없거나 Passkey를 전부 잃었을 때의 제품 정책.

이 파일은 조사 결과다. Foundation token, Figma, Library, release readiness를 변경하지 않는다.

## Safe 공식 React Native 예제의 적용 한계

Safe는 React Native + Expo 예제를 제공한다. 예제는 Sepolia Safe 배포, Passkey signer, 메시지·거래 서명을 연결한다. 이는 참고 가능한 구현 경로다. 예제의 `react-native-passkeys`는 위에서 조사한 `react-native-passkey`와 다른 package다. 해당 package의 최신 유지보수 상태는 이번 조사에서 확인하지 않았다. [Safe React Native tutorial](https://docs.safe.global/advanced/passkeys/tutorials/react-native)

예제는 `.env`의 deployment owner private key와 AsyncStorage의 `rawId`·public-key coordinates를 사용한다. 이 구성을 production secret 관리 또는 복구 완료의 근거로 사용하면 안 된다. 실제 owner private key를 앱 bundle에 넣지 않는다. spike에서는 폐기 가능한 testnet 개발 자격증명만 사용한다. public metadata는 private key가 아니지만, 앱 삭제 후 metadata가 없어질 수 있다는 계정 발견 문제가 남는다. [Safe React Native tutorial](https://docs.safe.global/advanced/passkeys/tutorials/react-native)

최소 spike에 다음 시험을 추가한다. 앱 local storage를 완전히 지운다. 동기화 Passkey가 남은 상태에서 credential ID·public key·chain·Safe address 매핑을 다시 찾는다. 앱 재설치와 새 기기에서 같은 계정을 발견하는지 확인한다. 저장한 public key를 복구할 수 없을 때는 credential assertion에서 무엇을 얻을 수 있는지 확인한다. on-chain owner 검색 또는 별도 metadata registry가 필요하면 신뢰·가용성·privacy 조건을 기록한다. Passkey가 동기화됐다는 이유만으로 wallet account discovery가 완료됐다고 판정하지 않는다.
