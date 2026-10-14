# VaultMe 요구사항 확정 세션

상태: Q25–Q81 승인. HLD·LLD·UX 흐름·와이어프레임 작성 · 2026-10-13

## 최신 결정 — 이전 Passkey 제안보다 우선

사용자 추가 승인: 첫 버전은 EOA로 구현하고 향후 Smart Account를 추가할 수 있도록 화면에서 서명·전송 로직을 분리한다. 현재 Smart Account adapter·ERC-4337·EIP-7702를 구현하지 않는다. 미래 계정 유형을 위해 과도한 공통 인터페이스를 미리 만들지 않는다. 최초 구현에서 EOA 키 접근·서명·제출 책임이 화면에 퍼지지 않게 한다. 현재 설계 단계와 이후 구현 단계의 구분은 유지한다.

Q12 승인: 매 송신마다 최종 Review 후 OS 재인증을 요구한다. 앱 잠금 해제와 송신 승인을 구분한다. 인증 취소·실패 시 서명·전송하지 않는다. 인증 후 recipient·network·asset·amount 등 승인 대상이 바뀌면 기존 승인을 재사용하지 않고 다시 검토·인증한다. 이미 제출된 거래의 상태 조회에 새 송신 인증을 요구하거나 자동 재송신하지 않는다.

Q13 승인: 실제 백그라운드 전환 후 30초 이상 지나 재진입하면 OS 인증으로 잠금을 해제한다. 30초 미만의 짧은 앱 전환은 유예한다. 앱 완전 종료·기기 잠금 후에는 다시 인증한다. 매 송신 인증은 이 유예와 무관하게 유지한다. OS 인증창으로 인한 일시 inactive와 실제 앱 이탈은 구분해야 한다. 백그라운드 미리보기에서 민감 화면을 가리는 방식과 시간 측정·플랫폼 동작은 구현 검증 대상이다.

Q14 승인: 신규 지갑은 Home 탐색을 허용하되 앱에서 수신 주소를 보여주기 전에 백업 안내와 일부 단어 확인을 완료해야 한다. 수신 목적의 주소 복사·공유 등 우회 경로에도 같은 조건이 필요하다. 일부 단어 확인은 실제로 안전하게 보관했다는 보장이 아니다. 앱 UI 제한으로 외부 on-chain 입금을 차단할 수는 없다. phrase의 로컬 보호·앱 종료 후 백업 재개를 설계해야 하며, Figma·Make에서는 실제 phrase 없이 placeholder만 쓴다. 기존 지갑 import의 백업 상태 처리는 별도 결정한다.

Q15 승인: 백업 완료 후 Settings에서 매번 OS 재인증을 거쳐 seed phrase 재열람을 허용한다. 화면 또는 앱을 벗어나면 즉시 숨긴다. 일반 Home 잠금의 30초 유예를 phrase 표시 유지에 적용하지 않는다. 이 선택은 phrase를 다시 제공할 수 있는 보호된 저장 모델을 필요로 한다. 서버 보관·클립보드 복사·스크린샷 정책은 이 선택으로 승인되지 않는다.

Q16 승인: 유효한 phrase로 지원 계정을 복구한 기존 지갑 사용자는 신규 생성용 일부 단어 확인 절차를 반복하지 않고 바로 수신할 수 있다. 복구 성공을 안전한 외부 백업 보관의 증거로 취급하지 않는다. UI는 복구한 지갑임을 표시하고, Settings에서 백업 보관 안내와 재열람 경로를 제공한다. 기존 지갑의 모든 계정을 찾았다는 의미도 아니다.

Q17 승인: 송신 recipient는 직접 입력·사용자 동작에 의한 붙여넣기·QR 스캔을 지원하도록 설계한다. 카메라 권한, 스캔 실패, 내용 검증, network 불일치 처리를 포함한다. 스캔 후 자동 송신하지 않고 주소 확인 단계로 이동한다. 주소록·ENS는 이번 승인에 포함하지 않는다. Review는 전체 recipient와 network를 표시한다. 주소 형식 검증을 수취인 신원 또는 해당 network 수신 지원 확인으로 설명하지 않는다. QR은 계획된 기능이며 아직 구현·검증되지 않았다.

Q18 승인: 수신 화면에 주소 QR, 전체 주소, 복사·공유를 제공한다. 신규 지갑은 Q14 백업 확인 후 수신 정보를 제공한다. 기존 지갑은 Q16에 따라 바로 수신 정보를 제공한다. 실제 QR 생성·스캔 상호 검증과 공유 payload는 구현 단계에서 확인한다.

Q19 승인: 수신은 주소를 제공하고 보내는 사람이 자산·금액을 정한다. 받을 자산·금액을 지정하는 요청 QR은 첫 범위에서 제외한다. 화면에 network를 명시한다. QR encoding 및 외부 QR 호환 범위는 표준과 지원 wallet을 조사해 설계하며 아직 확정하지 않는다. 주소만으로 network를 확정하지 않는다.

Q20 승인: 앱이 추천 수수료를 계산하고 Review에 예상 비용을 표시한다. 느림·보통·빠름 선택과 수동 gas 설정은 첫 버전에서 제외한다. 예상값과 실제 비용을 구분하고 추정 실패를 0으로 표시하지 않는다. 추정 실패 시 재시도를 안내한다. 수수료 갱신 시 재검토·재인증 정책은 별도 상세 설계한다.

Q21 승인: Max를 제공한다. Native coin은 수수료를 위한 금액을 남기고 송신 가능한 금액을 계산한다. ERC-20은 토큰 잔액 전체를 입력하되 별도 native coin의 수수료 충족 여부를 확인한다. 수수료 변동 시 Max 값 재계산과 변경된 금액의 재검토가 필요하다. 계정 잔액이 정확히 0이 된다는 의미로 안내하지 않는다.

Q22 승인: 첫 버전에 상태 재조회·마지막 확인 시각·선택 network의 explorer 링크를 제공한다. 속도 높이기·취소 목적의 replacement transaction은 후속 범위다. 시간 경과만으로 Failed로 바꾸거나 자동 재송신하지 않는다. 앱 종료 후에도 기존 거래 식별자를 보존해 상태를 다시 확인한다. 제출 결과 Unknown은 Pending과 별도로 처리한다.

Q23 승인: 앱 밖 거래 완료·실패 Push 알림을 첫 버전 설계에 포함한다. 알림 권한·기기 등록·상태 추적 서비스·데이터 최소 수집·중복 방지·잠금 화면 노출 정책을 추가 설계한다. 알림 자체를 최종 chain 상태의 근거로 삼지 않는다. 알림 거절·미도착에도 앱에서 상태 확인이 가능해야 한다. 구체적인 Push 제공자·서버 추적 범위·보관 기간은 미정이다.

Q24 승인: 앱에서 보낸 거래의 완료·실패와 새 입금 Push를 포함한다. 주소 단위 활동 추적이 필요하며 지갑 주소·거래와 알림 기기의 연결 정보가 생긴다. 서버에 seed phrase·private key·자금 이동 서명 권한을 제공하지 않는다. 구독 동의·해제·보관 기간·상태 확정 기준·입금 탐지 범위는 후속 설계 대상이다.

사용자는 Hono server의 필요성을 제안했다. 세 subagent가 Hono/background job, EVM tracking, Expo Push/privacy를 조사했다. 구현·배포·실기기 전달은 하지 않았다. GPT-6.1 Sol은 도구의 지원 모델이 아니어서 GPT-5.6 Luna fallback으로 조사했다.

취합: [Hono·Push 검토](vaultme-hono-push-review.md). Hono는 HTTP API 후보, watcher는 durable background process/job, DB는 cursor/event/outbox, dispatcher는 push retry를 맡도록 분리한다. 첫 감지는 JSON-RPC polling + durable cursor, direct native transfer와 지정 ERC-20 `Transfer`부터라는 권고다. Provider webhook은 나중의 fast path가 될 수 있으나 RPC reconciliation을 대체하지 않는다. Cloudflare Cron/Queues/D1과 Node.js/PostgreSQL worker 모두 비교했고 선택은 미정이다.

Q25 권고: 입금 Push는 canonical confirmation 뒤 한 번 보내고, 주소 구독 이후 event부터 추적한다. Lock screen에는 주소·금액을 숨기고 앱에서 최신 상태를 조회한다. 확정 시점을 정한 뒤 감지 지연 목표, 구독 동의·해지, 주소 소유 확인을 순서대로 묻는다.

Q25 승인: 입금 Push는 선택 chain의 확정 기준을 통과한 canonical 입금에 대해 한 번만 보낸다. Pending(block 포함 직후) 입금 알림은 보내지 않는다. 주소 구독 이후 event부터 추적하고 과거 이력은 가져오지 않는다. 확정 기준(`safe`/`finalized` tag 또는 confirmation 수)은 testnet 선택 후 검증해 정하며, 모든 EVM에 같은 block 수를 쓰지 않는다. 알림은 chain 상태의 증거가 아니며 앱은 재진입 시 상태를 다시 조회한다.

Q26 승인: 입금 감지 목표는 확정 기준 통과 시점부터 서버가 Push 제공자에 요청을 넘기는 시점까지 p95 2분 이하다. Apple/Google 전달 시간은 목표에서 제외한다. 1분 간격 polling으로 달성 가능한 범위이며 Cloudflare scheduled poller와 Node worker 모두 후보로 남는다. 목표 달성은 testnet 실측 후에만 보고한다.

Q27 승인: Push 구독은 기본 꺼짐이며 명시적 opt-in이다. 첫 송신 제출 직후와 수신 화면 첫 진입 때 설명 화면을 먼저 보여준 뒤 OS 알림 권한을 요청한다. 설명에는 지갑 주소를 알림 서버에 등록한다는 사실을 쓴다. OS 알림 권한과 서버 주소 구독은 별도 상태다. Settings에 켜기/끄기를 두고, 끄면 서버의 주소↔기기 연결을 삭제한다. 거절해도 앱 안 상태 확인은 가능하다.

Q28 승인: opt-in 시 OS 인증을 한 번 거친 뒤 앱이 서버 challenge(SIWE 형식, nonce·domain·chain-id·issued-at·expiration 포함, 1회용)에 서명해 주소 소유를 증명한다. 서버는 기기별 session을 발급하고 구독 변경·해지를 이 session으로 보호한다. push token 교체는 session으로 처리하며 재서명하지 않는다. 이 서명은 앱의 서버 인증 용도이며 dApp message signing·거래 승인과 구분한다. 서명은 key 보유만 증명한다.

Q29 승인: 알림 문구는 이벤트 종류만 표시한다(예: 입금 확정, 송신 완료, 송신 실패). 금액·주소·자산 이름·fee·tx hash는 payload와 잠금 화면에 넣지 않는다. payload에는 화면 이동용 불투명 ID만 넣는다. 확정·실패 문구는 서버가 canonical 상태로 확정한 경우에만 쓴다. 알림 탭 후 잠금 상태면 OS 인증을 거치고 서버/RPC에서 최신 상태를 다시 읽는다. 최종 문구는 UX copy 단계에서 정한다.

Q30 승인: 거래 내역 목록은 앱이 RPC/indexer provider의 주소 내역 API를 직접 호출해 구성한다. 앱이 보낸 거래는 기기에 저장한 tx hash로 추적한다. 우리 서버는 알림 전달을 담당하며 내역의 원천이 아니다. Push opt-in과 무관하게 내역을 볼 수 있다. Provider는 Alchemy로 고정하지 않으며 Infura 등 대안을 조사해 testnet 선택과 함께 정한다. 조사: [provider 내역 API 비교](../work/research-v2/planning/history-api-providers.md).

Q31 승인: 구독(주소↔push token)은 사용자가 끄거나, token이 무효가 되거나, 90일 동안 앱 접속이 없으면 삭제한다. 감지 이벤트·outbox·push receipt·추적용 tx hash는 최종 처리 후 7일 뒤 삭제한다. 주소를 제외한 집계 성능 지표(감지 지연 p95 등)만 장기 보관한다. 삭제는 별도 정기 job으로 수행한다.

Q32 잠정 승인: 거래 내역 API는 앱 → 우리 서버의 저장 없는 pass-through proxy → provider로 호출한다. 주소를 로그에 남기지 않고 IP·설치 단위 rate limit을 둔다. provider key는 서버에만 둔다. opt-in하지 않은 사용자의 주소도 proxy를 지나가므로 개인정보 안내에 명시한다. Q30의 '앱 직접 호출'을 이 방식으로 대체한다. 내역을 서버에 저장하지 않는 원칙은 유지한다. 업계 조사 후 확정(내역 조회 끄기 토글은 추가하지 않음): 소스 확인한 MetaMask·Rainbow·Uniswap·Rabby 모두 자체 backend를 거치며 provider key를 앱에 넣지 않는다. 조사: [provider 비교](../work/research-v2/planning/history-api-providers.md), [업계 지갑 사례](../work/research-v2/planning/wallet-history-backend-practices.md).

Q33 승인: 모바일 앱은 Expo + development build + EAS Build로 만든다. Expo Go는 쓰지 않는다. 필요한 native module은 config plugin·prebuild로 추가한다. seed → key 파생 등 암호 연산의 JS 성능은 측정 후 native crypto 모듈 필요 여부를 정한다.

Q34 승인: seed phrase는 `react-native-keychain`으로 저장하고 `BIOMETRY_ANY_OR_DEVICE_PASSCODE` access control, 이 기기 전용 접근, 클라우드 백업 제외를 적용한다. OS가 접근을 강제하며 생체정보 추가·변경 후에도 유지되고 기기 암호 fallback을 허용한다(OS 인증의 fallback 정책도 이것으로 정한다). `expo-secure-store` `requireAuthentication`은 iOS `.biometryCurrentSet` 때문에 생체 등록 변경 시 항목이 무효화되어 채택하지 않는다. Android의 생체 등록 변경 시 key 무효화 동작은 실기기로 검증한다.

Q35 승인: 첫 testnet은 Ethereum Sepolia다. Etherscan V2 내역 API를 무료로 쓸 수 있고 `safe`/`finalized` 기준이 명확하다. Faucet 제약은 개발자 계정 충전 후 테스트 사용자에게 분배해 해결한다. 확정 기준(Q25)은 별도로 정한다.

Q36 승인: provider를 역할별로 나눈다. ① 주소 내역 API는 Etherscan V2를 후보로 하고, Sepolia 실측(입금 native, 내부 native, ERC-20, pagination)을 통과하면 확정한다. 하나라도 빠지면 Alchemy로 바꾼다. ② JSON-RPC(잔액, fee 추정, 제출, receipt, watcher)는 Infura 또는 QuickNode 중 무료 한도·WebSocket·`safe`/`finalized` tag 지원을 비교해 설계 단계에서 고른다. Key는 proxy 서버에만 둔다.

Q37 승인: Sepolia의 Confirmed 기준은 `safe` block tag다. 입금 Push, 송신 완료·실패 Push, 앱 화면의 Confirmed 표시에 같은 기준을 쓴다. Reverted receipt도 `safe` 통과 후 실패로 알린다. 앱은 대기 중 Pending → Block 포함(확정 대기) → Confirmed로 표시한다. Watcher는 `safe` 이전 구간을 재확인해 reorg를 정정한다. 실제 지연은 구현 시 실측한다.

Q38 승인: 서버는 Cloudflare Workers + Hono(API·내역 proxy) + Cron Triggers(1분 watcher·삭제 job) + Queues(Push 발송·재시도·dead-letter) + D1(구독·session·cursor·event·outbox)로 구성한다. 실행당 CPU 제한 때문에 block을 작은 구간으로 나눠 처리하고 cursor를 저장한다. Hono API 코드는 Node로 옮길 수 있게 유지한다.

Q39 승인: Push는 Expo Push Service로 보낸다. 앱은 `expo-notifications`로 token을 받고, Queue consumer Worker가 HTTPS로 발송한다. ticket·receipt로 전달 결과를 확인하고 `DeviceNotRegistered`는 Q31의 구독 삭제 조건으로 처리한다. APNs·FCM 인증 정보는 EAS에 등록한다.

Q40 승인: 신규 생성은 BIP39 12단어, 복구는 12·24단어를 허용한다. 경로는 `m/44'/60'/0'/0/0` 하나만 쓴다. BIP39 패스프레이즈(passphrase)는 지원하지 않는다. 복구 화면에 첫 계정 경로만 불러온다는 사실과 복구 주소 전체를 표시해 사용자가 비교하게 한다. 다른 경로·다중 계정 탐색은 후속이다.

Q41 승인: ERC-20 테스트 토큰은 Circle의 Sepolia USDC(6 decimals)다. ETH(18)와 decimals가 달라 단위 변환·Max 계산을 검증한다. Contract 주소와 faucet 한도는 구현 전 Circle 공식 문서로 확인한다. Faucet 한도는 개발자 계정에서 분배해 해결한다.

Q42 승인: 수신 QR에는 주소(`0x…`)만 넣는다. Network(Sepolia)는 QR과 별도로 화면에 명시해야 하며, 다른 network로 보내지 말라는 안내를 함께 둔다. 송신 스캔은 주소와 EIP-681 URI를 모두 받는다. EIP-681 chain ID가 Sepolia가 아니면 멈추고 network 불일치를 경고한다. 금액 등 추가 parameter는 무시하고 사용자가 직접 입력한다. 외부 지갑 호환성은 실측한다.

Q43 승인: phrase 화면(백업·Settings 재열람)에는 복사 버튼을 두지 않는다. 이 화면에서만 `expo-screen-capture`로 스크린샷·녹화를 차단하고 앱 전환 미리보기도 가린다. iOS 스크린샷 차단은 공식 API가 아닌 기법이므로 버전별 실측하고, 실패 시 스크린샷 감지 후 경고한다. UI는 차단을 보장으로 표현하지 않고 종이 기록을 안내한다.

Q44 승인: Admin은 읽기 전용 운영 대시보드(React + TypeScript)로 만든다. 표시 지표: 입금 감지 p95, watcher cursor 지연·정지, Expo receipt 오류율·dead-letter 건수, provider 오류율·rate limit 도달, 삭제 job 실행 여부. 주소가 없는 집계 숫자만 다룬다. 사용자 주소 검색·Push 재발송 등 조작 기능은 두지 않는다. 운영자 로그인이 필요하다.

Q45 승인: 공개 랜딩과 Admin 대시보드는 하나의 React Router v7 framework mode 프로젝트로 만든다. `ssr: false`로 두고 랜딩 경로만 `prerender`해 SEO를 충족한다. Admin 경로는 SPA fallback으로 로그인 후 브라우저에서 데이터를 불러온다. Cloudflare Pages에 정적 배포한다. 쓰기 작업은 Hono API가 맡는다. Next.js·런타임 SSR은 쓰지 않는다.

변경(2026-10-14, #36): Q45의 배포 대상을 Cloudflare Pages에서 별도 Worker + Static Assets로 바꾼다. 근거는 Cloudflare Workers Best Practices의 새 프로젝트 권고와 로컬 spike다 (docs/adr/0001-web-hosting-workers-static-assets.md). 나머지 Q45 결정은 그대로다.

Q46 승인: Review에 예상 수수료와 최대 수수료(EIP-1559 `maxFeePerGas` 기반 상한)를 함께 표시하고 사용자는 상한을 승인한다. 제출 시 필요한 상한이 승인한 상한보다 높아질 때만 재검토·재인증한다. 상한 이하의 변동은 다시 묻지 않는다. Native Max는 상한 기준으로 계산한다. 오래된 추정값에는 업데이트 시각과 재계산 버튼을 둔다. 공개 랜딩 SEO는 prerender HTML로 충족하며 route `meta`, sitemap, robots를 둔다.

Q47 승인: Pending 또는 Unknown 송신이 있으면 새 송신을 막는다. 이유와 기존 거래 상태(재조회, explorer 링크)를 보여준다. 이중 송금과 nonce 대기열 문제를 피한다. 동시 송신·nonce 대기열은 replacement transaction과 함께 후속 범위다.

Q48 승인: 금액 정밀도는 기존 Foundation 계약(decimal 문자열, Review full precision, en-US 표시)을 따른다. Testnet 자산은 시장 가격이 없으므로 환산 금액을 표시하지 않고 C23 `Unavailable` 상태로 안내하며 수량만 표시한다. Mainnet 확장 시 가격 provider를 추가해 `Complete`/`Partial`로 전환한다.

Q49 승인: 앱 UI는 한국어 하나로 만든다. 숫자 형식은 en-US 계약을 유지하고 기술 용어는 정해진 표기 원칙을 따른다. 문구는 처음부터 i18n 파일로 분리하되 번역본은 만들지 않는다.

Q50 승인: 앱은 Sentry로 크래시와 성능 측정만 수집한다. 전송 전 주소·금액·tx hash·phrase 형태 문자열을 제거하고 breadcrumb 네트워크 URL은 경로만 남긴다. 제거 규칙은 가짜 주소로 테스트한다. 제품 분석(클릭·퍼널)은 수집하지 않는다. seed → key 파생 시간 등 성능 수치는 Q33 native crypto 판단 근거로 쓴다.

용어 정정(사용자): 설계 산출물의 Hi-Fi는 HLD(High-Level Design: 큰 틀의 구현 계획·스펙·제약), Lo-Fi는 LLD(Low-Level Design: 코드 수준 구현 계획과 라이브러리 선택)를 뜻한다. 화면 흐름과 Foundation 기반 Prototype은 별도 UX 트랙으로 함께 수행한다. Repository 구조, module 경계(Feature-Sliced), schema validation, state management, test strategy, CI/CD, deployment·zero downtime 등 staff level fullstack product engineer가 고려할 항목을 설계 단계에서 구체화한다. 순서: HLD grilling → LLD grilling → HLD/LLD/UX 문서 작성.

Q51 승인(HLD): pnpm workspaces + Turborepo monorepo로 구성한다. `apps/mobile`(Expo), `apps/web`(React Router), `apps/api`(Cloudflare Workers), `packages/*`(API schema, 도메인 타입·상태 모델, Foundation token, decimal 규칙 등 공유 코드). Expo native 빌드 의존성 문제가 생기면 `nodeLinker: hoisted`로 대응한다. module 경계는 LLD에서 ESLint 규칙으로 정한다.

Q52 승인(HLD): 환경은 local + staging + production이다. 모두 Sepolia를 쓴다. 환경마다 Cloudflare D1·Queue·secret·provider key와 EAS channel을 분리한다. 웹은 PR마다 Cloudflare Pages 미리보기 URL을 쓴다. Migration과 배포 절차는 staging에서 먼저 실행한다. PR 단위 API 임시 환경은 필요가 반복될 때 추가한다.

변경(2026-10-14, #36): Q52의 웹 미리보기를 Cloudflare Pages 미리보기 URL에서 Workers 미리보기로 바꾼다. Workers Builds 또는 `wrangler versions upload --preview-alias`를 쓴다. Staging은 `wrangler deploy --env staging`, release는 100% 단일 버전 배포와 `wrangler rollback`이다(Web은 gradual 미사용) (docs/adr/0001-web-hosting-workers-static-assets.md). 나머지 Q52 결정은 그대로다.

Q53 승인(HLD): 배포는 예전 모바일 앱 호환을 zero downtime의 기준으로 삼는다. ① API v1은 필드 추가만 허용하고 깨지는 변경은 `/v2`로 분리한다. 앱은 버전 header를 보내고 서버는 최소 지원 버전 미만에 업데이트 안내를 응답한다. ② D1은 expand → 새 코드 배포 → 데이터 이전 → contract 순서로 바꾸며 한 migration에 열 삭제·이름 변경을 넣지 않는다. ③ Workers는 gradual deployment 후 오류율 확인 뒤 확대하고 이상 시 rollback한다. ④ Mobile은 JS 수정은 EAS Update, native 변경은 store 빌드로 하고 runtime version으로 비호환 업데이트를 막는다. Web은 Pages 원자 배포·즉시 rollback. 블루/그린은 D1 데이터 분리 문제로 쓰지 않는다. 규칙 강제 도구는 LLD·CI/CD에서 정한다.

변경(2026-10-14, #36): Q53의 "Web은 Pages 원자 배포·즉시 rollback"을 "Web은 Workers Static Assets 100% 단일 버전 배포, `wrangler rollback`"으로 바꾼다 (docs/adr/0001-web-hosting-workers-static-assets.md). 나머지 Q53 결정은 그대로다.

Q54 승인(HLD): 테스트는 위험 기반으로 설계한다. 위험 목록(금액 계산, 송신 상태 전이, 재인증 규칙, watcher reorg·중복·cursor, API 계약·예전 앱 호환, phrase 저장·캡처 차단·Sentry 정보 제거)마다 가장 싼 테스트 레벨을 지정한다. 레벨: 순수 함수 unit+property, 공유 schema 계약 테스트(예전 앱 요청 유지), Worker 통합 테스트(로컬 D1·가짜/로컬 체인으로 reorg·중복 재현), 소수 E2E(온보딩→수신→송신→상태, 실패 시 배포 차단), 실기기 수동 체크리스트, staging Sepolia smoke. 완료 기준은 커버리지 %가 아니라 위험 목록이다. 도구는 LLD에서 정한다.

Q55 승인(HLD): CI/CD는 GitHub Actions로 한다. PR: Turborepo affected로 lint·typecheck·unit·계약·Worker 통합 테스트, web 미리보기. main merge: staging 자동 배포 → D1 migration → E2E·Sepolia smoke. production: release tag + 수동 승인 → gradual 배포 → 오류율 확인 → 100%. Mobile: staging channel EAS Update 자동, production 수동 승인, native 변경 감지 시 store 빌드 경로. 관문: migration의 열 삭제·이름 변경과 예전 앱 계약 테스트 실패 시 차단. Secret은 GitHub Environments로 분리하고 production은 승인 후 접근. CI 시간·cache 적중률을 기록한다.

Q56 승인(HLD): SLO 3개를 정의한다: 입금 감지 p95 ≤ 2분, API 월 가용성 99.5%, Push 발송 성공률(Expo receipt 기준). 알림 조건: watcher cursor 5분 이상 정지, dead-letter 1건 이상, API 5xx 비율 급증. 로그는 구조화 JSON이며 주소 대신 요청 ID를 기록한다. 지표는 Workers Analytics Engine에 쌓고 Admin이 읽는다. 알림 채널은 LLD에서 정한다. 분산 추적은 첫 범위에서 제외하며, 필요하면 self-hosted LGTM이 아니라 이미 쓰는 Sentry의 앱→Workers trace 연결부터 검토한다.

Q57 승인(HLD): 모든 설치는 첫 실행 때 익명 설치 ID를 등록하고 짧은 수명 token을 받는다. 요청마다 ts·nonce·서명을 붙이고(Rabby 사례), 설치 단위 + IP 단위 rate limit을 함께 적용한다. 설치 ID는 주소와 연결하지 않는다. 이는 완벽한 방어가 아니라 남용 비용을 높이는 장치다. Admin은 Cloudflare Access(운영자 이메일 allowlist)로 보호하고 앱 코드에 로그인 기능을 만들지 않는다. 기기 증명은 제외한다.

Q58 승인(HLD): ① 모든 JSON-RPC 호출은 proxy를 거치고 서버가 주 provider와 예비 provider(Infura·QuickNode 중 나머지 하나) 사이를 자동 전환한다. 서명된 raw tx 재전송은 같은 tx hash이므로 안전하다. RPC도 서버를 거치므로 Q32와 같은 개인정보 고지를 적용한다. ② 내역 API는 예비가 없다. 앱이 마지막 목록을 기기에 저장해 마지막 업데이트 시각과 함께 표시하고, 보낸 거래는 tx hash로 계속 추적한다. ③ Watcher는 정지 구간을 cursor부터 다시 읽어 복구하고 늦게 확정된 입금도 한 번만 알린다. Quorum 비교는 하지 않는다.

Q59 승인(HLD): 서명 경계는 순수 TypeScript `packages/wallet-core`(key 파생, 서명, 거래 구성, 금액 규칙; React·RN 비의존)로 강제한다. 앱은 `prepare(intent)` → `signAndSubmit(approved)` 같은 좁은 interface만 호출한다. 앱·웹은 FSD layer(app→pages→widgets→features→entities→shared)로 구성하고, router의 `app/` 폴더에는 FSD `pages`를 다시 내보내는 route 파일만 둔다. Steiger + ESLint import 규칙으로 방향을 강제하고 `wallet-core` import는 `features/send`·`features/backup` 등으로 제한한다. Smart Account는 이후 `wallet-core` 안에 구현을 추가한다.

Q60 승인(LLD): EVM 라이브러리는 viem이다. `wallet-core`와 `apps/api`에서 공통으로 쓴다. `mnemonicToAccount`에 `path`를 명시하고, 금액은 bigint 기반 `parseUnits`/`formatUnits`로 처리한다. RN에는 `crypto.getRandomValues` polyfill이 필요하다. Hermes에서 key 파생이 느리면 `react-native-quick-crypto`로 PBKDF2만 교체하는 방안을 실측 후 결정한다.

Q61 승인(LLD): API는 zod + `@hono/zod-openapi`로 정의한다. 생성한 OpenAPI 문서를 commit하고 CI에서 main 문서와 비교해 깨지는 변경을 차단한다(Q53 강제). Client 타입은 OpenAPI 문서에서 생성한다. 공유 schema는 `packages/contracts`에 두고 앱 폼 검증에도 재사용한다. 앱은 서버 응답도 검증하고 예상 밖 값은 `Unknown` 상태로 표시한다.

Q62 승인(LLD): 상태를 세 종류로 나눈다. ① 서버 상태(잔액·내역·거래 상태·수수료 추정)는 TanStack Query로 관리하고 persist로 마지막 결과를 기기에 저장한다. ② 송신 흐름 상태는 `wallet-core`의 순수 reducer(discriminated union)로 구현하고 앱은 얇은 hook으로 감싼다. ③ 앱 전역 UI 상태(잠금, 백업 완료, opt-in 안내)는 Zustand store 하나로 관리한다. 상태 전이표는 설계 문서의 다이어그램으로 그린다. 웹 Admin도 TanStack Query를 쓴다. XState·Redux는 쓰지 않는다.

Q63 승인(LLD): phrase 외 기기 데이터(TanStack Query persist cache, Pending·Unknown tx hash, Zustand 상태)는 `react-native-mmkv`에 암호화해 저장한다. 암호화 key는 keychain의 인증 없이 접근 가능한 등급에 둔다. 설치 token·기기 session도 keychain(인증 없는 등급)에 둔다. 동기 읽기로 첫 화면 전에 잠금 상태를 확인한다. New Architecture 요구 여부는 구현 시 확인한다.

Q64 승인(LLD): Style Dictionary로 `outputs/wallet-foundation.tokens.json`에서 ① `packages/tokens` 앱용 TS 상수(Component token 경로 유지, 예: `tokens.portfolioBalance.bg`)와 ② 웹용 CSS 변수를 생성한다. 앱은 RN `StyleSheet`, 웹은 CSS Modules로 쓴다. Lint로 색상·숫자 원시 값 직접 사용을 금지한다. 생성 단계에서 alias 누락·순환을 검사한다(인계 압축에 없는 `work/build_foundation.py`의 검증 역할 대체). Light 테마 하나만 지원한다. NativeWind·Tamagui는 쓰지 않는다.

Q65 승인(LLD): 폼은 react-hook-form + zod resolver로 만든다. 폼 라이브러리는 입력 상태(touched, 오류 표시, focus)만 맡는다. 형식 검증은 `packages/contracts` schema를, 업무 규칙(잔액, 수수료 상한 포함 Max, ERC-20 송신 시 native 수수료 부족)은 resolver 안에서 `wallet-core` 함수를 호출해 원본을 하나로 유지한다. C13 계약의 역할 분리를 따른다.

Q66 승인(LLD): D1 접근은 Drizzle(TS schema + SQL형 query builder, identity map·lazy loading 없는 얇은 계층)로 한다. drizzle-kit으로 SQL migration을 생성해 commit하고 `wrangler d1 migrations apply`로 적용한다. CI migration lint는 `DROP COLUMN`, `RENAME`, 테이블 재생성 패턴을 찾으면 실패한다. 자동 생성 SQL은 사람이 검토한다. D1 공식 지원은 구현 시 문서로 재확인한다.

Q67 승인(LLD): 테스트 도구: unit+property는 Vitest + fast-check, 계약은 oasdiff(CI) + Vitest schema round-trip, Worker 통합은 `@cloudflare/vitest-pool-workers` + anvil 로컬 체인(snapshot·revert로 reorg 재현, reorg 전용 RPC는 구현 시 확인), 모바일 E2E는 Maestro(EAS Workflows 실행), 웹 E2E는 Playwright(prerender meta, Admin 접근 차단), 실기기는 수동 체크리스트.

Q68 승인(LLD): Lint·format은 ESLint(flat) + typescript-eslint(type-aware) + Prettier + Steiger + 웹 CSS용 Stylelint다. 원시 값 금지는 `no-restricted-syntax`, import 경계는 path별 restricted imports/boundaries plugin으로 강제한다. TypeScript 7.0은 2026-07 GA지만 stable programmatic API가 없어(7.1 예정) typescript-eslint가 지원하지 않으므로 TypeScript는 6.x로 고정한다. 전환 조건: CI lint 시간이 실측상 문제, TS 7 필요성 발생, typescript-eslint의 TS 7 지원, Oxlint JS plugin stable → Oxlint type-aware + 작은 ESLint(Expo·원시 값 규칙) 구성으로 이전을 검토한다. Biome은 type-aware 규칙 성숙도 부족으로 제외. 조사: [lint 도구 비교](../work/research-v2/planning/lint-tooling-comparison.md).

Q69 승인(LLD): SLO 알림은 운영자 전용 Slack 채널의 incoming webhook으로 보낸다. 1분 Cron이 조건을 판정한다. 같은 알림은 30분에 한 번만 보내고 복구 시 "복구됨"을 한 번 보낸다. 문구에는 주소 없이 지표와 대시보드 링크만 넣는다. Webhook URL은 secret으로 관리한다.

Q70 승인(LLD): 기본 라이브러리: 모바일 라우팅 Expo Router, QR 스캔 `expo-camera` barcode scanning, QR 생성 `react-native-qrcode-svg`, 난수 polyfill `react-native-get-random-values` 또는 `expo-crypto`(key 파생 실측 때 결정), i18n i18next + react-i18next(앱·웹 공통), 날짜·숫자 표시 `Intl`(금액은 decimal 문자열 규칙), Push token `expo-notifications`, 크래시·성능 `@sentry/react-native`·`@sentry/cloudflare`, 캡처 차단 `expo-screen-capture`.

위협 모델 추가(사용자 승인): HLD에 위협 모델 섹션을 둔다. 자산·공격자·신뢰 경계·STRIDE 순으로 정리한다. 미결 위협: 주소 오염, 클립보드 바꿔치기, 서버의 거짓 데이터, 공급망 공격, 가짜 Push. 한 질문씩 결정한다.

Q71 승인(위협): 주소 오염 대응. ① 0원 transfer는 내역에서 기본 숨김(설정에서 표시 가능). ② Review에서 처음 보내는 주소면 안내를 표시한다. ③ 받는 주소가 이전에 보낸 주소와 앞 4자리·뒤 4자리가 같고 전체가 다르면 강한 경고를 표시하고 명시적 확인 후에만 진행한다. ④ 전체 주소를 4글자씩 끊어 표시한다. 이전에 보낸 주소 목록은 기기(MMKV)에만 저장하고 서버로 보내지 않는다.

Q72 승인(위협): 클립보드 바꿔치기는 기존 방어(Q71 처음 보내는 주소 안내·비슷한 주소 경고, Review 4글자 끊어 표시)에 맡긴다. 붙여넣은 직후 원래 주소와 전체를 비교하라는 안내를 한 줄 표시한다. 악성 앱이 설치된 기기는 앱이 지킬 수 없는 위험으로 위협 모델에 명시하고 수용한다.

Q73 승인(위협): 안전에 중요한 값은 서버에서 받지 않는다. ① chain ID, USDC contract 주소, decimals, derivation path는 `wallet-core` 상수로 고정. ② 거래 구성·서명은 기기에서만. ③ tx hash는 서명한 raw tx에서 앱이 직접 계산하고 서버 응답과 다르면 `Unknown`. ④ 수수료 상한에 기기 안 절대 상한(testnet 값은 LLD에서 결정)을 두고 넘으면 송신을 막고 경고. ⑤ 잔액·내역·receipt 조작은 남은 위험으로 명시·수용하고 화면에 데이터 출처와 업데이트 시각을 표시. 앱의 receipt 교차 확인은 하지 않는다.

Q74 승인(위협): ① pnpm `minimumReleaseAge`를 7일(10080분)로 늘리고 긴급 패치는 `minimumReleaseAgeExclude`로 예외 처리. ② 설치 script는 허용 목록(`strictDepBuilds`) 유지. ③ `wallet-core` 의존성을 viem·`@noble/*`·`@scure/*`로 제한하고 CI가 목록 밖 의존성에서 실패. ④ Renovate 업데이트 PR, `wallet-core` 영향 PR은 자동 merge 금지. ⑤ CI 취약점 검사(osv-scanner 등). ⑥ GitHub Actions는 commit SHA로 고정. RN 앱의 다른 패키지도 같은 JS 환경에서 실행되므로 완전한 격리는 아니며 남은 위험으로 명시한다.

Q75 승인(위협): ① Expo 발송 인증 강제 설정을 켜고 access token은 Worker secret에만 둔다(설정 이름·동작은 구현 시 확인). ② 앱은 Push payload를 zod로 검증해 알려진 이벤트 종류·ID 형식만 허용하고, 그 밖은 무시하고 Home을 연다. ③ Payload의 URL·deep link는 열지 않는다. ④ 알림 탭 후 서버에서 상태를 다시 읽고 알림 문구로 화면을 그리지 않는다. ⑤ 설정·온보딩에 "VaultMe는 알림으로 복구 구문이나 송금을 요청하지 않습니다"를 안내한다. 다른 앱·SMS 피싱은 범위 밖으로 명시한다.

Q76 승인: 접근성 목표는 WCAG 2.2 AA다(웹 그대로, 앱은 모바일에 맞게 해석). Foundation의 시각 기준(대비, 44 px, focus, label, 200% text)을 유지하고 네이티브 항목을 추가한다: ① 주소를 4글자 단위로 읽도록 접근성 label 지정 ② OS 글자 크기 200%까지 금액·주소 잘림 없음(필요 시 줄바꿈) ③ OS 동작 줄이기 설정 준수 ④ 상태 변화(Pending→Confirmed 등) live 알림. 검증: 웹은 Playwright + axe 자동 검사, 앱은 lint + 핵심 흐름(온보딩→수신→송신→상태)을 VoiceOver·TalkBack으로 완주하는 수동 체크리스트(Q54에 추가). KWCAG 인증은 범위 밖.

Q77 승인: 송신 상태에 Replaced를 추가한다. 판정: `safe` 기준 계정 nonce가 우리 거래 nonce보다 크고 우리 hash의 receipt가 없음(같은 nonce의 다른 거래 확정, 예: 같은 phrase를 쓰는 다른 지갑). 문구: "다른 거래가 먼저 처리되어 이 송신은 실행되지 않았습니다." Replaced는 Q47 송신 차단을 해제하고 Push로 알린다. 시간 경과 판정이 아니라 체인 사실 판정이다. 후속 speed-up/cancel도 같은 판정을 쓴다.

기본값 검토(사용자): 앱 전환 미리보기 가림은 phrase 화면에만 적용한다. 루팅·탈옥 탐지 시 경고 화면을 포함한다(사용은 막지 않음, Settings에서 다시 보기). Etherscan 호출은 서버 전체에서 초당 3회 한도 아래로 줄 세운다(Durable Object token bucket, history 30초 cache, LLD §5.1).

Q78 승인: RPC 주 provider는 Infura(무료 플랜 유지, Sepolia HTTPS·WSS, allowlist·JWT), 예비 provider는 Alchemy(무료 30M CU 유지)다. QuickNode 무료는 1개월 trial이라 예비에서 제외한다. Alchemy는 Q36의 내역 API 대체 후보도 겸한다. 근거: [provider facts](../work/measurements/provider-facts-2026-10-12.md).

Q79 승인 (2026-10-13): 송신 경고 2개를 추가한다. (1) 소각 주소: `0x0000000000000000000000000000000000000000`, `0x000000000000000000000000000000000000dEaD`. (2) 토큰 컨트랙트 주소: 수신자가 `ASSETS`의 컨트랙트 주소(USDC)인 경우. 둘 다 앱 내 고정 목록으로 판단하고 서버를 쓰지 않는다. S22에 Danger 경고를 띄우고, 유사 주소와 같이 명시 확인 전에는 진행하지 않는다. 근거: MetaMask Mobile `alert_system.burn_address`, `token_contract_warning` ([benchmark](../work/research-v2/planning/design-system-benchmark.md)).

Q80 승인 (2026-10-13): dark mode를 첫 버전에 넣는다. OS 설정을 따른다 (앱 안 토글은 두지 않음, 기본값). Foundation Semantic collection에 Dark mode를 추가한다. 함께 Foundation에 Switch, Segmented control, List item, Bottom sheet, Sensitive reveal(가림 후 탭하여 보기)을 추가한다. Sensitive reveal은 S03·S61 복구 구문에 쓴다.

Q81 승인 (2026-10-13): Foundation(컴포넌트·기본 문구·description)은 영어로만 작성한다. 다국어(첫 버전 한국어)는 기능별 화면 와이어프레임과 고정밀(hi-fi) 화면에서 적용한다. 화면 단계에서는 instance 문구를 덮어써서 현지화한다. 고정밀 Prototype은 §3–§7 흐름을 연결하고, 유사 주소 확인과 실행 전 확인 단계는 Bottom sheet(C32)를 쓴다.

설계 문서: [HLD](design/hld.md), [LLD](design/lld.md), [UX 흐름](design/ux-flow.md).

사용자는 Hono 서버의 필요성을 제안하고 subagent 조사를 요청했다. Hono API/배포·백그라운드 작업, EVM 이벤트·reorg·중복 처리, 모바일 Push·구독 인증·개인정보 계약을 3개 에이전트로 병렬 조사한다. 서버 구현·배포는 이번 조사에서 수행하지 않는다. Hono만으로 지속적인 체인 추적과 Push 전달이 해결되는 것으로 간주하지 않는다.

사용자는 개발 범위를 줄이기 위해 첫 버전 신규 생성·기존 복구 모두 seed phrase 기반 EOA로 진행하기로 했다. OS 인증을 통한 로컬 접근 보호는 유지한다. Passkey Smart Account, 추가 Passkey signer, Guardian 복구는 첫 버전에서 제외한다. 아래 병렬 연구와 Q11 후보는 판단 이력으로 보존하며 현행 구현 요구사항이 아니다. 지갑 1개·계정 1개, EVM Testnet 1개, native coin·ERC-20 1종 범위는 유지한다.

공고의 명시 내용은 인증·세션·생체인증·보안 저장소 개발 경험 우대다. Passkey는 명시돼 있지 않으며 생체인증 팝업만 구현하면 충분하다는 뜻으로 해석하지 않는다. 로컬 사용자 확인과 키 접근 통제·거래 서명·복구를 구분해 설계한다. 송신 전 재인증, 백그라운드 잠금, 실패·취소·기기 암호 fallback 정책은 다음 결정 대상이다.

절차: Matt Pocock `grill-with-docs` → `grilling` + `domain-modeling`. 사용자 답변으로 결정을 확정하고, 그 결정에 의존하는 다음 질문을 연다. 아직 아키텍처나 신규 제품 범위를 확정하지 않았다.

## 확인한 입력

- `manyfast-vaultme-import/PRD.md`
- `manyfast-vaultme-import/features/`: 요구사항 6개, 수용 기준 33개, 모두 기획 작성중
- `manyfast-vaultme-import/user-flow/user-flow.json`: 섹션 6개, 화면 등의 라벨 62개, 행동 라벨 11개, Edge 77개. 내부 ID와 화면 라벨의 대응은 미검증
- `../PRODUCT.md`: 현재 범위는 Foundation과 합성 Prototype. 실제 wallet runtime은 아님
- `../AGENTS.md`: Primitive → Semantic → Component, Borderless, Blue A, 승인된 Canvas 및 spacing 계약

## 첫 질문

1. 결과물 의미: Lo-fi 화면 흐름, Hi-fi 인터랙티브 Prototype, 시스템 구조도 세 가지를 함께 원하는지 확인한다.
2. 완료 기준: 화면 검증용 Prototype / 실제 Testnet MVP / Mainnet 출시 준비 중 어느 수준까지 이번 작업에 포함할지 확인한다.

사용자는 Q1·Q2를 승인했다. Lo-fi 화면 흐름, Hi-fi 인터랙티브 Prototype, 시스템 구조도를 설계한다. 이번 단계는 실제 송금 없이 제품 흐름을 검증하고 이후 Testnet MVP로 연결할 수 있는 구조를 설계한다. Testnet MVP 구현 완료는 이번 설계의 완료 기준이 아니다.

신규 설계 전에 기존 Figma Make Kit Prototype을 저렴한 모델로 확인한다. GPT-6.1 Sol · low에 검토를 맡겼다. 기존 화면과 상호작용, Foundation 연계, 재사용 범위, 부족한 흐름을 확인한다. 과거 로컬 증거와 현재 라이브 검증은 구분한다.

기존 Make Kit: https://www.figma.com/make/bLyCuIEejOvt1jQapcLtAX/VaultMe-%25E2%2580%2594-Make-Kit

## 후속 결정

[기존 Make Kit 검토](make-kit-review-2026-10-11.md): Version 27 시작 화면을 라이브 확인했다. 화면 전환은 도구 오류로 미확인이다. 기존 Prototype을 재사용 후보로 두고, 전체 동작 검증과 요구사항 확정을 구분한다.

## 확정한 사용자와 채널

- Q3: 신규 사용자와 기존 지갑 사용자 모두 필수다. 지갑 생성 → 백업 → 첫 수신 → 소액 송신, 지갑 복구 → 잔액 확인 → 송신을 포함한다.
- WalletConnect와 외부 DeFi app 연결은 추후 범위다.
- Q4: iOS·Android 모바일 앱과 웹을 함께 설계한다. 웹의 명시된 목적은 랜딩 페이지와 SSR 활용 등을 통한 SEO 최적화다. 브라우저 내 지갑 생성·서명·송신은 아직 승인된 웹 범위가 아니다.
- 기존 Make Prototype은 화면·사용자 흐름 검증에 활용한다.
- Frontend Engineer 포트폴리오로 활용한다. 직무명만으로 기술 스택이나 결제 기능을 추가하지 않는다.

핵심 범위는 React Native 앱과 React·TypeScript Admin이다. 직무 연결 자료는 공개 저장소에 두지 않는다.

Q5 승인: React Native·TypeScript 앱을 주 결과물로 하고 작은 읽기 전용 Admin을 추가한다. 웹은 랜딩·SEO 역할을 유지한다. Admin은 합성 거래 상태와 서비스 장애 관찰을 출발점으로 설계한다. 운영자가 키를 보유하거나 자금을 이동하는 기능은 포함하지 않는다. 세부 관측 데이터·권한·개인정보 범위는 후속 질문에서 확정한다. Expo·EAS 등 세부 도구는 미정이다. Q1·Q2의 현재 설계 단계 범위는 유지한다.

Q6 승인: 첫 검증은 EVM Testnet 1개로 한다. 생성·복구·잔액·수신·송신과 실패 처리를 먼저 검증하도록 설계한다. 다중 체인 확장 경계는 Architecture에 포함하되 두 번째 network 구현은 첫 범위에 포함하지 않는다. 특정 chain 이름은 미정이다. 현재 설계 단계와 이후 Testnet 실행 검증을 구분한다.

Q7 승인: native test coin과 지정된 ERC-20 테스트 토큰 1종을 포함한다. 토큰 금액과 network fee를 구분하는 UX 및 수수료용 잔액 부족을 검증한다. 임의 토큰 추가, Swap, token approval은 이 선택에 포함하지 않는다. 특정 network와 token contract는 미정이다.

Q8 승인: 사용자가 recovery phrase를 직접 보관하고 기존 phrase로 복구한다. 암호화된 클라우드 백업은 첫 범위에서 제외한다. 생체인증을 통한 로컬 잠금 해제와 기기 분실 시 복구는 별개이며 잠금 정책은 후속 결정이다. 실제 phrase·private key는 Figma, Make, 문서 및 로그에 넣지 않는다. 현재 Prototype은 비밀값이 아닌 명시적 placeholder로 흐름을 검증한다. phrase 형식·derivation path·복구 호환 범위는 아직 미정이다.

Q9 승인: 설치된 앱에서 활성 지갑 1개, EVM 계정 1개로 시작한다. 여러 계정 탐색·복구·선택·전환은 후속 범위다. 여기서 지갑은 recovery phrase로 복구하는 단위, 계정은 해당 network에서 사용하는 주소 단위다. 표준 파생 구조 자체를 제외하는 결정이 아니다. 지원 derivation path와 복구 호환 범위를 명시해야 하며, 모든 기존 지갑의 계정 복구를 보장하지 않는다. 정확한 path는 아직 미정이다.

Q10 승인: OS 인증(생체인증 및 기기 암호)을 사용하고 별도 VaultMe PIN은 첫 범위에 추가하지 않는다. OS 인증은 로컬 접근용이며 recovery phrase를 대신하지 않는다. 기기 잠금 미설정 시 안내와 제한, 인증 취소·실패, 백그라운드 복귀, 송신 전 재인증의 세부 정책 및 플랫폼 구현 가능성은 후속 확정한다.

사용자는 Passkey 연동도 요청했다. 기술 도입 자체보다 문제·결정·검증 결과가 연결되는 STAR 스토리를 요구했다. 2026-10-11 Remember 공고 본문 재확인 결과 인증·세션·생체인증·보안 저장소는 명시돼 있으나 Passkey는 직접 명시돼 있지 않다: https://career.rememberapp.co.kr/job/posting/330983

Q11 제안: Passkey는 읽기 전용 Admin의 운영자 로그인에 적용한다. 운영 데이터 접근 통제라는 목적에 연결하며 wallet 사용자의 서버 계정을 억지로 추가하지 않는다. wallet 로컬 잠금, 서버 인증, recovery phrase 복구를 분리한다. 일반적인 Passkey 로그인만으로 기존 EVM 계정의 키 복구나 거래 서명이 되는 것으로 설명하지 않는다. 적용 위치는 아직 사용자 승인 전이다.

STAR 초안은 설계 가설이다. S: 운영자만 장애·거래 상태를 확인할 필요. T: 허가된 운영자의 접근을 확인하고 세션을 통제. A: 초대·등록 정책, Passkey 인증, 서버 권한 확인, 세션 만료·폐기, 인증수단 분실 흐름 설계 및 구현. R: 로그인 성공률·완료 시간과 미인증/권한 없는 요청 차단 테스트를 측정. 개선·사고 감소 수치는 현재 없으며 결과를 지어내지 않는다. Passkey는 권한 검사나 계정 복구 정책을 대체하지 않는다.

기술 참고: https://developers.google.com/identity/passkeys , https://fidoalliance.org/passkeys/

### Passkey 설명 정정 및 재검토

사용자가 Admin 필요성을 질문했고, 이어 Passkey의 wallet 활용 자료를 제공했다. Admin 제외·Passkey 보류는 제안이며 아직 승인된 결정이 아니다. Q5의 Admin 범위는 재검토 중이다. Passkey를 서버 로그인 용도로만 판단한 초기 제안은 불충분했다.

자가수탁은 Passkey와 양립 가능하다. 적용 후보는 (1) Smart Account의 WebAuthn 서명 검증, (2) PRF 결과를 활용한 기존 seed/key 암호화, (3) 외부 wallet 서비스 접근 인증이다. 셋은 다른 신뢰·복구 모델이다. 현재 phrase 복구·기존 계정 호환 요구와 별도로 비교해야 한다. PRF 지원과 암호문 보존·복구는 플랫폼에서 검증해야 한다. EIP-7702 위임은 기존 EOA 키를 자동 폐기하지 않는다.

공식 확인: EIP-7951은 P-256 검증 precompile을 정의하며 Fusaka에 포함됐다. WebAuthn은 P-256 하나로 제한되는 규격이 아니고, PRF도 모든 환경에 보장되는 기능은 아니다. Passkey는 기기 고정형 또는 동기화형일 수 있다. RP ID 의존과 원시 private key 조회 제한을 모든 wallet의 자산 이전 불가로 확대하면 안 된다. 복구·signer 교체·서비스 종료 시 접근 경로를 구체적으로 설계해야 한다.

출처: https://www.w3.org/TR/webauthn-3/ , https://eips.ethereum.org/EIPS/eip-7951 , https://ethereum.org/roadmap/fusaka/ , https://eips.ethereum.org/EIPS/eip-7702 , https://docs.safe.global/advanced/passkeys/overview

최신 사용자 지시: 신규 지갑은 Passkey, 기존 지갑은 seed phrase 복구 방향으로 검토한다. Passkey 분실 복구 방법과 구현 복잡도를 먼저 비교한 뒤 다음 요구사항을 확정한다. GPT-6.1 Sol 에이전트 4개에 복구 모델, 모바일 구현, 계정 구조, 제품·STAR 검토를 나눠 맡겼다. 이 지시는 후보 방향 조사 승인이다. Smart Account 구현체·복구 정책·chain·EOA 전환은 아직 확정하지 않는다. 앞선 Q8의 신규 phrase 보관 결정은 이 검토에서 재평가한다. 기존 지갑 phrase 복구는 유지한다. Admin Passkey 제안과 관련 STAR 초안은 현행 권고로 사용하지 않는다.

완료 기준 → 첫 사용자와 핵심 행동 → 초기 기능·체인 범위 → 계정 및 백업·복구 모델 → 외부 서비스와 신뢰 경계 → 정상·실패·Unknown 흐름 → 화면 및 시스템 구조 → 검증 기준.

### 병렬 조사 취합

GPT-6.1 Sol 4개 에이전트의 공식 자료 조사를 [복구·구현 비교](vaultme-passkey-recovery-review.md)에 취합했다. Runtime·실기기·contract 배포는 실행하지 않았다. 신규 Safe Passkey Smart Account와 기존 phrase EOA의 분리 구조를 우선 검증 후보로 권고한다.

현행 Q11: 첫 Testnet은 동기화 재접속과 별도 Passkey signer 추가·재접속·교체까지 검증하도록 설계할지 확인한다. 추천안에서 추가 signer는 단독 실행 권한을 갖는 후보이며 복구 전용 지연 권한과 다르다. 같은 provider·RP ID의 공통 실패는 남는다. 모든 키 분실·domain 상실에 대응하는 Guardian·독립 recovery key는 후속 설계로 제안하며 아직 승인되지 않았다. 실제 자금 출시 준비 완료로 간주하지 않는다.

Manyfast의 다중 체인, 암호화 백업, 결제, 변환, 관리자 기능은 계획이다. 구현되었다고 간주하지 않는다. Foundation의 dApp connection / message signing / token approval은 분리된 행동이며, 향후 제품 범위에 포함할지는 확정이 필요하다. Review/Detail은 최신 Foundation 계약에 따라 전체 주소를 표시한다.
