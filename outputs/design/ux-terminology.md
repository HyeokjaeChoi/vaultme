# VaultMe 용어집 (UX terminology)

작성일: 2026-10-13 · 상태: 초안 · 범위: 한국어 용어 통일. 영어 용어는 권장안만 있고 적용하지 않았다.

방법: 자기 보관(self-custody) 지갑을 우선했다. MetaMask(확장·모바일), Rainbow를 봤다. 거래소(Upbit)는 custodial이라 참고만 했다. Upbit 공식 도움말 페이지는 찾지 못했다. Kaia Wallet 한국어 UI 문자열 파일도 찾지 못했다. Kaia 문서는 "컨트랙트" 표기를 쓴다 (docs.kaia.io/ko).

출처 약어:
- MM-ext = MetaMask/metamask-extension `app/_locales/ko/messages.json`
- MM-mob = MetaMask/metamask-mobile `locales/languages/ko.json`
- RB = rainbow-me/rainbow `src/languages/ko_KR.json`

## 용어집

| 개념 | VaultMe 용어 | 근거 (출처) | 비고 |
|---|---|---|---|
| 보내기 (동작) | 보내기 / 보냈어요 | MM-mob `drawer.send_button` "보내기", `send.title` "보내기"; RB `button.send` "보내기" | MM-ext `send` 는 "전송". 소스가 갈린다. 버튼·제목은 보내기로 통일. "전송"과 "송신"은 쓰지 않는다. |
| 받기 (동작) | 받기 | MM-ext `receive` "받기"; MM-mob `receive_request.title` "받기"; RB `button.receive` "받기" | 소스 모두 같다. |
| 받는 주소 (상대) | 받는 주소 | MM-mob `transaction.recipient_address` "받는 주소" | MM의 `to` 는 "수신:" 이다. 라벨로는 "받는 주소"가 더 쉽다. |
| 내 주소 | 받기 주소 (받기 화면), 계정 주소 (그 외) | MM-mob `receive_request.copy_address` "주소 복사"; `public_address` "공개 주소" | MM은 "공개 주소"를 쓴다. VaultMe는 기능 이름을 앞세운다. "공개 주소"는 쓰지 않는다. |
| 처리 중 | 처리 중 | MM-ext `pending` "보류 중"; MM-mob `transaction.pending` "대기 중", `unconfirmed` "보류 중" | 소스가 갈린다 (아래 "소스 불일치"). "보류"는 사용자가 멈춘 것처럼 읽혀서 뺀다. |
| 확정 | 확정 | MM-ext `confirmed` "컨펌"; MM-mob `transaction.confirmed` "확인" | "컨펌"은 외래어, "확인"은 "확인 버튼"과 겹친다. 확정으로 통일. |
| 실패 | 실패 | MM-ext `failed` "실패"; MM-mob `transaction.failed` "실패" | 소스 모두 같다. |
| 알 수 없음 | 확인 못 함 | MM-ext `unknown` "알 수 없음" | MM은 일반 단어다. VaultMe는 "조회하지 못함" 뜻이라 "확인 못 함"을 유지한다. |
| 거래 | 거래 | MM-ext `transaction` "트랜잭션" | MM은 "트랜잭션"을 쓴다. VaultMe는 이미 "거래"로 통일되어 있다. 기술 용어가 필요할 때만 "트랜잭션". |
| 네트워크 수수료 | 네트워크 수수료 | MM-ext `networkFee` "네트워크 수수료"; MM-mob `transaction.gas_fee` "네트워크 수수료"; RB `explain.gas.title` "네트워크 수수료" | "가스비"는 쓰지 않는다. 소스 대부분이 네트워크 수수료를 쓴다. |
| 복구 구문 | 복구 구문 | MM-ext `secretRecoveryPhrase` "비밀복구구문"; MM-mob `choose_password.seed_phrase` "비밀 복구 구문" | MM은 "비밀"을 붙이고 띄어쓰기도 다르다. VaultMe는 "복구 구문"으로 짧게 쓰고 띄어 쓴다. "시드", "니모닉"은 쓰지 않는다. |
| 비슷한 주소 | 비슷한 주소 | MM-mob `transaction.similar_to` "~와 유사합니다" | 화면은 "비슷한"을 이미 쓴다. 프레임 이름의 "유사"를 바꿨다. |
| 토큰 컨트랙트 주소 | 토큰 컨트랙트 주소 | MM-ext `tokenContractAddress` "토큰 계약 주소" | MM의 "계약"은 번역 흔적이다. Kaia 문서와 업계는 "컨트랙트"를 쓴다. 유지. |
| 테스트넷 | 테스트넷 | MM-ext `testnets` "테스트넷" | 화면에 "Testnet"이 남아 "테스트넷"으로 바꿨다. 영어 원문 유지 여부는 아래 권장안 참조. |
| 블록 탐색기 링크 | (영어 권장안 참조) | MM-ext `viewOnBlockExplorer` "블록 탐색기에서 보기" | 아래 Etherscan 참조. |

## 버튼 어미 규칙

1. 동작 버튼은 명사형이나 "-하기"로 쓴다. 예: 검토, 복구, 공유, 새 지갑 만들기, 알림 켜기.
2. 사용자가 읽고 동의했다고 답하는 버튼만 "-했어요"를 쓴다. 예: 이해했어요, 다 적었어요, 확인했어요, 보내기.
3. 위험 확인 시트의 안전한 선택은 "취소"로 둔다.
4. 화면 제목은 명사형이나 "-하세요"를 쓴다. 버튼에는 "-하세요"를 쓰지 않는다.
5. 마침표를 붙이지 않는다.

이 규칙으로 현재 버튼 문구는 바꿀 것이 없다. S91 제목 "앱을 업데이트하세요"는 제목이라 허용된다.

## 상태 단어

[ux-flow.md](ux-flow.md) §5 S23 표와 같은 뜻이다.

| 상태 | 짧은 라벨 | 뜻 (S23 표 기준) |
|---|---|---|
| Pending | 처리 중 | 보냈고, 네트워크가 아직 처리하지 않았다. |
| Included | 블록에 포함됨 | 블록에 들어갔다. 확정을 기다린다. |
| Confirmed | 확정 | 확정됐다. 끝났다. |
| Failed | 실패 | 실행에 실패했다. 수수료는 쓰였을 수 있다. |
| Unknown | 확인 못 함 | 결과를 조회하지 못했다. 다시 보내지 말고 상태를 확인한다. |
| Replaced | 실행되지 않음 | 다른 거래가 먼저 처리되어 이 거래는 실행되지 않았다. |

문장형 문구 (S23 표):
- 보냈어요. 네트워크 처리를 기다리는 중이에요.
- 보낸 결과를 확인하지 못했어요. 다시 보내지 말고 상태를 확인해 주세요.
- 블록에 포함됐어요. 확정을 기다리는 중이에요.
- 확정됐어요.
- 실행에 실패했어요. 수수료는 사용됐을 수 있어요.
- 다른 거래가 먼저 처리되어 이 거래는 실행되지 않았어요.

규칙: 짧은 라벨은 목록·배지에, 문장은 상세 화면에 쓴다. "전송"은 쓰지 않는다. ux-flow.md §5 표의 "전송했어요"와 "송신"은 위 문장으로 바꿔야 한다. 이 파일에서는 수정하지 않았다.

## 영어 용어 권장안

권장안만 있다. Figma와 ux-copy.md에는 적용하지 않았다.

권장안 승인·적용 2026-10-13

| 용어 | 권장 | 이유 · 출처 |
|---|---|---|
| Testnet | 번역: "테스트넷" (이미 한글 표기 사용 중, 적용 완료) | MM-ext `testnets` "테스트넷". 한글 표기가 업계 표준이다. 단 MM-ext `showTestnetNetworks` 는 "테스트 네트워크 표시"다. 이 표현은 길어서 채택하지 않았다. |
| passphrase | 병기: "패스프레이즈(passphrase)" 첫 등장 한 번, 이후 "패스프레이즈" | MM-ext/mob 모두 "패스프레이즈"를 한글로 쓴다 (`hardwareWalletErrorUnknownErrorDescription` "비밀복구구문 또는 패스프레이즈"). 사용자가 다른 지갑 앱에서 이 단어를 볼 때 영어와 연결해야 한다. |
| burn | 번역: "소각 주소" (현재 "소각(burn) 주소" 에서 괄호 제거) | MM-mob `alert_system.burn_address.title` "소각 주소로 자산 전송". 괄호 영어가 필요 없을 만큼 쓰인다. |
| Etherscan | 유지 (영어) | MM-ext `viewOnEtherscan` "Etherscan에서 $1 보기", RB `view_on_etherscan` "Etherscan에서 보기". MM-mob은 "이더스캔에서 보기"로 갈린다. 서비스 이름이라 로고·URL과 맞추려면 영어가 안전하다. |
| chain | 번역: "체인 ID 11155111" (현재 "chain 11155111") | MM-ext `chainId` "체인 ID". "Ethereum 메인넷(chain 1)"은 "이더리움 메인넷(체인 ID 1)"으로 쓸 수 있다. |
| Sepolia | 유지 (영어) | 고유 네트워크 이름이다. MM-ext 도 네트워크 이름은 영어 그대로 둔다. |
| ETH / USDC | 유지 (영어) | 자산 티커다. RB·MM 모두 티커는 영어로 쓴다. |
| Face ID | 유지 (영어) | Apple 제품 이름이다. 번역하면 OS 화면과 달라진다. |

## 소스 불일치

- 보내기: MM-ext "전송" 대 MM-mob/RB "보내기". 버튼은 보내기로 정했다.
- 처리 중: MM-ext "보류 중", MM-mob "대기 중"·"보류 중". 같은 앱 안에서도 두 단어를 쓴다. VaultMe는 "처리 중"으로 정했다 (둘 중 하나가 아닌 제3안이다).
- 확정: MM-ext "컨펌", MM-mob "확인". VaultMe는 "확정".
- 복구 구문: MM-ext "비밀복구구문" 대 MM-mob "비밀 복구 구문" (띄어쓰기). Rainbow는 "비밀 구문".
- Etherscan: MM-ext/RB 영어, MM-mob 한글 "이더스캔".
- MM-ext 한국어 문자열에는 기계 번역 흔적이 있다 ("계약", "컨펌" 등). 근거로 쓸 때 가중치를 낮췄다.
- Upbit/Bithumb "입금/출금": 거래소는 custodial이라 근거에서 뺐다. 공식 도움말을 직접 확인하지 못했다.

## Figma 반영 결과 (11 Prototype)

- "Testnet 자산은 …" → "테스트넷 자산은 …" (텍스트 5개: S10N, S10R, S10P, S10P+S24, S10R Dark)
- "전송했어요." → "보냈어요." (텍스트 4개: S23, S23+S50, S23E, S41)
- 프레임 이름: "첫 송신" → "첫 보내기" (S23+S50), "유사 주소" → "비슷한 주소" (S22L, S22L+ACK, S22L+ACK Dark). "KEY · " 접두어는 그대로다.
- 범위 밖: 컴포넌트 마스터, `10 Wireframes`, `12 Text 200%`. 와이어프레임·200% 복제본에는 옛 문구가 남아 있을 수 있다.
