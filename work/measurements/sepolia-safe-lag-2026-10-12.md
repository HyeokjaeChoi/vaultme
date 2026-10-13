# Sepolia `safe`·`finalized` 지연 실측

측정: 2026-10-12, publicnode 공개 RPC, 1분 간격 20회 (약 19분). 원본: [CSV](sepolia-safe-lag-2026-10-12.csv)

| tag | 최신 block 대비 지연 (최소 / 중앙값 / 최대) |
|---|---|
| `safe` | 408초 / 600초 / 768초 (34–64 block) |
| `finalized` | 792초 / 984초 / 1152초 (66–96 block) |

- `safe`는 32 block(1 epoch, 약 6.4분)마다 계단식으로 이동했다.
- 해석(추론): 거래가 block에 포함된 뒤 `safe`를 통과하기까지 약 7–13분이 걸린다. 입금 Push는 여기에 감지 지연(목표 p95 2분)이 더해진다.
- 한계: 공개 RPC 1곳, 약 19분 표본. 네트워크 상태에 따라 달라질 수 있다. staging에서 Infura로 다시 측정한다.
