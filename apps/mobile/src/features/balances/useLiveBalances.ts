import { formatAmount, type AssetId } from '@vaultme/wallet-core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { balancesKey, balancesQuery, chain, fromRaw, type BalancesRaw } from '@/shared/chain'
import { getAccountAddress } from '@/shared/storage'

function readAddress(): `0x${string}` | null {
  try {
    return getAccountAddress() as `0x${string}` | null
  } catch {
    return null // kv unreadable: show no balance
  }
}

// Module-level so `select` keeps one identity (no re-run on every render).
function toDisplay(raw: BalancesRaw): Record<AssetId, string> | null {
  const b = fromRaw(raw)
  return b && { ETH: formatAmount(b.ETH, 'ETH', 'floor'), USDC: formatAmount(b.USDC, 'USDC', 'floor') }
}

/**
 * Real balances of the stored account as display strings (rounded down, never more than owned), read with TanStack Query (ADR-0021):
 * the last value stays on screen while a read runs or fails, and is restored from MMKV after a restart. Re-read when the screen regains focus
 * (the first focus is covered by the mount read) and when the app returns to the foreground (`focusManager`, shell).
 * `balances` null = fake mode, no wallet, nothing read yet. `refresh` (pull-to-refresh) re-reads now and resolves when the answer is in.
 */
export function useLiveBalancesState(): { balances: Record<AssetId, string> | null; refresh: () => Promise<void> } {
  const qc = useQueryClient()
  const [address, setAddress] = useState(readAddress)
  const first = useRef(true)
  const reread = useCallback(
    (a: `0x${string}` | null) =>
      chain.broadcasts && a ? qc.refetchQueries({ queryKey: balancesKey(a) }) : Promise.resolve(),
    [qc],
  )
  const { data } = useQuery({
    ...balancesQuery(address ?? '0x'),
    enabled: chain.broadcasts && address !== null,
    select: toDisplay,
  })
  useFocusEffect(
    useCallback(() => {
      const a = readAddress()
      setAddress(a) // a wallet removed or restored meanwhile
      if (first.current) first.current = false
      else void reread(a)
    }, [reread]),
  )
  const refresh = useCallback(async () => {
    const a = readAddress()
    setAddress(a)
    await reread(a)
  }, [reread])
  return { balances: chain.broadcasts && address !== null ? (data ?? null) : null, refresh }
}

export const useLiveBalances = () => useLiveBalancesState().balances
