# VaultMe Passkey 계정 구조 조사

확인일: 2026-10-11. 상태: 공식 문서 조사. 구현, 배포, 거래 실행, 보안 감사 증거는 없음.

## 권고

새 지갑은 **Safe + Passkey signer + Safe4337Module**로 작은 testnet prototype을 만든다. 기존 seed phrase는 **EOA 복원 경로**로 둔다. 두 경로는 같은 주소나 같은 복구 방식이라고 표시하지 않는다. UI에서는 한 번에 한 계정만 활성화한다. WalletConnect는 이번 범위에서 제외한다.

이는 연구 권고다. 최종 계정 구조나 production 준비 상태의 승인이 아니다. Safe를 쓴다는 사실만으로 조합 전체의 안전성을 보장할 수 없다. 정확한 contract/SDK 버전, verifier, module, EntryPoint 조합을 먼저 고정해야 한다.

## 세 가지 후보

| 항목 | Safe + ERC-4337 | 자체 smart account | EIP-7702 delegated EOA |
|---|---|---|---|
| 새 Passkey 지갑 | 공개 구현을 조합할 수 있음 | 검증·실행·복구 코드를 직접 책임짐 | 최초 delegation에는 secp256k1 EOA 키가 필요함 |
| 기존 주소 | Safe contract 주소를 새로 사용함. EOA 자산은 자동 이동하지 않음 | 일반적으로 새 contract 주소가 필요함 | 기존 EOA 주소를 유지함 |
| seed phrase | EOA owner/recovery signer를 따로 추가할 수 있음. seed만으로 Safe 구성 전체가 복원되지는 않음 | 설계한 owner 규칙에 따름 | 기존 EOA 키가 delegation 변경 권한을 유지함 |
| 전송 승인 | UserOperation 또는 Safe transaction 서명 | 자체 validation 규칙 | delegation 승인과 이후 실행 승인을 구분해야 함 |
| 운영 요소 | factory, singleton, signer/verifier, module, EntryPoint, bundler | 앞 요소와 자체 배포·감사·업그레이드 책임 | delegate 구현, 초기화, storage, 지원 chain, relayer/4337 조합 |
| 복구 | owner 교체 또는 사전 설치한 recovery module | 직접 구현 | EOA 키로 delegation 변경/해제 가능. 키가 노출되면 Passkey만 교체해도 해결되지 않음 |
| 이번 판단 | 제한된 spike의 우선 후보 | 초기 범위에 비해 부담이 큼 | 별도 후속 spike 후보 |

Safe의 Passkey signer는 WebAuthn/P-256 서명을 contract에서 검증한다. 지원 chain에서는 precompile을 사용할 수 있고 fallback verifier도 가능하다. 모든 EVM chain에 P-256 precompile이 있다고 가정하지 않는다. [Safe Passkeys](https://docs.safe.global/advanced/passkeys/passkeys-safe)

Safe4337Module은 module과 fallback handler 역할을 한다. validation과 execution을 EntryPoint 경로에 연결한다. 따라서 기본 Safe만 배포하면 ERC-4337 전송이 자동으로 생기는 것은 아니다. [Safe ERC-4337](https://docs.safe.global/advanced/erc-4337/4337-safe)

## 주소와 seed phrase 호환성

BIP-39는 mnemonic에서 seed를 만든다. BIP-44는 계층 경로를 정의한다. 원래 EOA 주소를 되찾으려면 mnemonic 외에 사용한 passphrase, derivation path, account/index 규칙도 맞아야 한다. 첫 prototype은 지원 경로 하나를 명시한다. 다른 지갑의 모든 계정 검색을 지원한다고 표시하지 않는다. [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki), [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

Passkey 공개키를 추가한 Safe 주소는 복원한 EOA 주소와 다르다. EOA를 Safe owner로 써도 EOA의 ETH/ERC-20 잔액이 Safe 잔액으로 합쳐지지 않는다. 이것은 계정 구조에서 도출한 설계 결과다. 계정 종류와 전체 주소를 Home·Receive·Review에서 확인할 수 있어야 한다. 기존 자산 이전은 별도의 on-chain 전송이다.

`single active account`는 UI 선택 규칙이다. Safe의 owner 수를 하나로 제한한다는 뜻은 아니다. 복구 owner는 활성 지갑 계정 목록과 별도로 관리한다.

## 서명과 전송

- EOA 경로: secp256k1 키가 raw Ethereum transaction에 서명한다. RPC로 전송하고 transaction hash와 receipt를 추적한다.
- Safe 경로: Passkey는 WebAuthn assertion을 만든다. adapter가 정확한 operation digest에 연결한다. bundler는 UserOperation을 포함한 거래를 EntryPoint에 보낸다. Passkey assertion 자체는 raw EOA transaction이 아니다.
- ERC-1271 message 서명 지원도 거래 전송과 별개다. WalletConnect 보류 중에는 외부 dApp 서명을 제품 기능으로 표시하지 않는다.

ERC-4337은 UserOperation, validation, prefund/paymaster, bundler의 제출 경로를 정의한다. `userOpHash`를 transaction hash로 표시하지 않는다. receipt가 없으면 결과를 unknown 또는 pending으로 유지한다. 재시도 전에 operation과 chain 상태를 확인한다. [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337)

WebAuthn의 challenge, RP ID, origin, user verification을 각각 확인해야 한다. 일반 로그인 성공을 금융 전송 승인으로 재사용하면 안 된다. 실제 adapter의 검증 범위는 고정한 source revision에서 확인해야 한다. 이 조사에서는 해당 코드 검사를 실행하지 않았다. [W3C WebAuthn](https://www.w3.org/TR/webauthn-3/), [Google authentication verification](https://developers.google.com/identity/passkeys/developer-guides/server-authentication)

## nonce, gas, 외부 서비스

EOA transaction nonce와 EntryPoint UserOperation nonce는 별도다. ERC-4337 nonce는 key와 sequence로 나뉜다. 같은 계정의 동시에 보낸 operation, 취소 후 재시도, 전송 결과 미확인을 기록해야 한다. 첫 spike은 순차 전송만 허용한다. [ERC-4337 nonce](https://eips.ethereum.org/EIPS/eip-4337#semi-abstracted-nonce-support)

Pimlico 공식 tutorial은 Sepolia bundler/paymaster 경로를 제공한다. 이는 현재 VaultMe API key, quota, sponsor 정책, balance, uptime을 입증하지 않는다. 시작할 때 실제 endpoint와 EntryPoint 버전을 확인한다. sponsorship은 유료 gas 비용의 부담 주체를 바꾼다. 비용이 사라지지는 않는다. [Pimlico tutorial](https://docs.pimlico.io/guides/tutorials/tutorial-1), [Pimlico getting started](https://docs.pimlico.io/guides/getting-started)

bundler는 제출을 거부하거나 지연할 수 있다. paymaster는 정책·잔액에 따라 후원을 거부할 수 있다. 정상 validation에서는 이 서비스가 owner 서명 없이 임의 전송할 권한을 얻는 것은 아니다. 그러나 사용 가능성과 RPC 개인정보는 외부 의존성이다. prototype에서 대체 bundler와 self-funded 경로를 실제로 시험하기 전에는 서비스 독립성을 주장하지 않는다.

배포 gas, verifier gas, 실행 gas, 실패 gas를 분리해 측정한다. ERC-20 하나를 지원해도 ERC-20 gas 결제가 자동 지원되는 것은 아니다. 첫 범위의 gas 자산은 선택한 chain의 native coin으로 고정한다.

## 복구와 서비스 종료

| 방식 | 장점 | 확인할 위험 |
|---|---|---|
| Passkey 두 개 | 기기 하나의 손실에 대응 가능 | 같은 sync provider·RP ID이면 공통 실패가 남음. signer 조합의 4337 지원 확인 필요 |
| 별도 EOA recovery owner | 기존 지갑 도구로 owner 교체·자산 이동 경로를 만들 수 있음 | threshold 1이면 이 키 하나로 전액 실행 가능. 독립 백업과 정확한 권한 표시 필요 |
| guardian + Delay module | 복구 제안과 대기·취소 절차를 둘 수 있음 | 사전 설치, guardian 신뢰, 대기 중 감시, module 권한이 추가됨 |
| 자체 recovery contract | 원하는 정책 구현 가능 | 감사와 상태 전이 검증 부담이 큼 |

Safe 문서는 Passkey와 다른 인증 수단의 조합을 권한다. Passkey metadata도 보존해야 한다. signer 회전이 가능한 구조가 필요하다. [Safe SDK signer](https://docs.safe.global/sdk/signers/passkeys), [Safe Passkey 4337 source](https://github.com/safe-fndn/safe-modules/blob/main/modules/passkey/contracts/4337/README.md)

RecoveryHub의 Delay 방식은 recoverer의 owner 변경 제안과 대기 중 취소를 지원한다. 이 제품의 설명이 VaultMe testnet 배포나 동일 module 버전의 검증을 대신하지 않는다. module은 Safe에서 실행 권한을 갖기 때문에 별도의 신뢰 경계다. [RecoveryHub](https://help.safe.global/articles/9622260218-account-recovery-with-saferecoveryhub), [Safe modules](https://docs.safe.global/advanced/smart-account-modules)

WebAuthn credential은 RP ID에 묶인다. domain을 잃은 뒤 다른 domain에서 같은 Passkey를 그대로 사용할 수 있다고 약속하지 않는다. Related Origin Requests도 원래 domain 구성과 client 지원에 의존하므로 종료 후 복구 보장으로 쓰지 않는다. 독립 EOA owner 또는 사전 설치한 recovery 경로가 필요하다는 것은 이 제약에서 도출한 권고다. [W3C WebAuthn](https://www.w3.org/TR/webauthn-3/)

독립 복구를 시험할 때는 VaultMe UI를 닫는다. chain ID, Safe 주소, owner 주소, singleton/module/verifier 주소·버전, credential ID·공개키, RP ID, 배포 receipt를 보관한다. 다른 클라이언트와 RPC에서 새 owner 등록과 자산 이동을 실행한다. 일반 Safe 도구의 Passkey 호환성은 자동으로 가정하지 않는다. 공개 metadata와 실제 private key/seed는 구분한다. 실제 seed를 문서·로그·Figma에 넣지 않는다.

## EIP-7702의 추가 경계

7702는 EOA 주소에 delegate code를 연결한다. authorization tuple에는 chain, delegate 주소, EOA nonce가 포함된다. 이 승인은 secp256k1 EOA 키가 한다. 이후 Passkey validation은 delegate 구현의 책임이다. 기존 seed 키를 무효화하는 표준이 아니다. [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)

delegation은 거래 하나가 끝나도 유지된다. zero address authorization으로 해제할 수 있다. 실행이 revert되어도 delegation 처리 자체는 되돌아가지 않을 수 있다. delegate의 replay 보호와 초기화도 별도로 필요하다. 이 때문에 전송 확인과 delegation 상태 확인을 분리해야 한다. [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)

Safe 공식 7702 문서는 기존 Singleton/Proxy를 그대로 delegate하는 초기화 위험을 설명한다. 문서에 제시된 수정 Proxy, 수정 Singleton, SafeLite는 실험적이며 미감사로 표시되어 있다. 따라서 기존 Safe 배포와 7702 Safe를 같은 성숙도의 대안으로 취급하지 않는다. [Safe EIP-7702](https://docs.safe.global/advanced/eip-7702/7702-safe)

## 제한된 spike와 완료 기준

1. 후보 chain은 Ethereum Sepolia 하나로 둔다. 실행 직전에 Safe·Passkey·EntryPoint contract 주소, deployed bytecode, SDK lockfile, bundler 지원을 확인한다. 체인 선택은 이 확인을 통과한 뒤 확정한다. [Safe supported networks](https://docs.safe.global/advanced/smart-account-supported-networks)
2. 새 Passkey Safe 한 개와 synthetic seed EOA 한 개를 만든다. 한 계정만 활성화한다. 두 주소와 잔액을 분리한다.
3. native coin 및 test ERC-20 하나에 대해 수신·잔액·전송을 실행한다. review에는 account, network, asset, full recipient, amount, estimated fee를 표시한다.
4. 승인 취소, 잘못된 nonce, gas 부족, paymaster 거절, bundler timeout, RPC 단절을 시험한다. 재시도로 이중 전송하지 않았는지 chain에서 확인한다.
5. P-256 precompile 사용 여부와 fallback 경로를 구분한다. 실제 사용 경로와 gas를 기록한다.
6. domain/UI를 사용할 수 없는 조건에서 독립 recovery owner로 signer 교체와 자산 이동을 시험한다. 실패하면 exitability 미검증으로 남긴다.
7. operation hash, transaction hash, receipt, contract·SDK revision, fee와 실패 상태를 verification 자료로 남긴다. secret은 제외한다.

통과 결과는 이 chain·이 버전·이 device/browser 조합의 prototype 증거다. mainnet, 전체 EVM 지원, manual AT, 보안 감사, 다른 지갑의 모든 seed 복원, 모든 Passkey provider 지원은 별도 범위다.
