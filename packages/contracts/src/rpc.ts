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

export const USDC_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
export const BALANCE_OF_SELECTOR = '0x70a08231'

// One JSON-RPC 2.0 request. A batch (array) fails this schema and gets 400.
export const RpcRequest = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number(), z.null()]),
    method: z.string().max(64),
    params: z.array(z.unknown()).optional(),
  })
  .meta({ id: 'RpcRequest' })
export type RpcRequest = z.infer<typeof RpcRequest>

// The upstream answer is passed through as is: either `result` or `error`.
export const RpcResponse = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number(), z.null()]),
    result: z.unknown().optional(),
    error: z.object({ code: z.number(), message: z.string(), data: z.unknown().optional() }).optional(),
  })
  .meta({ id: 'RpcResponse' })
export type RpcResponse = z.infer<typeof RpcResponse>
