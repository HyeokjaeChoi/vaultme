# VaultMe

VaultMe is a self-custody wallet for the Ethereum Sepolia testnet. It holds test funds only. This glossary fixes the Korean product terms. Use the bold term in the UI and in code discussion.

## Language

### Moving funds

**보내기** (send):
The action of moving an asset from the user's account to another address. A button or title uses this word.
_Avoid_: 전송, 송신

**받기** (receive):
The action and the screen where the user shows their address to get an asset.

**받는 주소** (recipient address):
The address that receives a send. The user sees the full address before they confirm.

**받기 주소** (receive address):
The user's own address, as shown on the receive screen. Elsewhere in the app, the same address is called **계정 주소**.
_Avoid_: 공개 주소

**계정 주소** (account address):
The address of one user account, outside the receive screen.
_Avoid_: 공개 주소

**거래** (transaction):
One signed action sent to the network. Use the technical word only when a precise term is needed.
_Avoid_: 트랜잭션 (except as a technical term)

**내부 이동** (internal transfer):
ETH that a contract moves while a transaction runs, apart from the transaction's own amount. One transaction can have none, one or many. The transaction detail shows the first 10 internal transfers of the transaction, then one row "외 N건 · Etherscan에서 보기" to Etherscan's internal transactions tab for the rest (#255), the same for every viewer.
_Avoid_: 내부 거래, 내부 트랜잭션

**네트워크 수수료** (network fee):
The cost the user pays in ETH to have the network process a transaction. The app shows an estimate before sending and the final amount after.
_Avoid_: 가스비, 가스

### Transaction status

**처리 중** (pending):
The user sent the transaction. The network has not processed it yet.
_Avoid_: 보류, 대기 중

**블록에 포함됨** (included):
The transaction is in a block. The network has not confirmed it yet.

**확정** (confirmed):
The network confirmed the transaction. It is final.
_Avoid_: 컨펌, 확인

**실패** (failed):
The transaction ran and did not succeed. The network fee may have been spent.

**확인 못 함** (unknown):
The app could not look up the result. The user must check the original transaction and must not send again first.
_Avoid_: 알 수 없음

**실행되지 않음** (replaced):
Another transaction with the same nonce was processed first, so this one did not run. That other transaction may still have moved the funds. The user checks the account activity before sending again.

### Keys and recovery

**복구 구문** (recovery phrase):
The ordered words that restore the wallet. VaultMe never stores it and cannot restore it for the user.
_Avoid_: 시드, 시드 구문, 니모닉, 비밀복구구문, 비밀 복구 구문

**패스프레이즈** (passphrase):
An optional extra secret that changes which addresses a recovery phrase gives. Write "패스프레이즈(passphrase)" at the first use on a screen, then "패스프레이즈".

### Network and address warnings

**테스트넷** (testnet):
A test network where assets have no real value. VaultMe works with Sepolia only.
_Avoid_: Testnet (in Korean copy)

**체인 ID** (chain ID):
The number that identifies a network. Sepolia is 11155111.
_Avoid_: chain

**비슷한 주소** (similar address):
An address that looks like one the user used before, but differs. The app warns because this pattern is used in scams.
_Avoid_: 유사 주소

**소각 주소** (burn address):
An address where assets can never be recovered. The app warns before a send to it.
_Avoid_: 소각(burn) 주소

**토큰 컨트랙트 주소** (token contract address):
The address of the token's own contract, not of a person. Sending tokens to it can lose them.
_Avoid_: 토큰 계약 주소

## Terms kept in English

**Etherscan**, **Sepolia**, **ETH**, **USDC** and **Face ID** are names. Do not translate them.

## Flagged ambiguities

- "Sent" has two meanings. **보냈어요** means a confirmed result. A pending or included transaction says **보내는 중이에요**.
- **확인** is a button word ("confirm"). It is not the name of the **확정** status.
