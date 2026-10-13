# VaultMe 모바일 Push 및 주소 구독 보안 계약

조사일: 2026-10-11. 상태: 설계 권고. 코드, development build, credential, provider 계정, 실제 단말 전달은 검증하지 않았다.

범위: Expo `expo-notifications`, iOS `APNs`, Android `FCM`, Expo Push Service, EVM watch address 구독. 서버는 push token과 구독 상태만 관리한다. recovery phrase와 private key는 서버와 push payload에 넣지 않는다.

## 결정 요약

1. Push는 거래 상태의 원천이 아니다. 알림은 `notificationId`와 `eventId` 같은 불투명한 식별자만 전달한다. 앱은 알림을 받거나 누른 뒤 API에서 최신 wallet transaction 상태를 다시 읽는다.
2. 첫 구현은 Expo Push Service를 사용할 수 있다. Expo Push `ticket`은 Expo가 요청을 받았다는 뜻이다. `receipt=ok`도 APNs 또는 FCM이 요청을 받았다는 뜻이다. 단말 표시나 사용자의 열람을 보장하지 않는다.
3. Push 전송은 최소 한 번 실행될 수 있다고 가정한다. 같은 알림이 두 번 표시될 수 있으므로 서버 outbox와 앱 화면 모두 idempotent하게 만든다.
4. Android 13 이상은 `POST_NOTIFICATIONS` runtime permission이 필요하다. iOS는 `UNUserNotificationCenter` authorization을 명시적으로 요청한다. 사용자가 거부하면 조용한 in-app 상태와 설정 이동 경로를 제공한다.
5. Expo push는 Expo Go가 아니라 development build가 필요하다. iOS와 Android의 credential 및 native 설정은 build에 포함된다.
6. watch address 등록은 서명 challenge로 인증한다. 권고 기본 방식은 `ERC-4361 Sign-In with Ethereum (SIWE)`의 짧은 목적 전용 메시지다. `nonce`, `domain`, `uri`, `chain-id`, `issued-at`, `expiration-time`을 검증하고 한 번만 사용한다.

## Expo 및 플랫폼 계약

| 항목 | 계약 | 공식 근거 |
| --- | --- | --- |
| Build | Remote push를 테스트하려면 Expo Go가 아닌 development build를 사용한다. | [Expo: What you need to know about notifications](https://docs.expo.dev/push-notifications/what-you-need-to-know/), [Expo: Push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) |
| Permission | Android 13+는 `POST_NOTIFICATIONS`를 선언하고 runtime 요청한다. iOS는 필요한 alert, sound, badge 권한만 요청한다. 요청 시점을 제품 맥락 뒤로 둔다. | [Android notification runtime permission](https://developer.android.com/develop/ui/views/notifications/notification-permission), [Apple: Asking permission](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications) |
| Token | 앱 시작 또는 로그인 후 `getExpoPushTokenAsync({ projectId })`로 등록한다. `addPushTokenListener`로 token 교체를 즉시 서버에 반영한다. token은 device installation과 account 구독을 연결하는 값이며 주소 소유권 증명이 아니다. | [Expo Notifications API](https://docs.expo.dev/versions/latest/sdk/notifications/) |
| Android channel | Android token을 얻기 전에 notification channel을 만든다. channel과 permission 상태를 별도로 표시한다. | [Expo Notifications API](https://docs.expo.dev/versions/latest/sdk/notifications/) |
| Foreground | `addNotificationReceivedListener`로 수신한다. 앱이 표시 방식을 결정한다. 거래 내용 전체를 시스템 banner에 복제하지 말고, 짧은 상태와 앱 내 상세 화면을 사용한다. | [Expo: Handle incoming notifications](https://docs.expo.dev/push-notifications/receiving-notifications/), [Expo: Notification behavior](https://docs.expo.dev/push-notifications/what-you-need-to-know/) |
| Background | OS가 표시할 수 있다. 사용자가 누르면 `addNotificationResponseReceivedListener`에서 `eventId`로 최신 상태를 조회한다. | [Expo: Handle incoming notifications](https://docs.expo.dev/push-notifications/receiving-notifications/) |
| Terminated | 앱 시작 시 listener만 기다리지 않는다. `getLastNotificationResponse` 또는 `useLastNotificationResponse`도 확인한다. | [Expo: What you need to know about notifications](https://docs.expo.dev/push-notifications/what-you-need-to-know/) |
| Background data | headless background notification은 기기 도착 후에도 앱 실행을 보장하지 않는다. 지갑 상태 확정이나 보안 결정을 여기에 의존하지 않는다. | [Expo: Notification behavior](https://docs.expo.dev/push-notifications/what-you-need-to-know/) |

## 알림 payload와 표시 UX

알림 payload에는 다음만 넣는 것을 기본으로 한다.

```json
{
  "data": {
    "notificationId": "opaque-server-id",
    "eventId": "opaque-chain-event-id",
    "kind": "transaction_status_changed",
    "schemaVersion": 1
  },
  "title": "거래 상태가 변경되었습니다",
  "body": "VaultMe를 열어 최신 상태를 확인하세요"
}
```

실제 주소, 전체 recipient 또는 spender, 금액, allowance, fee, recovery phrase, private key, 서명, raw transaction, API credential은 payload와 lock screen 문구에 넣지 않는다. 기기 소유자 외 사람이 lock screen을 볼 수 있다. 필요한 wallet 정보는 앱을 열고 인증한 뒤 서버에서 읽는다. `title`과 `body`는 현재 상태를 확정하지 않는 문장으로 쓴다. 예: `상태를 확인하세요`. `Confirmed` 또는 `Failed`를 push 문구로 보낼 때는 서버가 그 상태를 canonical 데이터로 확정한 경우에만 사용한다.

| 앱 상태 | 수신 UX | 탭 UX |
| --- | --- | --- |
| Foreground | in-app banner 또는 activity refresh. 동일 `notificationId`는 한 번만 표시한다. | 필요하면 transaction detail로 이동한다. 화면 진입 때 최신 API 조회를 다시 한다. |
| Background | OS notification. lock screen에는 민감한 값이 없는 짧은 문구만 보낸다. | `eventId`를 route hint로만 사용한다. API가 반환한 현재 상태를 표시한다. |
| Terminated | OS notification이 표시될 수 있다. OS 정책과 permission을 따른다. | 초기 response를 읽고 session 복원 후 최신 상태를 조회한다. response가 오래되었거나 없는 경우에도 activity를 정상 표시한다. |
| Permission denied | push 대신 앱 내 `Notifications off` 상태와 설정 안내를 표시한다. | push 도착을 전제로 하지 않는다. 앱이 열리면 polling 또는 activity refresh를 사용한다. |

알림은 action authorization이 아니다. push를 누르는 것만으로 거래를 승인하거나 서명하지 않는다. 알림에서 거래를 열면 account, network, asset, recipient 또는 spender, amount 또는 allowance, estimated fee, status를 review 화면에서 다시 표시한다. full address는 review/detail에 표시한다.

## Ticket, receipt, retry, dedup

Expo 문서에 따르면 push ticket의 `ok`는 Expo 서버 접수를 뜻한다. receipt의 `ok`는 APNs 또는 FCM 접수를 뜻한다. 두 값 모두 단말 표시, 사용자의 열람, 최신 chain 상태를 증명하지 않는다. Expo는 receipt를 확인하고 `DeviceNotRegistered`이면 해당 token으로 더 보내지 말라고 안내한다. receipt는 24시간 후 삭제될 수 있으므로 운영 기록은 자체 DB에 저장한다. [Expo Push delivery](https://docs.expo.dev/push-notifications/sending-notifications/)

서버 계약:

- outbox unique key: `(accountSubscriptionId, canonicalEventId, notificationKind)`.
- 각 전송 시도에 `notificationId`, token, provider ticket ID, attempt count, next attempt time, last error, status를 저장한다.
- HTTP network error, HTTP 429/5xx, `MessageRateExceeded`는 exponential backoff로 재시도한다. retry budget을 넘으면 `delivery_unknown`으로 남기고 거래 상태를 바꾸지 않는다.
- `DeviceNotRegistered`는 token을 `inactive`로 표시한다. 사용자가 앱을 다시 열고 새 token을 등록하면 새 installation으로 활성화한다.
- malformed payload, `MessageTooBig`, `InvalidCredentials`는 자동 무한 재시도하지 않는다. payload 또는 credential 운영 문제로 분류한다. Expo payload limit은 Android와 iOS 합계 4096 bytes다.
- timeout 뒤 재전송은 duplicate를 만들 수 있다. duplicate push가 와도 앱 activity와 transaction detail은 하나의 canonical event로 합친다.
- push delivery 성공을 chain event confirmation으로 사용하지 않는다. chain watcher와 wallet API의 상태를 원천으로 유지한다.

Expo는 temporary failure에 exponential backoff를 권장하며, Expo 인프라와 APNs/FCM에 SLA를 제공하지 않는다. 따라서 push는 best-effort hint다. [Expo Push delivery](https://docs.expo.dev/push-notifications/sending-notifications/)

## Watch address 구독 인증

주소 문자열을 입력받는 것만으로는 그 주소를 제어한다는 증거가 없다. privileged subscription은 다음 흐름을 사용한다.

1. 앱이 서버에 `address`, `chainId`, device installation ID와 함께 challenge 요청을 보낸다. 서버는 cryptographically random `nonce`와 짧은 expiry를 만든다.
2. 지갑은 사람이 읽을 수 있는 목적 문구를 보여 준다. 문구는 `VaultMe wants to watch this address for transaction status notifications.`처럼 알림 구독만 요청한다. 거래 전송, token approval, allowance 변경, spending 권한은 요청하지 않는다.
3. 사용자는 지갑에서 메시지를 서명한다. seed/private key는 지갑 밖으로 이동하지 않는다. 서버에는 challenge message와 signature만 전송한다.
4. 서버는 SIWE 형식, `domain`, `scheme`, `uri`, `address`, `chain-id`, `nonce`, `issued-at`, `expiration-time`을 검증한다. nonce는 원자적으로 consume한다. 주소와 session을 bind하고 device installation과 구독 범위를 저장한다.
5. 서버는 구독을 `active`로 만들고 push token을 그 구독에 연결한다. push token이 바뀌면 새 token만 갱신한다. 주소 소유권 challenge와 push permission은 별도 상태다.
6. 사용자는 앱에서 구독을 revoke할 수 있다. 서버는 구독을 중지하고 token association을 제거한다. dApp disconnect와 token allowance revoke는 별도 동작이다.

SIWE는 off-chain Ethereum account authentication을 위한 표준이다. `domain`, `address`, `uri`, `version`, `chain-id`, `nonce`, `issued-at`, 선택적 `expiration-time`을 정의한다. 검증자는 message format과 expected values를 확인하고 signature를 검증해야 한다. session은 address에 bind한다. [ERC-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)

## 인증 방식 비교

| 방식 | 장점 | 제한 | 판단 |
| --- | --- | --- | --- |
| `ERC-4361 SIWE` personal message | 사람이 읽을 수 있다. origin, nonce, expiry, chain을 명시한다. off-chain session 목적에 맞다. | 지갑별 message UX와 contract wallet 지원을 확인해야 한다. 주소만 입력하는 것보다 한 번의 서명 UI가 필요하다. | 첫 버전 권고. 목적과 구독 범위를 좁힌다. |
| `EIP-712` typed data | `WatchSubscription(address account,uint256 chainId,bytes32 subscriptionId,uint256 expiresAt)` 같은 필드를 구조적으로 표시할 수 있다. domain separator에 name, version, chainId, verifyingContract를 둘 수 있다. | EIP-712 자체는 replay protection을 포함하지 않는다. 지갑 표시가 다를 수 있다. nonce, expiry, domain 검증을 별도로 구현해야 한다. | 서버·지갑 UI가 typed data를 안정적으로 지원할 때 선택. SIWE와 혼합하지 말고 한 계약을 고정한다. |
| `ERC-1271` contract account 검증 | smart contract wallet 주소도 `isValidSignature`로 검증할 수 있다. | chain RPC 조회가 필요하다. contract가 signature 검증 정책을 바꿀 수 있다. | contract address를 허용할 때 추가 검증 경로로 사용한다. EOA `ecrecover`만으로 처리하지 않는다. |
| 주소 수동 입력, tx 전송, token approval | 서명 UI가 없다. tx approval은 온-chain 상태를 만들 수 있다. | 주소 소유권과 구독 의도를 증명하지 않는다. approval은 알림 권한이 아니며 비용과 위험이 있다. | privileged watch subscription의 인증으로 사용하지 않는다. |

EIP-712는 domain separation을 정의하지만 replay protection은 정의하지 않는다. EIP-1271은 contract account가 서명을 검증하는 표준 method를 제공한다. [EIP-712](https://eips.ethereum.org/EIPS/eip-712), [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271)

## 보안 실패 처리

- nonce 재사용, expired message, domain mismatch, chain mismatch, address mismatch, malformed message는 `401` 또는 `422`로 거부한다. 구체적인 nonce 존재 여부는 응답으로 노출하지 않는다.
- 서명 검증 성공은 주소 소유권과 이 challenge의 서명만 증명한다. 앱의 화면, server account, chain event의 안전성이나 거래 성공을 보증하지 않는다.
- `ERC-1271` 검증 실패 또는 RPC timeout은 `unknown`으로 기록하고 active로 만들지 않는다. timeout을 invalid signature로 단정하지 않는다.
- 사용자가 watch address를 바꾸거나 revoke하면 이전 subscription의 outbox를 취소한다. 이미 provider에 접수된 push는 단말에서 회수할 수 없으므로 payload에 민감한 정보를 넣지 않는다.
- notification tap은 권한 승격, 자동 send, 자동 approve, 자동 retry를 하지 않는다. 최신 transaction 상태를 읽은 뒤 사용자가 별도 action을 시작해야 한다.

## 구현 전 검증 목록

아직 실행하지 않았다. 다음 증거가 있어야 구현 완료로 표시한다.

- iOS physical device와 Android 13+ device의 permission allow/deny/restore 상태.
- Expo development build에서 token 발급, token roll, uninstall 후 `DeviceNotRegistered` 처리.
- foreground, background, terminated에서 수신과 tap routing. terminated initial response 누락 시에도 activity가 정상 동작하는지 확인.
- Expo ticket와 receipt 각각의 상태를 기록하고, receipt `ok`만으로 단말 도착을 표시하지 않는지 확인.
- network timeout, 429, 5xx, `MessageRateExceeded`, malformed payload, `MessageTooBig`, `DeviceNotRegistered` retry matrix.
- 같은 event를 재수신하거나 outbox worker가 crash한 경우 push outbox와 앱 표시가 중복되지 않는지 확인.
- SIWE challenge의 nonce one-time use, expiry, domain/URI/chain/address mismatch 거부.
- EOA 서명과 지원할 경우 ERC-1271 contract account 서명 검증.
- lock screen에서 address, amount, recipient/spender, fee, signature, key, seed가 노출되지 않는지 확인.
- 알림을 눌렀을 때 push payload의 오래된 status가 아니라 API의 최신 wallet transaction 상태가 표시되는지 확인.

이 문서는 조사와 보안 설계 계약이다. 구현, provision, app store 설정, wallet provider 연결, 실제 push 전달 성공을 선언하지 않는다.
