import { createUpdateGate } from '@vaultme/api-client'
import { useSyncExternalStore } from 'react'

const gate = createUpdateGate()
export const markUpdateRequired = gate.mark

/** S91 gate: true once any API call got 426. */
export const useUpdateRequired = (): boolean => useSyncExternalStore(gate.subscribe, gate.get)
