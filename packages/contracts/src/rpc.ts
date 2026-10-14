import { z } from 'zod'

// Allowed JSON-RPC methods for POST /v1/rpc (LLD §4). eth_call is further limited to USDC balanceOf by the handler.
export const RPC_ALLOWED_METHODS = [
  'eth_chainId',
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getTransactionCount',
  'eth_estimateGas',
  'eth_maxPriorityFeePerGas',
  'eth_feeHistory',
  'eth_getBlockByNumber',
  'eth_call',
  'eth_sendRawTransaction',
  'eth_getTransactionReceipt',
] as const
export const RpcMethod = z.enum(RPC_ALLOWED_METHODS)
export type RpcMethod = z.infer<typeof RpcMethod>
